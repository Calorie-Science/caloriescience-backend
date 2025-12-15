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
   * Helper to get local date parts
   */
  private getLocalParts(date: Date, timezone?: string) {
    if (!timezone || timezone === 'UTC') {
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        weekday: date.getUTCDay()
      };
    }

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour12: false
      }).formatToParts(date);

      const partMap: any = {};
      parts.forEach(p => partMap[p.type] = p.value);

      // Weekday map: Sun=0 ... Sat=6
      const weekdayMap: {[key: string]: number} = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };

      return {
        year: parseInt(partMap.year),
        month: parseInt(partMap.month) - 1, // 0-11
        day: parseInt(partMap.day),
        weekday: weekdayMap[partMap.weekday]
      };
    } catch (e) {
      // Fallback to UTC if timezone invalid
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        weekday: date.getUTCDay()
      };
    }
  }

  /**
   * Generate dates based on recurrence pattern
   */
  generateDates(
    pattern: RecurrencePattern,
    startDate: Date,
    endDate?: Date,
    timezone?: string
  ): Date[] {
    const parsed = this.parseRecurrencePattern(pattern);
    const dates: Date[] = [];
    const maxDate = endDate || parsed.endDate || new Date('2099-12-31');
    const maxOccurrences = parsed.occurrenceCount || Infinity;

    // Find the first occurrence on or after the requested start date
    let currentDate = this.findFirstOccurrenceOnOrAfter(pattern, startDate, timezone);
    let occurrenceCount = 0;

    while (currentDate <= maxDate && occurrenceCount < maxOccurrences) {
      dates.push(new Date(currentDate));
      occurrenceCount++;

      // Calculate next date based on pattern
      currentDate = this.getNextDate(currentDate, parsed, timezone);
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
    const firstDate = this.findFirstOccurrenceOnOrAfter(pattern, startOfMonth);
    
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
   * Find first occurrence date on or after startDate
   */
  private findFirstOccurrenceOnOrAfter(pattern: RecurrencePattern, startDate: Date, timezone?: string): Date {
    const parsed = this.parseRecurrencePattern(pattern);

    // Work in UTC to avoid timezone-induced day shifts (base calculation)
    // But verify against Local Parts if timezone provided
    const toUTC = (d: Date) =>
      new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds()
      ));
    const startUtc = toUTC(startDate);

    // For weekly patterns with specific days, find the first matching day on/after startDate
    if (parsed.type === 'weekly' && parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
      let current = new Date(startUtc);
      for (let i = 0; i < 7 * parsed.interval; i++) {
        if (parsed.daysOfWeek.includes(current.getUTCDay())) {
          return current;
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
      // Fallback: add interval weeks
      const fallback = new Date(startUtc);
      fallback.setUTCDate(fallback.getUTCDate() + 7 * parsed.interval);
      return fallback;
    }

    // For monthly patterns with specific days of month
    if (parsed.type === 'monthly' && parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
      // Find the first matching day of month on or after startDate
      // Strict matching: if desired day doesn't exist in current month, try next valid month
      let currentCheck = new Date(startUtc);
      // Safety limit to prevent infinite loops (e.g. searching for day 32)
      const MAX_MONTHS_LOOKAHEAD = 48; // 4 years
      
      // Start with current month
      // Reset to 1st of month to allow checking all days cleanly if we moved months
      // But for the very first check, we must be >= startUtc
      
      let monthsChecked = 0;
      
      while (monthsChecked < MAX_MONTHS_LOOKAHEAD) {
        const currentYear = currentCheck.getUTCFullYear();
        const currentMonth = currentCheck.getUTCMonth();
        const lastDayThisMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
        
        // Potential valid days in this month
        // Must be valid dates (<= lastDayThisMonth)
        // Must be in parsed.daysOfMonth
        // If it's the start month, must be >= startUtc's day
        
        let validDays = parsed.daysOfMonth.filter(d => d <= lastDayThisMonth);
        
        // If we are strictly in the start month (same year/month as startUtc)
        if (currentYear === startUtc.getUTCFullYear() && currentMonth === startUtc.getUTCMonth()) {
           validDays = validDays.filter(d => d >= startUtc.getUTCDate());
        }
        
        validDays.sort((a, b) => a - b);
        
        if (validDays.length > 0) {
          // Found a match in this month
          currentCheck.setUTCDate(validDays[0]);
          return currentCheck;
        }
        
        // Move to next interval month
        // Reset to 1st of that month to ensure valid date math
        // But we must move from the 'base' month alignment if we want strictly regular intervals?
        // Actually, simple iterative jump is safest for "find next valid".
        
        // Reset to 1st of current month first to avoid overflow when adding months
        currentCheck.setUTCDate(1); 
        currentCheck.setUTCMonth(currentCheck.getUTCMonth() + parsed.interval);
        monthsChecked++;
      }
      
      // If loop finishes without match, return startUtc as fallback (or null?)
      // Fallback to startUtc matches old behavior
      return startUtc;
    }

    // For daily, yearly, or weekly without specific days
    return startUtc;
  }

  /**
   * Get next date based on pattern
   */
  private getNextDate(currentDate: Date, parsed: ParsedPattern, timezone?: string): Date {
    // Work in UTC to avoid timezone shifts (copy)
    const nextDate = new Date(Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
      currentDate.getUTCHours(),
      currentDate.getUTCMinutes(),
      currentDate.getUTCSeconds(),
      currentDate.getUTCMilliseconds()
    ));

    switch (parsed.type) {
      case 'daily':
        nextDate.setUTCDate(nextDate.getUTCDate() + parsed.interval);
        break;

      case 'weekly':
        if (parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
          // Find next matching day of week
          let daysToAdd = 1;
          let found = false;
          while (!found && daysToAdd <= 7 * parsed.interval) {
            const testDate = new Date(currentDate);
            testDate.setUTCDate(testDate.getUTCDate() + daysToAdd);
            const local = this.getLocalParts(testDate, timezone);
            if (parsed.daysOfWeek.includes(local.weekday)) {
              nextDate.setTime(testDate.getTime());
              found = true;
            } else {
              daysToAdd++;
            }
          }
          if (!found) {
            // Fallback: add interval weeks
            nextDate.setUTCDate(nextDate.getUTCDate() + 7 * parsed.interval);
          }
        } else {
          nextDate.setUTCDate(nextDate.getUTCDate() + 7 * parsed.interval);
        }
        break;

      case 'monthly':
        if (parsed.daysOfMonth && parsed.daysOfMonth.length > 0) {
          const local = this.getLocalParts(currentDate, timezone);
          const currentDay = local.day;
          
          // Note: using UTC month end for safety approx, assuming local month length ~ UTC month length
          // Ideally should use Local Month End
          const currentYear = local.year;
          const currentMonth = local.month;
          const lastDayThisMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
          
          // 1. Try to find a later day in the CURRENT month
          // Filter days > currentDay AND days that effectively exist in this month
          const remainingDays = parsed.daysOfMonth
            .filter(d => d > currentDay && d <= lastDayThisMonth)
            .sort((a, b) => a - b);
          
          if (remainingDays.length > 0) {
            // Found next day in same month
            const diff = remainingDays[0] - currentDay;
            nextDate.setUTCDate(nextDate.getUTCDate() + diff);
            return nextDate;
          }

          // 2. If no more days in this month, jump by interval and find first valid day
          // Strict skipping: if target month has no valid day, keep jumping by interval
          
          let monthsAdded = 0;
          const MAX_LOOPS = 48; // Safety break
          
          // Start looking from next interval
          let foundNext = false;
          let checkDate = new Date(nextDate);
          
          // Reset to 1st to ensure clean month addition
          checkDate.setUTCDate(1); 
          
          while (!foundNext && monthsAdded < MAX_LOOPS) {
             // Jump to next interval month
             checkDate.setUTCMonth(checkDate.getUTCMonth() + parsed.interval);
             monthsAdded++;
             
             const cLocal = this.getLocalParts(checkDate, timezone);
             const cYear = cLocal.year;
             const cMonth = cLocal.month;
             const cLastDay = new Date(Date.UTC(cYear, cMonth + 1, 0)).getUTCDate();
             
             // Find first day in daysOfMonth that exists in this month
             const validDays = parsed.daysOfMonth
               .filter(d => d <= cLastDay)
               .sort((a, b) => a - b);
               
             if (validDays.length > 0) {
               // Found valid day in target month
               // Set checkDate to that day
               const diff = validDays[0] - cLocal.day;
               checkDate.setUTCDate(checkDate.getUTCDate() + diff);
               
               nextDate.setTime(checkDate.getTime());
               foundNext = true;
             }
             // If not found, loop continues to next interval month
          }
          
          // If we exhausted loops (very rare edge case like day 32), just return simple addition
          if (!foundNext) {
             nextDate.setUTCMonth(nextDate.getUTCMonth() + parsed.interval);
          }
          
        } else {
          // Same day of month, next interval months
          // Strict check for simple monthly (e.g. created on 31st, interval 1)
          
          let checkDate = new Date(nextDate);
          const startLocal = this.getLocalParts(checkDate, timezone);
          let targetDay = startLocal.day; // e.g. 31
          
          let monthsAdded = 0;
          let foundNext = false;
          const MAX_LOOPS = 48;
          
          // Start with next interval
          checkDate.setUTCDate(1); // Reset to 1st
          
          while (!foundNext && monthsAdded < MAX_LOOPS) {
            checkDate.setUTCMonth(checkDate.getUTCMonth() + parsed.interval);
            monthsAdded++;
            
            const cLocal = this.getLocalParts(checkDate, timezone);
            const cYear = cLocal.year;
            const cMonth = cLocal.month;
            const cLastDay = new Date(Date.UTC(cYear, cMonth + 1, 0)).getUTCDate();
            
            if (targetDay <= cLastDay) {
               const diff = targetDay - cLocal.day;
               checkDate.setUTCDate(checkDate.getUTCDate() + diff);
               
              nextDate.setTime(checkDate.getTime());
              foundNext = true;
            }
          }
          
          if (!foundNext) {
             nextDate.setUTCMonth(nextDate.getUTCMonth() + parsed.interval);
          }
        }
        break;


      case 'yearly':
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + parsed.interval);
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
