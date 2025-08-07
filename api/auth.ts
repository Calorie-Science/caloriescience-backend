import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { hashPassword, generateToken, generateRandomToken, verifyPassword, updateLastLogin } from '../lib/auth';
import { validateBody, userRegistrationSchema, userLoginSchema } from '../lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'register':
        return await handleRegister(req, res);
      case 'login':
        return await handleLogin(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be either "register" or "login"'
        });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
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

  // Insert new user
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      email: userData.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
      phone_country_code: userData.phone_country_code,
      qualification: userData.qualification,
      experience_years: userData.experience_years,
      specialization: userData.specialization,
      email_verification_token: emailVerificationToken,
      role: 'nutritionist',
      full_name: userData.full_name || `${userData.first_name} ${userData.last_name || ''}`.trim()
    })
    .select('id, email, first_name, last_name, full_name, role, is_email_verified')
    .single();

  if (insertError) {
    console.error('Registration error:', insertError);
    return res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create user account'
    });
  }

  // Generate JWT token
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    first_name: newUser.first_name,
    last_name: newUser.last_name,
    full_name: newUser.full_name,
    role: newUser.role
  });

  return res.status(201).json({
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
}

async function handleLogin(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  // Validate request body
  const validation = validateBody(userLoginSchema, req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }

  const { email, password } = validation.value;

  // Get user from database
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
  }

  // Update last login timestamp
  await updateLastLogin(user.id);

  // Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role
  });

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_email_verified: user.is_email_verified,
      qualification: user.qualification,
      experience_years: user.experience_years,
      specialization: user.specialization
    }
  });
} 