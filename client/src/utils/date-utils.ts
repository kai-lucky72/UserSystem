/**
 * Formats a date into a human-readable string (e.g., "Monday, January 1, 2023")
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats a time into a 12-hour format with AM/PM (e.g., "8:30 AM")
 * @param date The date containing the time to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Checks if the current time is within the valid attendance marking window (6:00 AM to 9:00 AM)
 * @param date The date to check
 * @returns boolean indicating if attendance can be marked
 */
export function isAttendanceTimeValid(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 6 && hours < 9;
}

/**
 * Formats a date object to a yyyy-mm-dd format for use in date inputs
 * @param date The date to format
 * @returns Formatted date string in yyyy-mm-dd format
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the difference between two dates in days
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days between the dates
 */
export function daysBetweenDates(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  return diffDays;
}

/**
 * Returns a string indicating how long ago a date was (e.g., "2 days ago")
 * @param date The date to check
 * @returns A human-readable string indicating relative time
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000; // seconds in a year
  
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  
  interval = seconds / 2592000; // seconds in a month
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  
  interval = seconds / 86400; // seconds in a day
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  
  interval = seconds / 3600; // seconds in an hour
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  
  interval = seconds / 60; // seconds in a minute
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  
  return Math.floor(seconds) + " seconds ago";
}
