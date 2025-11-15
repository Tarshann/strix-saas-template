import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'strix',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
      uptime: process.uptime(),
    },
  };

  const isHealthy = health.checks.database && health.checks.memory.healthy;

  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return false;
    }

    // In a real implementation, you would ping the database
    // For now, we just check if the connection string exists
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

function checkMemory() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

  return {
    heapUsedMB,
    heapTotalMB,
    heapUsagePercent: Math.round(heapUsagePercent),
    healthy: heapUsagePercent < 90,
  };
}
