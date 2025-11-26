/**
 * Stripe Webhook Handler
 * 
 * Handles payment events from Stripe:
 * - checkout.session.completed - Payment successful
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund processed
 */

const stripeClient = require('../services/stripe-client');
const ghlClient = require('../services/ghl-client');
const smsClient = require('../services/sms-client');

class StripeWebhookHandler {
  /**
   * Handle incoming Stripe webhook
   * @param {Buffer} rawBody - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Handler result
   */
  async handleWebhook(rawBody, signature) {
    // Verify signature and construct event
    let event;
    
    try {
      event = stripeClient.verifyWebhookSignature(rawBody, signature);
    } catch (error) {
      console.error('[StripeHandler] Signature verification failed');
      throw error;
    }

    console.log(`[StripeHandler] Event received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutComplete(event.data.object);
      
      case 'payment_intent.payment_failed':
        return this.handlePaymentFailed(event.data.object);
      
      case 'charge.refunded':
        return this.handleRefund(event.data.object);
      
      default:
        console.log(`[StripeHandler] Unhandled event type: ${event.type}`);
        return { received: true, handled: false };
    }
  }

  /**
   * Handle successful checkout completion
   * @param {Object} session - Stripe checkout session
   */
  async handleCheckoutComplete(session) {
    const { contact_id, appointment_id, customer_name } = session.metadata || {};

    console.log(`[StripeHandler] Checkout completed for contact: ${contact_id}`);

    if (!contact_id) {
      console.warn('[StripeHandler] No contact_id in session metadata');
      return { success: false, error: 'No contact ID' };
    }

    try {
      // Update contact with payment confirmation
      await ghlClient.updateCustomFields(contact_id,
        ghlClient.buildCustomFields({
          confirmationStatus: 'paid',
          triageStatus: 'private-candidate'
        })
      );

      // Add payment tag
      await ghlClient.addTags(contact_id, ['payment-confirmed', 'private']);

      // Get contact details for SMS
      let contact;
      try {
        contact = await ghlClient.getContact(contact_id);
      } catch (e) {
        console.warn('[StripeHandler] Could not fetch contact details');
      }

      // Send confirmation SMS
      if (contact?.phone) {
        const firstName = customer_name?.split(' ')[0] || contact.firstName || 'there';
        const amount = (session.amount_total / 100).toFixed(2);

        await smsClient.sendSMS(contact.phone, 
          `Hi ${firstName},\n\nThank you! Your consultation payment of £${amount} has been received.\n\nYour appointment is confirmed. A specialist will call you at the scheduled time.\n\nThis credit is fully refundable if you don't proceed with our services.\n\n- AsylumLaw Team`
        );
      }

      // Create task for team notification
      await ghlClient.createTask({
        contactId: contact_id,
        title: `✅ Payment Received - ${customer_name || 'Unknown'}`,
        description: `Consultation payment confirmed.\n\nAmount: £${(session.amount_total / 100).toFixed(2)}\nAppointment ID: ${appointment_id || 'N/A'}\nPayment ID: ${session.payment_intent}`,
        dueDate: new Date().toISOString()
      });

      console.log('[StripeHandler] Payment processed successfully');

      return {
        success: true,
        contactId: contact_id,
        amount: session.amount_total,
        paymentIntent: session.payment_intent
      };

    } catch (error) {
      console.error('[StripeHandler] Error processing payment:', error.message);
      throw error;
    }
  }

  /**
   * Handle failed payment
   * @param {Object} paymentIntent - Stripe payment intent
   */
  async handlePaymentFailed(paymentIntent) {
    const { contact_id, customer_name } = paymentIntent.metadata || {};

    console.log(`[StripeHandler] Payment failed for contact: ${contact_id}`);

    if (contact_id) {
      try {
        // Update contact status
        await ghlClient.addTags(contact_id, ['payment-failed']);

        // Create follow-up task
        await ghlClient.createTask({
          contactId: contact_id,
          title: `⚠️ Payment Failed - ${customer_name || 'Unknown'}`,
          description: `Payment attempt failed.\n\nError: ${paymentIntent.last_payment_error?.message || 'Unknown error'}\n\nPlease follow up with the client.`,
          dueDate: new Date().toISOString()
        });
      } catch (error) {
        console.error('[StripeHandler] Error handling failed payment:', error.message);
      }
    }

    return {
      success: true,
      handled: true,
      status: 'payment_failed'
    };
  }

  /**
   * Handle refund
   * @param {Object} charge - Stripe charge object
   */
  async handleRefund(charge) {
    console.log(`[StripeHandler] Refund processed: ${charge.id}`);

    // Log refund for records
    // In production, you might want to update the contact record

    return {
      success: true,
      handled: true,
      status: 'refunded',
      chargeId: charge.id,
      refundAmount: charge.amount_refunded
    };
  }
}

module.exports = new StripeWebhookHandler();

