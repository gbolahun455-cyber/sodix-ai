import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function PaystackWallet({ onSuccess, onBack }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Verify payment after Paystack redirects back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference =
      params.get("reference") || params.get("trxref");

    if (reference) {
      verifyPayment(reference);
    }
  }, []);

  async function verifyPayment(reference) {
    setLoading(true);
    setMessage("Verifying your payment...");

    const { data, error } = await supabase.functions.invoke(
      "paystack-wallet",
      {
        body: {
          action: "verify",
          reference,
        },
      }
    );

    setLoading(false);

    if (error || data?.error || !data?.success) {
      setMessage(
        data?.error || error?.message || "Payment verification failed."
      );
      return;
    }

    // Remove payment reference from the browser URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    setMessage(
      data.already_credited
        ? "This payment has already been credited."
        : `₦${Number(data.amount).toLocaleString()} added to your wallet successfully!`
    );

    if (onSuccess) {
      await onSuccess();
    }
  }

  async function startPayment(e) {
    e.preventDefault();

    const naira = Number(amount);

    if (!Number.isSafeInteger(naira) || naira < 100) {
      setMessage("Minimum deposit is ₦100.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.functions.invoke(
      "paystack-wallet",
      {
        body: {
          action: "initialize",
          amount: naira,
          callback_url: window.location.origin + window.location.pathname,
        },
      }
    );

    setLoading(false);

    if (error || data?.error) {
      setMessage(
        data?.error || error?.message || "Could not start payment."
      );
      return;
    }

    if (!data?.authorization_url) {
      setMessage("Paystack did not return a payment link.");
      return;
    }

    window.location.href = data.authorization_url;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Fund Your Wallet</h2>

        <p style={styles.description}>
          Add money securely to your SODIQ TELECOM wallet using Paystack.
        </p>

        <form onSubmit={startPayment}>
          <label style={styles.label}>Amount (₦)</label>

          <input
            type="number"
            min="100"
            step="1"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={styles.input}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Please wait..." : "Pay with Paystack"}
          </button>
        </form>

        {message && (
          <p style={styles.message}>{message}</p>
        )}

        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
          disabled={loading}
        >
          Back
        </button>

        <p style={styles.secure}>
          Secure payment powered by Paystack.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    padding: "20px 12px",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: "450px",
    margin: "0 auto",
    padding: "24px",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
  },
  heading: {
    margin: "0 0 10px",
    color: "#123b2a",
    fontSize: "24px",
  },
  description: {
    color: "#666",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: "14px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "16px",
    marginBottom: "16px",
  },
  button: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    background: "#087443",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  message: {
    marginTop: "18px",
    padding: "12px",
    borderRadius: "8px",
    background: "#eef8f1",
    color: "#17643b",
    lineHeight: "1.5",
  },
  backButton: {
    marginTop: "16px",
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "#087443",
    cursor: "pointer",
  },
  secure: {
    marginTop: "18px",
    textAlign: "center",
    color: "#888",
    fontSize: "12px",
  },
};
