/**
 * Recurrence Pattern Service
 * Handles parsing recurrence patterns and generating dates
 */

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months/years
  daysOfWeek?: number[]; // For weekly: [1,3,5] = Mon, Wed, Fri (0=Sunday, 6=Saturday)
  daysOfMonth?: number[]; // For monthly: [1,2,4,6] = 1st, 2nd, 4th, 6th of each month (1-31)
  endDate?: string; // ISO date string
  occurrenceCount?: number; // Max number of occurrences
}

export interface ParsedPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  endDate?: Date | null;
  occurrenceCount?: number | null;
}

export class RecurrencePatternService {
  /**
   * Parse recurrence pattern from JSON
   */
  parseRecurrencePattern(pattern: RecurrencePattern): ParsedPattern {
    // Handle backward compatibility: convert old dayOfMonth (single number) to daysOfMonth (array)
    let daysOfMonth = pattern.daysOfMonth;
    if (!daysOfMonth && (pattern as any).dayOfMonth) {
      daysOfMonth = [(pattern as any).dayOfMonth];
    }

    return {
      type: pattern.type,
      interval: pattern.interval || 1,
      daysOfWeek: pattern.daysOfWeek,
      daysOfMonth: daysOfMonth,
      endDate: pattern.endDate ? new Date(pattern.endDate) : null,
      occurrenceCount: pattern.occurrenceCount || null
    };
  }

  /**
   * Generate dates based on recurrence pattern
   */
  generateDates(
    pattern: RecurrencePattern,
    startDate: Date,
    endDate?: Date
  ): Date[] {
    const parsed = this.parseRecurrencePattern(pattern);
    const dates: Date[] = [];
    const maxDate = endDate || parsed.endDate || new Date('2099-12-31');
    const maxOccurrences = parsed.occurrenceCount || Infinity;

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    while (currentDate <= maxDate && occurrenceCount < maxOccurrences) {
      dates.push(new Date(currentDate));
      occurrenceCount++;

      // Calculate next date based on pattern
      currentDate = this.getNextDate(currentDate, parsed);
    }

    return dates;
  }

  /**
   * Generate dates for a specific month
   */
  generateDatesForMonth(
    pattern: RecurrencePattern,
    month: number, // 1-12
    year: number
  ): Date[] {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Find the first occurrence date (could be before this month)
    const firstDate = this.findFirstOccurrence(pattern, startOfMonth);
    
    // Generate all dates from first occurrence to end of month
    const allDates = this.generateDates(pattern, firstDate, endOfMonth);

    // Filter to only dates in the requested month
    return allDates.filter(date => {
      const dateMonth = date.getMonth() + 1;
      const dateYear = date.getFullYear();
      return dateMonth === month && dateYear === year;
    });
  }

  /**
   * Find first occurrence date (could be before startDate)
   */
  private findFirstOccurrence(pattern: RecurrencePattern, startDate: Date): Date {
    const parsed = this.parseRecurrencePattern(pattern);
    const startTime = startDate.getTime();
    const startDayOfWeek = startDate.getDay();
    const startDayOfMonth = startDate.getDate();

    // For weekly patterns with specific days, find the first matching day
    if (parsed.type === 'weekly' && parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
      // Find the first matching day of week on or before startDate
      let current = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        if (parsed.daysOfWeek.includes(current.getDay())) {
          return current;
        }
        current.setDate(current.getDate() - 1);
      }
    }

    // For monthly patterns with specific days of month
    if (parsed.type === 'monthly' && parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
      // Find the first matching day of month on or after startDate
      const startDay = startDate.getDate();
      const matchingDays = parsed.daysOfMonth.filter(d => d >= startDay).sort((a, b) => a - b);
      
      if (matchingDays.length > 0) {
        // Use first matching day in current month
        const firstOccurrence = new Date(startDate);
        firstOccurrence.setDate(matchingDays[0]);
        return firstOccurrence;
      } else {
        // No matching day in current month, use first day of next month
        const firstOccurrence = new Date(startDate);
        firstOccurrence.setMonth(firstOccurrence.getMonth() + parsed.interval);
        firstOccurrence.setDate(Math.min(parsed.daysOfMonth[0], new Date(firstOccurrence.getFullYear(), firstOccurrence.getMonth() + 1, 0).getDate()));
        return firstOccurrence;
      }
    }

    // For daily, yearly, or weekly without specific days
    return new Date(startDate);
  }

  /**
   * Get next date based on pattern
   */
  private getNextDate(currentDate: Date, parsed: ParsedPattern): Date {
    const nextDate = new Date(currentDate);

    switch (parsed.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + parsed.interval);
        break;

      case 'weekly':
        if (parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
          // Find next matching day of week
          let daysToAdd = 1;
          let found = false;
          while (!found && daysToAdd <= 7 * parsed.interval) {
            const testDate = new Date(currentDate);
            testDate.setDate(testDate.getDate() + daysToAdd);
            if (parsed.daysOfWeek.includes(testDate.getDay())) {
              nextDate.setTime(testDate.getTime());
              found = true;
            } else {
              daysToAdd++;
            }
          }
          if (!found) {
            // Fallback: add interval weeks
            nextDate.setDate(nextDate.getDate() + 7 * parsed.interval);
          }
        } else {
          nextDate.setDate(nextDate.getDate() + 7 * parsed.interval);
        }
        break;

      case 'monthly':
        if (parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
          const currentDay = currentDate.getDate();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          
          // Find next matching day in current month
          const matchingDays = parsed.daysOfMonth.filter(d => d > currentDay).sort((a, b) => a - b);
          
          if (matchingDays.length > 0) {
            // Use next matching day in current month
            nextDate.setDate(matchingDays[0]);
          } else {
            // Move to next month and use first matching day
            nextDate.setMonth(currentMonth + parsed.interval);
            const lastDayOfMonth = new Date(
              nextDate.getFullYear(),
              nextDate.getMonth() + 1,
              0
            ).getDate();
            const firstMatchingDay = Math.min(parsed.daysOfMonth[0], lastDayOfMonth);
            nextDate.setDate(firstMatchingDay);
          }
        } else {
          // Same day of month, next interval months
          nextDate.setMonth(nextDate.getMonth() + parsed.interval);
        }
        break;

      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + parsed.interval);
        break;
    }

    return nextDate;
  }

  /**
   * Convert recurrence pattern to Google Calendar RRULE format
   */
  convertToGoogleRRULE(pattern: RecurrencePattern, startDate: Date): string {
    const parsed = this.parseRecurrencePattern(pattern);
    const parts: string[] = [];

    // Frequency
    switch (parsed.type) {
      case 'daily':
        parts.push('FREQ=DAILY');
        break;
      case 'weekly':
        parts.push('FREQ=WEEKLY');
        break;
      case 'monthly':
        parts.push('FREQ=MONTHLY');
        break;
      case 'yearly':
        parts.push('FREQ=YEARLY');
        break;
    }

    // Interval
    if (parsed.interval > 1) {
      parts.push(`INTERVAL=${parsed.interval}`);
    }

    // Days of week (for weekly)
    if (parsed.type === 'weekly' && parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
      const dayMap: { [key: number]: string } = {
        0: 'SU',
        1: 'MO',
        2: 'TU',
        3: 'WE',
        4: 'TH',
        5: 'FR',
        6: 'SA'
      };
      const days = parsed.daysOfWeek.map(d => dayMap[d]).join(',');
      parts.push(`BYDAY=${days}`);
    }

    // Days of month (for monthly)
    if (parsed.type === 'monthly' && parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
      const days = parsed.daysOfMonth.sort((a, b) => a - b).join(',');
      parts.push(`BYMONTHDAY=${days}`);
    }

    // End date or occurrence count
    if (parsed.endDate) {
      // Format: YYYYMMDDTHHMMSSZ
      const endDateStr = parsed.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      parts.push(`UNTIL=${endDateStr}`);
    } else if (parsed.occurrenceCount) {
      parts.push(`COUNT=${parsed.occurrenceCount}`);
    }

    return `RRULE:${parts.join(';')}`;
  }

  /**
   * Validate recurrence pattern
   */
  validatePattern(pattern: RecurrencePattern): { valid: boolean; error?: string } {
    if (!pattern.type) {
      return { valid: false, error: 'Recurrence type is required' };
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(pattern.type)) {
      return { valid: false, error: 'Invalid recurrence type' };
    }

    if (pattern.interval && pattern.interval < 1) {
      return { valid: false, error: 'Interval must be at least 1' };
    }

    if (pattern.type === 'weekly' && pattern.daysOfWeek) {
      if (pattern.daysOfWeek.length === 0) {
        return { valid: false, error: 'At least one day of week is required for weekly pattern' };
      }
      if (pattern.daysOfWeek.some(d => d < 0 || d > 6)) {
        return { valid: false, error: 'Invalid day of week (must be 0-6)' };
      }
    }

    if (pattern.type === 'monthly' && pattern.daysOfMonth) {
      if (pattern.daysOfMonth.length === 0) {
        return { valid: false, error: 'At least one day of month is required for monthly pattern' };
      }
      if (pattern.daysOfMonth.some(d => d < 1 || d > 31)) {
        return { valid: false, error: 'Days of month must be between 1 and 31' };
      }
    }

    if (pattern.endDate && pattern.occurrenceCount) {
      return { valid: false, error: 'Cannot specify both endDate and occurrenceCount' };
    }

    return { valid: true };
  }
}
