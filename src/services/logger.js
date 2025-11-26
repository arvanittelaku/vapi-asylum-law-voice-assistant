/**
 * PRODUCTION LOGGER & MONITORING
 * 
 * Structured logging with levels, context, and metrics tracking.
 * Designed for easy integration with log aggregators (Datadog, LogDNA, etc.)
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Metrics storage (in production, use Prometheus/StatsD)
const metrics = {
  requests: { total: 0, success: 0, failed: 0 },
  functionCalls: {},
  responseTime: [],
  errors: [],
  callOutcomes: {},
  lastReset: new Date().toISOString()
};

/**
 * Format log entry as structured JSON
 */
function formatLog(level, message, context = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'asylumlaw-voice-assistant',
    message,
    ...context,
    env: process.env.NODE_ENV || 'development'
  });
}

/**
 * Main logging functions
 */
const logger = {
  debug(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatLog('DEBUG', message, context));
    }
  },

  info(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatLog('INFO', message, context));
    }
  },

  warn(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, context));
    }
  },

  error(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, context));
      metrics.errors.push({
        timestamp: new Date().toISOString(),
        message,
        ...context
      });
      // Keep only last 100 errors
      if (metrics.errors.length > 100) metrics.errors.shift();
    }
  },

  critical(message, context = {}) {
    console.error(formatLog('CRITICAL', message, { ...context, alert: true }));
    metrics.errors.push({
      timestamp: new Date().toISOString(),
      message,
      severity: 'CRITICAL',
      ...context
    });
  },

  /**
   * Log function call with timing
   */
  functionCall(functionName, params, callId) {
    const startTime = Date.now();
    
    // Track function call count
    if (!metrics.functionCalls[functionName]) {
      metrics.functionCalls[functionName] = { count: 0, success: 0, failed: 0, avgTime: 0 };
    }
    metrics.functionCalls[functionName].count++;

    return {
      success: (result) => {
        const duration = Date.now() - startTime;
        metrics.functionCalls[functionName].success++;
        updateAvgTime(functionName, duration);
        
        logger.info(`Function call succeeded: ${functionName}`, {
          functionName,
          callId,
          duration,
          success: true
        });
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        metrics.functionCalls[functionName].failed++;
        
        logger.error(`Function call failed: ${functionName}`, {
          functionName,
          callId,
          duration,
          error: error.message,
          success: false
        });
      }
    };
  },

  /**
   * Log incoming request
   */
  request(req, context = {}) {
    metrics.requests.total++;
    
    logger.info(`Incoming request: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...context
    });
  },

  /**
   * Log outgoing response
   */
  response(req, res, duration, context = {}) {
    if (res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.failed++;
    }
    
    metrics.responseTime.push(duration);
    if (metrics.responseTime.length > 1000) metrics.responseTime.shift();

    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`Response: ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ...context
    });
  },

  /**
   * Log call outcome for analytics
   */
  callOutcome(outcome, context = {}) {
    if (!metrics.callOutcomes[outcome]) {
      metrics.callOutcomes[outcome] = 0;
    }
    metrics.callOutcomes[outcome]++;

    logger.info(`Call outcome: ${outcome}`, {
      outcome,
      ...context
    });
  },

  /**
   * Log GHL sync operation
   */
  ghlSync(operation, contactId, success, context = {}) {
    const logLevel = success ? 'info' : 'error';
    logger[logLevel](`GHL sync: ${operation}`, {
      operation,
      contactId,
      success,
      ...context
    });
  },

  /**
   * Log VAPI interaction
   */
  vapiCall(action, assistantId, context = {}) {
    logger.info(`VAPI: ${action}`, {
      action,
      assistantId,
      ...context
    });
  }
};

function updateAvgTime(functionName, duration) {
  const func = metrics.functionCalls[functionName];
  const totalCalls = func.success + func.failed;
  func.avgTime = ((func.avgTime * (totalCalls - 1)) + duration) / totalCalls;
}

/**
 * Get current metrics snapshot
 */
function getMetrics() {
  const avgResponseTime = metrics.responseTime.length > 0
    ? metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length
    : 0;

  return {
    uptime: process.uptime(),
    lastReset: metrics.lastReset,
    requests: { ...metrics.requests },
    functionCalls: { ...metrics.functionCalls },
    callOutcomes: { ...metrics.callOutcomes },
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      p99ResponseTime: calculateP99(metrics.responseTime)
    },
    recentErrors: metrics.errors.slice(-10)
  };
}

function calculateP99(times) {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.99);
  return sorted[index] || sorted[sorted.length - 1];
}

/**
 * Reset metrics (typically called on schedule)
 */
function resetMetrics() {
  metrics.requests = { total: 0, success: 0, failed: 0 };
  metrics.functionCalls = {};
  metrics.responseTime = [];
  metrics.callOutcomes = {};
  metrics.lastReset = new Date().toISOString();
  // Keep errors for debugging
}

/**
 * Express middleware for request/response logging
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  logger.request(req);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    logger.response(req, res, duration);
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Express error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
}

module.exports = {
  logger,
  getMetrics,
  resetMetrics,
  requestLogger,
  errorHandler
};

