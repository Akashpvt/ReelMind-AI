"use client";

import { useState } from "react";
import { type PaidPlanId } from "@/lib/payments/razorpay-plans";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type RazorpayUpgradeButtonProps = {
  planId: PaidPlanId;
  label: string;
  organizationId: string;
  userEmail?: string | null;
  className?: string;
};

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayUpgradeButton({
  planId,
  label,
  organizationId,
  userEmail,
  className,
}: RazorpayUpgradeButtonProps) {
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const startPayment = async () => {
    setStatus("creating");
    setMessage(null);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setStatus("error");
      setMessage("Razorpay Checkout could not be loaded.");
      return;
    }

    const orderResponse = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, organizationId }),
    });
    const orderPayload = (await orderResponse.json()) as {
      success?: boolean;
      keyId?: string;
      error?: string;
      order?: { id: string; amount: number; currency: string };
      plan?: { name: string; credits: number; description: string };
    };

    if (!orderResponse.ok || !orderPayload.success || !orderPayload.keyId || !orderPayload.order || !orderPayload.plan) {
      setStatus("error");
      setMessage(orderPayload.error ?? "Unable to create payment order.");
      return;
    }

    setStatus("paying");
    const checkout = new window.Razorpay({
      key: orderPayload.keyId,
      amount: orderPayload.order.amount,
      currency: orderPayload.order.currency,
      name: "ReelMind AI",
      description: `${orderPayload.plan.name} plan - ${orderPayload.plan.credits} credits`,
      order_id: orderPayload.order.id,
      prefill: {
        email: userEmail ?? undefined,
      },
      notes: {
        plan_id: planId,
      },
      theme: {
        color: "#12B5FF",
      },
      handler: async (paymentResponse) => {
        setStatus("verifying");
        const verifyResponse = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });
        const verifyPayload = (await verifyResponse.json()) as {
          success?: boolean;
          error?: string;
          creditsAdded?: number;
        };

        if (!verifyResponse.ok || !verifyPayload.success) {
          setStatus("error");
          setMessage(verifyPayload.error ?? "Payment verification failed.");
          return;
        }

        setStatus("success");
        setMessage(`${verifyPayload.creditsAdded ?? orderPayload.plan?.credits ?? 0} credits added. Refreshing billing data...`);
        window.setTimeout(() => window.location.reload(), 900);
      },
      modal: {
        ondismiss: () => {
          setStatus("idle");
          setMessage("Payment window closed before completion.");
        },
      },
    });

    checkout.open();
  };

  return (
    <div>
      <button
        type="button"
        onClick={startPayment}
        disabled={status === "creating" || status === "paying" || status === "verifying"}
        className={className ?? "rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:cursor-not-allowed disabled:opacity-60"}
      >
        {status === "creating" ? "Creating order..." : status === "verifying" ? "Verifying..." : label}
      </button>
      {message ? (
        <p className={`mt-2 text-xs leading-5 ${status === "success" ? "text-[#86EFAC]" : status === "error" ? "text-[#FDA4AF]" : "text-mist"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
