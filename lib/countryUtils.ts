// Utility functions for consistent country handling across the application

import { normalizeCountry } from './locationMapping';

/**
 * Normalize country values in an object to lowercase
 * @param data - Object containing country fields
 * @param countryFields - Array of field names that contain country values
 * @returns Object with normalized country values
 */
export function normalizeCountryFields<T extends Record<string, any>>(
  data: T, 
  countryFields: string[]
): T {
  const normalized = { ...data };
  
  for (const field of countryFields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = normalizeCountry(normalized[field]);
    }
  }
  
  return normalized;
}

/**
 * Normalize country values in database query results
 * @param results - Array of database results
 * @param countryFields - Array of field names that contain country values
 * @returns Array with normalized country values
 */
export function normalizeCountryFieldsInResults<T extends Record<string, any>>(
  results: T[], 
  countryFields: string[]
): T[] {
  return results.map(result => normalizeCountryFields(result, countryFields));
}

/**
 * Common country field names used across the application
 */
export const COMMON_COUNTRY_FIELDS = [
  'country',
  'country_name',
  'country_code',
  'eer_guideline_country',
  'macro_guideline_country',
  'country_guideline',
  'location'
];

/**
 * Normalize all common country fields in an object
 * @param data - Object that may contain country fields
 * @returns Object with normalized country values
 */
export function normalizeAllCountryFields<T extends Record<string, any>>(data: T): T {
  return normalizeCountryFields(data, COMMON_COUNTRY_FIELDS);
}

/**
 * Ensure country value is lowercase before database operations
 * @param country - Country value to normalize
 * @returns Normalized lowercase country value
 */
export function ensureLowerCaseCountry(country: string): string {
  return normalizeCountry(country);
}

/**
 * Validate that country values are in lowercase format
 * @param country - Country value to validate
 * @returns True if country is lowercase, false otherwise
 */
export function isLowerCaseCountry(country: string): boolean {
  if (!country || typeof country !== 'string') return false;
  return country === country.toLowerCase();
}

/**
 * Convert country values in a database query to lowercase
 * @param query - Supabase query object
 * @param countryFields - Array of field names to convert
 * @returns Modified query with lowercase country values
 */
export function addLowerCaseCountryQuery<T extends Record<string, any>>(
  query: any,
  countryFields: string[]
): any {
  let modifiedQuery = query;
  
  for (const field of countryFields) {
    if (modifiedQuery[field]) {
      modifiedQuery[field] = normalizeCountry(modifiedQuery[field]);
    }
  }
  
  return modifiedQuery;
}
