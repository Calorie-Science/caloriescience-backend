import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { hashPassword, generateRandomToken, generateToken } from '../../lib/auth';
import { validateBody, userRegistrationSchema } from '../../lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validation = validateBody(userRegistrationSchema, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const userData = validation.value;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Generate email verification token
    const emailVerificationToken = generateRandomToken();

    // Create user in database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        full_name: userData.full_name,
        phone: userData.phone,
        qualification: userData.qualification,
        experience_years: userData.experience_years,
        specialization: userData.specialization,
        email_verification_token: emailVerificationToken,
        role: 'nutritionist'
      })
      .select('id, email, full_name, role, is_email_verified')
      .single();

    if (insertError) {
      console.error('User creation error:', insertError);
      return res.status(500).json({
        error: 'Failed to create user',
        message: 'An error occurred while creating your account'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Return success response
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        is_email_verified: newUser.is_email_verified
      },
      next_step: 'Please check your email to verify your account'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration'
    });
  }
} 