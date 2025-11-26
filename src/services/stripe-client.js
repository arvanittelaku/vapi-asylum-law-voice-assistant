/**
 * Stripe Payment Client
 * 
 * Handles payment processing for consultation bookings.
 * The consultation fee is a refundable credit - deducted from final fee if client proceeds.
 */

class StripeClient {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.consultationPriceId = process.env.STRIPE_CONSULTATION_PRICE_ID;
    this.consultationFee = parseInt(process.env.CONSULTATION_FEE || '5000'); // Default £50 in pence
    
    this.stripe = null;
    
    if (this.secretKey) {
      this.stripe = require('stripe')(this.secretKey);
    } else {
      console.warn('[StripeClient] Warning: STRIPE_SECRET_KEY not set');
    }
  }

  /**
   * Create a checkout session for consultation booking
   * @param {Object} options - Session options
   * @returns {Promise<Object>} Checkout session
   */
  async createCheckoutSession(options) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const {
      contactId,
      customerEmail,
      customerName,
      appointmentId,
      successUrl,
      cancelUrl
    } = options;

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Initial Consultation - AsylumLaw',
                description: 'Refundable consultation credit. Deducted from final fee if you proceed with our services.',
              },
              unit_amount: this.consultationFee,
            },
            quantity: 1,
          },
        ],
        metadata: {
          contact_id: contactId,
          appointment_id: appointmentId,
          customer_name: customerName,
          type: 'consultation_booking'
        },
        success_url: successUrl || `${process.env.COMPANY_WEBSITE}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.COMPANY_WEBSITE}/booking-cancelled`,
      });

      console.log(`[StripeClient] Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      console.error('[StripeClient] Error creating checkout session:', error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {Buffer} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Verified event
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.stripe || !this.webhookSecret) {
      throw new Error('Stripe webhook not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      console.error('[StripeClient] Webhook signature verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle successful payment
   * @param {Object} session - Checkout session
   * @returns {Object} Payment result
   */
  async handleSuccessfulPayment(session) {
    const { contact_id, appointment_id, customer_name } = session.metadata || {};

    console.log(`[StripeClient] Payment successful for contact: ${contact_id}`);

    return {
      success: true,
      contactId: contact_id,
      appointmentId: appointment_id,
      customerName: customer_name,
      amount: session.amount_total,
      currency: session.currency,
      paymentIntent: session.payment_intent
    };
  }

  /**
   * Issue a refund
   * @param {string} paymentIntentId - Payment intent ID
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async issueRefund(paymentIntentId, reason = 'requested_by_customer') {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason
      });

      console.log(`[StripeClient] Refund issued: ${refund.id}`);
      return refund;
    } catch (error) {
      console.error('[StripeClient] Error issuing refund:', error.message);
      throw error;
    }
  }

  /**
   * Get payment details
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<Object>} Session details
   */
  async getSession(sessionId) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('[StripeClient] Error getting session:', error.message);
      throw error;
    }
  }

  /**
   * Check if Stripe is configured
   * @returns {boolean} True if configured
   */
  isConfigured() {
    return !!this.stripe;
  }
}

module.exports = new StripeClient();

