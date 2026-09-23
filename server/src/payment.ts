/**
 * Payment provider adapter interface and sandbox/test implementation.
 *
 * Production adapters (Stripe, etc.) would implement this interface and be
 * swapped in via server config. The sandbox always reports payment as
 * immediately confirmed, for development and testing.
 */

export interface PaymentCheckout {
  /** Opaque checkout reference from the payment provider */
  providerCheckoutId: string;
  /** URL or client secret the client uses to complete payment */
  paymentInfo: string;
}

export interface PaymentStatus {
  paid: boolean;
  /** Provider-canonical status string */
  status: string;
}

export interface PaymentAdapter {
  /**
   * Create a checkout / payment intent for the given amount.
   * Returns provider checkout ID and the info the client needs to complete payment.
   */
  createCheckout(
    purchaseId: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<PaymentCheckout>;

  /**
   * Server-side authoritative payment status check.
   * Must call the provider API; must never trust client input.
   */
  getPaymentStatus(providerCheckoutId: string): Promise<PaymentStatus>;
}

/**
 * Sandbox adapter — for development and testing.
 * createCheckout returns a synthetic providerCheckoutId.
 * getPaymentStatus always reports paid=true.
 *
 * In production, swap this for a real provider adapter (e.g. StripeAdapter).
 */
export class SandboxPaymentAdapter implements PaymentAdapter {
  async createCheckout(
    purchaseId: string,
    amount: number,
    currency: string,
    _description: string,
  ): Promise<PaymentCheckout> {
    const providerCheckoutId = `sandbox_${purchaseId}`;
    const paymentInfo = `sandbox:paid?purchaseId=${purchaseId}&amount=${amount}&currency=${currency}`;
    return { providerCheckoutId, paymentInfo };
  }

  async getPaymentStatus(_providerCheckoutId: string): Promise<PaymentStatus> {
    // Sandbox: always paid
    return { paid: true, status: 'paid' };
  }
}
