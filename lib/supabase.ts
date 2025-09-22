import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

// Create Supabase client for server-side operations
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create admin client with elevated privileges
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user by JWT token
export async function getUserFromToken(token: string) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          phone?: string;
          role: string;
          is_email_verified: boolean;
          email_verification_token?: string;
          password_reset_token?: string;
          password_reset_expires?: string;
          profile_image_url?: string;
          qualification?: string;
          experience_years?: number;
          specialization?: string[];
          preferred_measurement_system: 'metric' | 'imperial';
          created_at: string;
          updated_at: string;
          last_login_at?: string;
        };
        Insert: {
          email: string;
          password_hash: string;
          full_name: string;
          phone?: string;
          role?: string;
          qualification?: string;
          experience_years?: number;
          specialization?: string[];
          preferred_measurement_system?: 'metric' | 'imperial';
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          nutritionist_id: string;
          email?: string;
          phone?: string;
          full_name: string;
          date_of_birth?: string;
          gender?: 'male' | 'female' | 'other';
          height_cm?: number;
          weight_kg?: number;
          activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
          medical_conditions?: string[];
          allergies?: string[];
          medications?: string[];
          dietary_preferences?: string[];
          health_goals?: string[];
          target_weight_kg?: number;
          status: 'prospective' | 'active' | 'inactive' | 'archived';
          source?: string;
          notes?: string;
          preferred_contact_method: string;
          preferred_measurement_system: 'metric' | 'imperial';
          created_at: string;
          updated_at: string;
          converted_to_active_at?: string;
          last_interaction_at?: string;
        };
        Insert: {
          nutritionist_id: string;
          full_name: string;
          email?: string;
          phone?: string;
          date_of_birth?: string;
          gender?: 'male' | 'female' | 'other';
          height_cm?: number;
          weight_kg?: number;
          activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
          medical_conditions?: string[];
          allergies?: string[];
          medications?: string[];
          dietary_preferences?: string[];
          health_goals?: string[];
          target_weight_kg?: number;
          source?: string;
          notes?: string;
          preferred_measurement_system?: 'metric' | 'imperial';
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      client_goals: {
        Row: {
          id: string;
          client_id: string;
          nutritionist_id: string;
          eer_goal_calories: number;
          protein_goal_min: number;
          protein_goal_max: number;
          carbs_goal_min: number;
          carbs_goal_max: number;
          fat_goal_min: number;
          fat_goal_max: number;
          fiber_goal_grams?: number;
          water_goal_liters?: number;
          allergies?: string[];
          preferences?: string[];
          cuisine_types?: string[];
          is_active: boolean;
          goal_start_date: string;
          goal_end_date?: string;
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          nutritionist_id: string;
          eer_goal_calories: number;
          protein_goal_min: number;
          protein_goal_max: number;
          carbs_goal_min: number;
          carbs_goal_max: number;
          fat_goal_min: number;
          fat_goal_max: number;
          fiber_goal_grams?: number;
          water_goal_liters?: number;
          allergies?: string[];
          preferences?: string[];
          cuisine_types?: string[];
          goal_start_date?: string;
          goal_end_date?: string;
          notes?: string;
        };
        Update: Partial<Database['public']['Tables']['client_goals']['Insert']>;
      };
    };
  };
} 