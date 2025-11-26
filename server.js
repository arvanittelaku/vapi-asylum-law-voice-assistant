/**
 * AsylumLaw Voice Assistant - Main Server
 * 
 * Webhook server for VAPI voice assistant integration with GoHighLevel.
 * Handles asylum intake, triage (Private vs Legal Aid), and appointment booking.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import webhook handlers
const vapiHandler = require('./src/webhooks/vapi-function-handler');
const ghlTriggerHandler = require('./src/webhooks/ghl-trigger-handler');
const ghlConfirmationHandler = require('./src/webhooks/ghl-confirmation-handler');
const endOfCallHandler = require('./src/webhooks/end-of-call-handler');
const stripeHandler = require('./src/webhooks/stripe-webhook-handler');

// Import logging & monitoring
const { logger, requestLogger, errorHandler, getMetrics } = require('./src/services/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production logging middleware (structured JSON logs)
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
} else {
  // Development logging (simple)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// HEALTH CHECK & MONITORING
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'asylumlaw-voice-assistant',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

/**
 * Metrics endpoint for monitoring dashboards
 * Shows request counts, function call stats, and recent errors
 */
app.get('/metrics', (req, res) => {
  // Basic auth protection for metrics
  const authHeader = req.headers.authorization;
  const expectedAuth = process.env.METRICS_AUTH_TOKEN;
  
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json(getMetrics());
});

/**
 * Simple status page for quick checks
 */
app.get('/status', async (req, res) => {
  const ghlClient = require('./src/services/ghl-client');
  
  const checks = {
    server: 'ok',
    ghl: 'unknown',
    vapi: 'unknown'
  };

  // Check GHL connection
  try {
    await ghlClient.testConnection();
    checks.ghl = 'ok';
  } catch (e) {
    checks.ghl = 'error';
  }

  // Check VAPI connection
  try {
    const axios = require('axios');
    await axios.get('https://api.vapi.ai/assistant', {
      headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` },
      params: { limit: 1 }
    });
    checks.vapi = 'ok';
  } catch (e) {
    checks.vapi = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// VAPI WEBHOOKS
// ============================================

/**
 * Main VAPI function tool handler
 * Handles all tool calls from assistants (calendar, booking, contact updates, etc.)
 */
app.post('/webhook/vapi', async (req, res) => {
  try {
    const result = await vapiHandler.handleFunctionCall(req.body);
    res.json(result);
  } catch (error) {
    console.error('[VAPI Handler Error]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * VAPI end-of-call webhook
 * Handles smart retry logic and status updates after calls end
 */
app.post('/webhook/vapi/end-of-call', async (req, res) => {
  try {
    const result = await endOfCallHandler.handleEndOfCall(req.body);
    res.json(result);
  } catch (error) {
    console.error('[End of Call Handler Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GHL WEBHOOKS
// ============================================

/**
 * GHL trigger for initial outbound call
 * Called by GHL workflow when new contact is created
 */
app.post('/webhook/ghl/trigger-call', async (req, res) => {
  try {
    const result = await ghlTriggerHandler.handleInitialCall(req.body);
    res.json(result);
  } catch (error) {
    console.error('[GHL Trigger Call Error]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GHL trigger for confirmation call
 * Called by GHL workflow 1 hour before appointment
 */
app.post('/webhook/ghl/trigger-confirmation', async (req, res) => {
  try {
    const result = await ghlConfirmationHandler.handleConfirmationCall(req.body);
    res.json(result);
  } catch (error) {
    console.error('[GHL Confirmation Error]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GHL webhook for form submission
 * Called when someone submits the intake form on the website
 */
app.post('/webhook/ghl/form-submit', async (req, res) => {
  try {
    const result = await ghlTriggerHandler.handleFormSubmit(req.body);
    res.json(result);
  } catch (error) {
    console.error('[GHL Form Submit Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STRIPE WEBHOOKS (Payments)
// ============================================

/**
 * Stripe payment webhook
 * Handles payment confirmations for consultations
 * Note: This endpoint needs raw body for signature verification
 */
app.post('/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const result = await stripeHandler.handleWebhook(req.body, signature);
      res.json(result);
    } catch (error) {
      console.error('[Stripe Webhook Error]', error.message);
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * Test endpoint for verifying tool connections
 */
app.get('/test/ghl', async (req, res) => {
  try {
    const ghlClient = require('./src/services/ghl-client');
    const result = await ghlClient.testConnection();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Test endpoint for timezone detection
 */
app.get('/test/timezone/:phone', (req, res) => {
  try {
    const timezoneDetector = require('./src/services/timezone-detector');
    const timezone = timezoneDetector.detectTimezone(req.params.phone);
    res.json({ phone: req.params.phone, timezone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler (uses production logger in production)
if (process.env.NODE_ENV === 'production') {
  app.use(errorHandler);
} else {
  app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('============================================');
  console.log('  ASYLUMLAW VOICE ASSISTANT SERVER');
  console.log('============================================');
  console.log(`  Status: Running`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('============================================');
  console.log('  Monitoring:');
  console.log('  - GET  /health        (basic health)');
  console.log('  - GET  /status        (service checks)');
  console.log('  - GET  /metrics       (detailed stats)');
  console.log('');
  console.log('  Webhooks:');
  console.log('  - POST /webhook/vapi');
  console.log('  - POST /webhook/vapi/end-of-call');
  console.log('  - POST /webhook/ghl/trigger-call');
  console.log('  - POST /webhook/ghl/trigger-confirmation');
  console.log('  - POST /webhook/ghl/form-submit');
  console.log('  - POST /webhook/stripe');
  console.log('============================================');
  
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

module.exports = app;

