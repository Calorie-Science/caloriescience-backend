import { VercelRequest } from '@vercel/node';
import { verifyToken, extractTokenFromHeaders } from './auth';

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
  };
  error?: string;
}

/**
 * Authenticate a request and return the result
 * This is a non-middleware version that returns an authentication result object
 */
export async function authenticate(req: VercelRequest): Promise<AuthResult> {
  try {
    // Extract token from authorization header
    const token = extractTokenFromHeaders(req.headers.authorization as string);
    
    if (!token) {
      return {
        authenticated: false,
        error: 'No authorization token provided'
      };
    }

    // Verify token and get user
    const user = await verifyToken(token);
    
    if (!user) {
      return {
        authenticated: false,
        error: 'Invalid or expired token'
      };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed'
    };
  }
}

