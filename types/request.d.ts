import { AuthUser } from './auth';

declare module 'http' {
  interface IncomingMessage {
    user?: AuthUser;
  }
} 