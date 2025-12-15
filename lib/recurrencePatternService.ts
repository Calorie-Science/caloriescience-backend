/**
 * Recurrence Pattern Service
 * Handles parsing recurrence patterns and generating dates
 */

import { DateTime } from 'luxon';

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

    // Normalize daysOfMonth: sort and dedupe to avoid skips
    if (daysOfMonth && daysOfMonth.length > 0) {
      daysOfMonth = Array.from(new Set(daysOfMonth)).sort((a, b) => a - b);
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
    endDate?: Date,
    timezone: string = 'UTC'
  ): Date[] {
    const parsed = this.parseRecurrencePattern(pattern);
    const dates: Date[] = [];
    const maxDate = endDate ? DateTime.fromJSDate(endDate).toUTC() : 
                    parsed.endDate ? DateTime.fromJSDate(parsed.endDate).toUTC() : 
                    DateTime.fromISO('2099-12-31').toUTC();
    const maxOccurrences = parsed.occurrenceCount || Infinity;

    // Start iteration using Luxon DateTime in the target timezone
    // This preserves wall-clock time (e.g. 10:00 AM stays 10:00 AM)
    let currentDt = this.findFirstOccurrenceOnOrAfter(pattern, startDate, timezone);
    let occurrenceCount = 0;

    // Convert maxDate to millis for safe comparison
    const maxTime = maxDate.toMillis();

    while (currentDt.toUTC().toMillis() <= maxTime && occurrenceCount < maxOccurrences) {
      dates.push(currentDt.toJSDate());
      occurrenceCount++;

      // Calculate next date based on pattern
      currentDt = this.getNextDate(currentDt, parsed, timezone);
    }

    return dates;
  }

  /**
   * Generate dates for a specific month
   */
  generateDatesForMonth(
    pattern: RecurrencePattern,
    month: number, // 1-12
    year: number,
    timezone: string = 'UTC'
  ): Date[] {
    const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf('day').toJSDate();
    const endOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).endOf('month').endOf('day').toJSDate();

    // Find the first occurrence date (could be before this month)
    const firstDate = this.findFirstOccurrenceOnOrAfter(pattern, new RecurrencePatternService().parseRecurrencePattern(pattern).type === 'monthly' ? startOfMonth : startOfMonth, timezone).toJSDate();
    
    // Generate all dates from first occurrence to end of month
    const allDates = this.generateDates(pattern, firstDate, endOfMonth, timezone);

    // Filter to only dates in the requested month
    return allDates.filter(date => {
      const dt = DateTime.fromJSDate(date).setZone(timezone);
      return dt.month === month && dt.year === year;
    });
  }

  /**
   * Find first occurrence date on or after startDate
   */
  private findFirstOccurrenceOnOrAfter(pattern: RecurrencePattern, startDate: Date, timezone: string = 'UTC'): DateTime {
    const parsed = this.parseRecurrencePattern(pattern);
    
    // Convert input JS Date (UTC instant) to Luxon DateTime in Target Zone
    const startDt = DateTime.fromJSDate(startDate).setZone(timezone);
    
    // For weekly patterns
    if (parsed.type === 'weekly' && parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
      let current = startDt;
      // Luxon weekday: 1=Mon ... 7=Sun.
      // Input daysOfWeek: 0=Sun ... 6=Sat.
      // Map input (0-6) to Luxon (1-7): 0->7, 1->1, 2->2 ... 6->6.
      const targetLuxonWeekdays = parsed.daysOfWeek.map(d => d === 0 ? 7 : d);
      
      for (let i = 0; i < 7 * parsed.interval; i++) {
        if (targetLuxonWeekdays.includes(current.weekday)) {
          return current;
        }
        current = current.plus({ days: 1 });
      }
      // Fallback
      return startDt.plus({ weeks: parsed.interval });
    }

    // For monthly patterns
    if (parsed.type === 'monthly' && parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
      // Logic: Start at startDt. Check if day is valid. If not, scan forward.
      // Strict skipping: if month doesn't have the day, skip month.
      
      let currentCheck = startDt;
      const MAX_MONTHS_LOOKAHEAD = 48;
      let monthsChecked = 0;
      
      // If we start on a day > max daysOfMonth, we might need to jump immediately?
      // No, check current month first.
      
      while (monthsChecked < MAX_MONTHS_LOOKAHEAD) {
        const daysInMonth = currentCheck.daysInMonth || 30; // Safety fallback
        
        // Find valid days in this month
        // Must be <= daysInMonth
        // If it's the start month (same year/month), must be >= startDt.day
        // BUT strict comparison: year/month match.
        
        const isStartMonth = currentCheck.hasSame(startDt, 'month') && currentCheck.hasSame(startDt, 'year');
        
        let validDays = parsed.daysOfMonth.filter(d => d <= daysInMonth);
        if (isStartMonth) {
          validDays = validDays.filter(d => d >= startDt.day);
        }
        validDays.sort((a, b) => a - b);
        
        if (validDays.length > 0) {
          // Found a match!
          // Construct date: keep year/month, set day to validDays[0]
          // Preserve TIME from startDt (wall clock time)
          const result = currentCheck.set({ day: validDays[0] });
          if (result.isValid) return result;
        }
        
        // Move to next month (interval)
        // Reset to day 1 to be safe for month arithmetic
        currentCheck = currentCheck.set({ day: 1 }).plus({ months: parsed.interval });
        monthsChecked++;
      }
      return startDt;
    }
    
    // For daily/yearly
    return startDt;
  }

  /**
   * Get next date based on pattern
   */
  private getNextDate(currentDt: DateTime, parsed: ParsedPattern, timezone: string = 'UTC'): DateTime {
    // CurrentDt is already in Target Zone (Luxon)
    
    switch (parsed.type) {
      case 'daily':
        return currentDt.plus({ days: parsed.interval });

      case 'weekly':
        if (parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
          const targetLuxonWeekdays = parsed.daysOfWeek.map(d => d === 0 ? 7 : d);
          let next = currentDt.plus({ days: 1 });
          let daysAdded = 1;
          
          while (daysAdded <= 7 * parsed.interval) {
            if (targetLuxonWeekdays.includes(next.weekday)) {
              return next;
            }
            next = next.plus({ days: 1 });
            daysAdded++;
          }
          return currentDt.plus({ weeks: parsed.interval });
        }
        return currentDt.plus({ weeks: parsed.interval });

      case 'monthly':
        if (parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
          // 1. Try later days in current month
          const currentDay = currentDt.day;
          const daysInMonth = currentDt.daysInMonth || 30;
          
          const remainingDays = parsed.daysOfMonth
            .filter(d => d > currentDay && d <= daysInMonth)
            .sort((a, b) => a - b);
            
          if (remainingDays.length > 0) {
            return currentDt.set({ day: remainingDays[0] });
          }
          
          // 2. Scan next months
          let nextCheck = currentDt.set({ day: 1 }).plus({ months: parsed.interval });
          let monthsAdded = 0;
          const MAX_LOOPS = 48;
          
          while (monthsAdded < MAX_LOOPS) {
            const dim = nextCheck.daysInMonth || 30;
            const validDays = parsed.daysOfMonth
              .filter(d => d <= dim)
              .sort((a, b) => a - b);
              
            if (validDays.length > 0) {
              return nextCheck.set({ day: validDays[0] });
            }
            
            nextCheck = nextCheck.plus({ months: parsed.interval });
            monthsAdded++;
          }
          // Fallback
          return currentDt.plus({ months: parsed.interval });
        }
        return currentDt.plus({ months: parsed.interval });

      case 'yearly':
        return currentDt.plus({ years: parsed.interval });
    }
    return currentDt.plus({ days: parsed.interval });
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
        0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
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
