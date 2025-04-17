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
 * Converts a time string (HH:MM) to minutes since midnight
 * @param time Time string in HH:MM format
 * @returns Number of minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if the current time is within the valid attendance marking window based on the timeframe
 * @param date The date to check
 * @param startTime The start time string in HH:MM format (e.g., "06:00")
 * @param endTime The end time string in HH:MM format (e.g., "09:00") 
 * @returns boolean indicating if attendance can be marked
 */
export function isAttendanceTimeValid(date: Date, startTime?: string, endTime?: string): boolean {
  // Default values if not provided
  const start = startTime || "06:00";
  const end = endTime || "09:00";
  
  // Convert current time to minutes since midnight
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  // Convert time frame to minutes
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  
  // Check if current time is within range
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
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
