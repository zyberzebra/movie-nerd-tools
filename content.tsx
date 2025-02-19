import { type PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://letterboxd.com/film/*"]
}

function calculateNextAnniversary(releaseDate: Date): Date {
  console.log('Calculating next anniversary for:', releaseDate)
  const today = new Date()
  const nextAnniversary = new Date(releaseDate)
  
  nextAnniversary.setFullYear(today.getFullYear())
  
  if (nextAnniversary < today) {
    nextAnniversary.setFullYear(today.getFullYear() + 1)
  }
  
  console.log('Next anniversary calculated:', nextAnniversary)
  return nextAnniversary
}

function calculateNextMilestoneAnniversary(releaseDate: Date): { date: Date; years: number } {
  console.log('Calculating next milestone anniversary for:', releaseDate)
  const today = new Date()
  const yearsSinceRelease = today.getFullYear() - releaseDate.getFullYear()
  const nextMilestoneYears = Math.ceil(yearsSinceRelease / 5) * 5
  
  const nextMilestone = new Date(releaseDate)
  nextMilestone.setFullYear(releaseDate.getFullYear() + nextMilestoneYears)
  
  if (nextMilestone < today) {
    nextMilestone.setFullYear(releaseDate.getFullYear() + nextMilestoneYears + 5)
    return { date: nextMilestone, years: nextMilestoneYears + 5 }
  }
  
  return { date: nextMilestone, years: nextMilestoneYears }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

let isInitialized = false

function init() {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('Already initialized, skipping...')
    return
  }

  console.log('Initializing Letterboxd anniversary extension')
  
  // Use a more robust way to wait for the film header
  const maxAttempts = 20 // Increased max attempts
  let attempts = 0

  function tryInit() {
    console.log('Attempting to find film header...')
    // Try multiple possible selectors for better reliability
    const headerLockup = document.querySelector('.film-header, .film-header-lockup, div[class*="film-header"]')
    if (!headerLockup) {
      attempts++
      if (attempts < maxAttempts) {
        console.log(`Film header not found, attempt ${attempts}/${maxAttempts}. Will retry in 500ms...`)
        setTimeout(tryInit, 1000) // Increased wait time to 1 second
        return
      } else {
        console.log('Failed to find film header after maximum attempts')
        return
      }
    }

    console.log('Film header found, looking for release date...')
    // Check if anniversary element already exists
    if (document.querySelector('.next-anniversary')) {
      console.log('Anniversary element already exists, skipping...')
      return
    }

    // Find the first release date in the release table and the ratings section
    const releaseDateElement = document.querySelector('.release-table .date')
    const ratingsSection = document.querySelector('.ratings-histogram-chart')
    
    if (!releaseDateElement || !ratingsSection) {
      console.log('Required elements not found. Available elements:', headerLockup.innerHTML)
      return
    }
    
    const releaseText = releaseDateElement.textContent?.trim()
    if (!releaseText) {
      console.log('Release date text is empty')
      return
    }
    console.log('Found release date text:', releaseText)
    
    const releaseDate = new Date(releaseText)
    if (isNaN(releaseDate.getTime())) {
      console.log('Invalid release date format')
      return
    }
    console.log('Parsed release date:', releaseDate)
    
    const nextAnniversary = calculateNextAnniversary(releaseDate)
    
    const anniversaryElement = document.createElement('div')
    anniversaryElement.className = 'next-anniversary'
    anniversaryElement.style.cssText = `
      margin-top: 16px;
      font-size: 13px;
      color: #89a;
      text-align: center;
      padding: 8px 0;
      border-top: 1px solid rgba(136, 153, 170, 0.1);
    `
    const nextMilestone = calculateNextMilestoneAnniversary(releaseDate)
    
    // Helper function to get ordinal suffix
    const getOrdinalSuffix = (n: number): string => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };

    function generateICalendarFile(movieTitle: string, anniversaryDate: Date, letterboxdUrl: string): string {
      const now = new Date()
      const formatICalDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Movie Anniversary//EN',
        'BEGIN:VEVENT',
        `DTSTAMP:${formatICalDate(now)}`,
        `DTSTART;VALUE=DATE:${anniversaryDate.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:${movieTitle} Anniversary`,
        `DESCRIPTION:Anniversary of ${movieTitle}\nView on Letterboxd: ${letterboxdUrl}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n')
    }
    
    function downloadICalendarFile(content: string, filename: string) {
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;method=REQUEST' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.type = 'text/calendar'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    }
    
    const yearsSinceRelease = nextAnniversary.getFullYear() - releaseDate.getFullYear()
    anniversaryElement.innerHTML = `
      <div class="anniversary-text">${yearsSinceRelease}${getOrdinalSuffix(yearsSinceRelease)} anniversary on ${formatDate(nextAnniversary)}
        <div class="milestone-tooltip">${nextMilestone.years}${getOrdinalSuffix(nextMilestone.years)} anniversary on ${formatDate(nextMilestone.date)}</div>
      </div>
      <button class="calendar-export-btn" aria-label="Export to calendar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>
    `
    anniversaryElement.style.cssText += `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `
    const style = document.createElement('style')
    style.textContent = `
      .next-anniversary .anniversary-text {
        cursor: help;
        display: inline-block;
      }
      .next-anniversary .milestone-tooltip {
        visibility: hidden;
        background-color: rgba(0, 0, 0, 0.9);
        color: #fff;
        text-align: center;
        padding: 8px;
        border-radius: 4px;
        position: absolute;
        z-index: 1;
        width: max-content;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        font-style: italic;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .next-anniversary .anniversary-text:hover .milestone-tooltip {
        visibility: visible;
        opacity: 1;
      }
      .calendar-export-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #89a;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }
      .calendar-export-btn:hover {
        color: #fff;
      }
    `
    document.head.appendChild(style)
    console.log('Adding anniversary element to page')
    
    // Add click handler for calendar export
    const exportBtn = anniversaryElement.querySelector('.calendar-export-btn')
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const movieTitle = document.querySelector('h1')?.textContent || 'Movie'
        const letterboxdUrl = window.location.href
        const iCalContent = generateICalendarFile(movieTitle, nextAnniversary, letterboxdUrl)
        downloadICalendarFile(iCalContent, `${movieTitle.replace(/[^a-z0-9]/gi, '_')}_anniversary.ics`)
      })
    }

    ratingsSection.parentElement?.appendChild(anniversaryElement)
    isInitialized = true
  }

  // Start the initialization process
  tryInit()
}

// Debounce function to prevent multiple rapid calls
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Reset initialization state when navigating to a new page
const resetInit = debounce(() => {
  if (!document.querySelector('.next-anniversary')) {
    isInitialized = false
    init()
  }
}, 500)

// Wait for the page to load completely
document.addEventListener('DOMContentLoaded', resetInit)

// Also run on dynamic page updates (for SPA navigation)
const observer = new MutationObserver((mutations) => {
  // Only trigger if the film header or release table changes
  const relevantChange = mutations.some(mutation => {
    const target = mutation.target as Element
    return target.matches('.film-header, .release-table') ||
           target.querySelector('.film-header, .release-table') !== null
  })
  if (relevantChange) {
    resetInit()
  }
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
})