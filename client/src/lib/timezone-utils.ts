/**
 * Timezone utility functions for Indian Standard Time (IST)
 * IST is UTC+5:30
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert a UTC date to IST date string (YYYY-MM-DD)
 */
export function utcToISTDateString(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleDateString('en-CA', { 
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Convert a UTC date to IST time string (HH:MM)
 */
export function utcToISTTimeString(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleTimeString('en-GB', { 
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Convert a UTC date to IST date-time display string
 */
export function utcToISTDisplay(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleString('en-IN', { 
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Convert IST date and time to UTC ISO string
 * @param istDate Date string in YYYY-MM-DD format
 * @param istTime Time string in HH:MM format (24-hour)
 */
export function istToUTC(istDate: string, istTime: string): string {
  const [year, month, day] = istDate.split('-').map(Number);
  const [hour, minute] = istTime.split(':').map(Number);
  
  // Create a date object representing the IST time
  // We treat the input as if it were UTC, then subtract the IST offset
  // IST is UTC+5:30, so to convert IST to UTC: UTC = IST - 5:30
  const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Subtract IST offset to get actual UTC (5 hours 30 minutes = 330 minutes)
  // Example: 20:45 IST - 5:30 = 15:15 UTC
  const utcDate = new Date(tempDate.getTime() - (330 * 60 * 1000));
  
  return utcDate.toISOString();
}

/**
 * Get current date in IST (YYYY-MM-DD)
 */
export function getCurrentISTDate(): string {
  return utcToISTDateString(new Date());
}

/**
 * Get current time in IST (HH:MM)
 */
export function getCurrentISTTime(): string {
  return utcToISTTimeString(new Date());
}

/**
 * Format time slot for display in 12-hour format
 */
export function formatTimeSlot(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if an IST date-time is in the past
 */
export function isISTDateTimePast(istDate: string, istTime: string): boolean {
  const targetUTC = istToUTC(istDate, istTime);
  return new Date(targetUTC) < new Date();
}

/**
 * Get date range for next N days in IST
 */
export function getNextNDaysIST(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(utcToISTDateString(date));
  }
  
  return dates;
}

/**
 * Format date for display in IST
 */
export function formatISTDate(dateString: string): {
  short: string;
  long: string;
  dayOfWeek: string;
} {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return {
    short: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    long: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' })
  };
}
