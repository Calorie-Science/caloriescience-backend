import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from './config';
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const signOptions: SignOptions = {
    expiresIn: config.jwt.expiresIn
  };

  return jwt.sign(payload, config.jwt.secret as string, signOptions);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    // Get fresh user data from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return null;
    }

    return user as AuthUser;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate random token for email verification and password reset
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Extract user from request headers
export function extractTokenFromHeaders(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

// Authentication middleware for API routes
export function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    try {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
      }

      const token = extractTokenFromHeaders(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please provide a valid authorization token'
        });
      }

      const user = await verifyToken(token);
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'Your session has expired. Please log in again.'
        });
      }

      // Add user to request object
      req.user = user;
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during authentication'
      });
    }
  };
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (handler: Function) => {
    return requireAuth(async (req: any, res: any) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this resource'
        });
      }
      
      return handler(req, res);
    });
  };
}

// Optional authentication (doesn't require auth but adds user if present)
export function optionalAuth(handler: Function) {
  return async (req: any, res: any) => {
    try {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
      }

      const token = extractTokenFromHeaders(req.headers.authorization);
      
      if (token) {
        const user = await verifyToken(token);
        if (user) {
          req.user = user;
        }
      }
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return handler(req, res);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return handler(req, res);
    }
  };
}

// Update last login timestamp
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
} 