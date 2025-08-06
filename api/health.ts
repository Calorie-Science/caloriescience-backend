import { VercelRequest, VercelResponse } from '@vercel/node';
import { runMigrations, validateMigrations, rerunMigration } from '../lib/migrations';

let migrationsRun = false;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Handle manual migration actions (for authenticated users)
    if (req.method === 'POST') {
      const { action, migration_name } = req.body;

      switch (action) {
        case 'migrate':
          const result = await runMigrations();
          return res.status(200).json({
            message: 'Migration process completed',
            ...result
          });

        case 'validate':
          const validation = await validateMigrations();
          return res.status(200).json({
            message: 'Migration validation completed',
            ...validation
          });

        case 'rerun':
          if (!migration_name) {
            return res.status(400).json({
              error: 'Migration name required for rerun action'
            });
          }
          const rerunSuccess = await rerunMigration(migration_name);
          return res.status(200).json({
            message: `Migration ${migration_name} ${rerunSuccess ? 'completed' : 'failed'}`,
            success: rerunSuccess
          });

        default:
          return res.status(400).json({
            error: 'Invalid action. Use: migrate, validate, or rerun'
          });
      }
    }

    // Regular health check (GET)
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for manual migration trigger via query parameter
    const { migrate } = req.query;
    if (migrate === 'true') {
      console.log('Manual migration trigger via health endpoint...');
      const migrationResult = await runMigrations();
      
      return res.status(200).json({
        status: 'healthy',
        message: 'Manual migration completed',
        timestamp: new Date().toISOString(),
        migrations: migrationResult
      });
    }

    // Run migrations on first health check after deployment
    if (!migrationsRun) {
      console.log('Running database migrations on startup...');
      const migrationResult = await runMigrations();
      migrationsRun = true;
      
      if (!migrationResult.success) {
        console.error('Migrations failed on startup:', migrationResult.failed);
        return res.status(500).json({
          status: 'error',
          message: 'Database migrations failed',
          timestamp: new Date().toISOString(),
          migrations: migrationResult
        });
      }
      
      console.log('Migrations completed successfully on startup');
    }

    return res.status(200).json({
      status: 'healthy',
      message: 'CalorieScience API is running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      migrations_run: migrationsRun
    });

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 