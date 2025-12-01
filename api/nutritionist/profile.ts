import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import Joi from 'joi';

/**
 * GET /api/nutritionist/profile - Get nutritionist profile
 * PUT /api/nutritionist/profile - Update nutritionist profile
 */

// Validation schema for profile update
const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phone: Joi.string().max(20).allow(null, '').optional(),
  phoneCountryCode: Joi.string().max(5).optional(),
  profileImageUrl: Joi.string().uri().allow(null, '').optional(),
  qualification: Joi.string().max(500).allow(null, '').optional(),
  experienceYears: Joi.number().integer().min(0).max(100).allow(null).optional(),
  specialization: Joi.array().items(Joi.string()).allow(null).optional(),
  preferredMeasurementSystem: Joi.string().valid('metric', 'imperial').optional()
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access this endpoint'
    });
  }

  // GET - Fetch nutritionist profile
  if (req.method === 'GET') {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          phone_country_code,
          role,
          is_email_verified,
          profile_image_url,
          qualification,
          experience_years,
          specialization,
          preferred_measurement_system,
          created_at,
          updated_at,
          last_login_at
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching nutritionist profile:', error);
        return res.status(500).json({
          error: 'Failed to fetch profile',
          message: error.message
        });
      }

      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone,
          phoneCountryCode: profile.phone_country_code,
          role: profile.role,
          isEmailVerified: profile.is_email_verified,
          profileImageUrl: profile.profile_image_url,
          qualification: profile.qualification,
          experienceYears: profile.experience_years,
          specialization: profile.specialization,
          preferredMeasurementSystem: profile.preferred_measurement_system,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          lastLoginAt: profile.last_login_at
        }
      });

    } catch (error) {
      console.error('❌ Error in GET profile:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT - Update nutritionist profile
  if (req.method === 'PUT') {
    try {
      // Validate request body
      const { error: validationError, value: validatedData } = profileUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid request data',
          details: validationError.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Build update object with snake_case keys for database
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (validatedData.firstName !== undefined) {
        updateData.first_name = validatedData.firstName;
        // Also update full_name if first or last name changes
        const { data: currentUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const firstName = validatedData.firstName;
        const lastName = validatedData.lastName !== undefined ? validatedData.lastName : currentUser?.last_name || '';
        updateData.full_name = `${firstName} ${lastName}`.trim();
      }

      if (validatedData.lastName !== undefined) {
        updateData.last_name = validatedData.lastName;
        // Also update full_name if first or last name changes
        if (!validatedData.firstName) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

          const firstName = currentUser?.first_name || '';
          const lastName = validatedData.lastName;
          updateData.full_name = `${firstName} ${lastName}`.trim();
        }
      }

      if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
      if (validatedData.phoneCountryCode !== undefined) updateData.phone_country_code = validatedData.phoneCountryCode;
      if (validatedData.profileImageUrl !== undefined) updateData.profile_image_url = validatedData.profileImageUrl;
      if (validatedData.qualification !== undefined) updateData.qualification = validatedData.qualification;
      if (validatedData.experienceYears !== undefined) updateData.experience_years = validatedData.experienceYears;
      if (validatedData.specialization !== undefined) updateData.specialization = validatedData.specialization;
      if (validatedData.preferredMeasurementSystem !== undefined) updateData.preferred_measurement_system = validatedData.preferredMeasurementSystem;

      // Update the profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          phone_country_code,
          role,
          is_email_verified,
          profile_image_url,
          qualification,
          experience_years,
          specialization,
          preferred_measurement_system,
          created_at,
          updated_at,
          last_login_at
        `)
        .single();

      if (updateError) {
        console.error('❌ Error updating nutritionist profile:', updateError);
        return res.status(500).json({
          error: 'Failed to update profile',
          message: updateError.message
        });
      }

      console.log('✅ Nutritionist profile updated successfully:', user.id);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          fullName: updatedProfile.full_name,
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          phone: updatedProfile.phone,
          phoneCountryCode: updatedProfile.phone_country_code,
          role: updatedProfile.role,
          isEmailVerified: updatedProfile.is_email_verified,
          profileImageUrl: updatedProfile.profile_image_url,
          qualification: updatedProfile.qualification,
          experienceYears: updatedProfile.experience_years,
          specialization: updatedProfile.specialization,
          preferredMeasurementSystem: updatedProfile.preferred_measurement_system,
          createdAt: updatedProfile.created_at,
          updatedAt: updatedProfile.updated_at,
          lastLoginAt: updatedProfile.last_login_at
        }
      });

    } catch (error) {
      console.error('❌ Error in PUT profile:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
