import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { generateToken } from '../lib/auth';
import { validateBody, userRegistrationSchema, userLoginSchema } from '../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../lib/caseTransform';
import bcrypt from 'bcryptjs';

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
        return await handleRegistration(req, res);
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

async function handleRegistration(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  try {
    const validation = validateBody(userRegistrationSchema, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Transform camelCase to snake_case for database
    const userData = transformWithMapping(validation.value, FIELD_MAPPINGS.camelToSnake);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email address already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Auto-generate full_name for backward compatibility
    const fullName = userData.full_name || `${userData.first_name} ${userData.last_name || ''}`.trim();

    // Insert new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        phone: userData.phone || null,
        phone_country_code: userData.phone_country_code || '+1',
        qualification: userData.qualification || null,
        experience_years: userData.experience_years || null,
        specialization: userData.specialization || null,
        full_name: fullName,
        role: 'nutritionist',
        is_email_verified: false
      })
      .select('id, email, first_name, last_name, full_name, role, created_at')
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
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

    // Transform response to camelCase
    const transformedUser = transformWithMapping(newUser, FIELD_MAPPINGS.snakeToCamel);

    return res.status(201).json({
      message: 'Registration successful',
      user: transformedUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: 'An unexpected error occurred during registration'
    });
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  try {
    const validation = validateBody(userLoginSchema, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { email, password } = validation.value;

    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, full_name, role')
      .eq('email', email.toLowerCase())
      .eq('role', 'nutritionist')
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      role: user.role
    });

    // Transform response to camelCase
    const transformedUser = transformWithMapping({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      role: user.role
    }, FIELD_MAPPINGS.snakeToCamel);

    return res.status(200).json({
      message: 'Login successful',
      user: transformedUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: 'An unexpected error occurred during login'
    });
  }
} 