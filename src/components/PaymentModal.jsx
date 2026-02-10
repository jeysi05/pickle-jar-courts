import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Copy, Check } from 'lucide-react';
import emailjs from '@emailjs/browser';

// --- EMAILJS KEYS ---
const SERVICE_ID = "service_2kiok8v";
const TEMPLATE_ID = "template_qelnx59";
const PUBLIC_KEY = "V6CJEroyQL2AHs8CS";

export default function PaymentModal({ isOpen, onClose, bookingData }) {

  /* =======================
     STATE (MUST BE FIRST)
  ======================= */
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  /* =======================
     LOCK BACKGROUND SCROLL
  ======================= */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  /* =======================
     EXIT SAFELY
  ======================= */
  if (!isOpen) return null;

  /* =======================
     COPY NUMBER
  ======================= */
  const handleCopyNumber = () => {
    navigator.clipboard.writeText("09175917475");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* =======================
     SUBMIT PAYMENT
  ======================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bookingData || !bookingData.slots?.length) {
      alert("Invalid booking data.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save bookings
      await Promise.all(
        bookingData.slots.map(slot =>
          addDoc(collection(db, "bookings"), {
            court: bookingData.court,
            date: bookingData.date,
            timeSlot: slot,
            customerName: name,
            customerContact: contact,
            paymentProof: "Pending Verification",
            status: "PENDING",
            createdAt: new Date(),
            totalPrice: bookingData.totalPrice
          })
        )
      );

      // Email admin
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_name: "Pickle Jar Admin",
          customer_name: name,
          customer_contact: contact,
          court: bookingData.court,
          date: bookingData.date,
          time: bookingData.slots.join(", "),
          total_price: bookingData.totalPrice
        },
        PUBLIC_KEY
      );

      alert("Success! Payment verification sent.");
      setName('');
      setContact('');
      onClose();

    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =======================
     MODAL
  ======================= */
  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">

      <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative max-h-[90vh] overflow-y-auto z-[10000]">

        {/* HEADER */}
        <div className="bg-zinc-950/50 p-6 flex justify-between items-center border-b border-white/5 sticky top-0 backdrop-blur-md z-50">
          <div>
            <h3 className="font-black text-xl text-white uppercase tracking-wide">Payment</h3>
            <p className="text-zinc-500 text-xs mt-1">Scan QR to secure your slot</p>
          </div>
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full text-zinc-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* QR */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-2 bg-white rounded-2xl">
              <img src="/gcash-qr.jpg" alt="GCash QR" className="w-48 h-48 rounded-xl" />
            </div>

            <button
              type="button"
              onClick={handleCopyNumber}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-zinc-700 transition"
            >
              <span className="text-white font-mono font-bold text-lg">0917 591 7475</span>
              {copied ? <Check size={16} className="text-lime-400" /> : <Copy size={16} />}
            </button>

            <p className="text-zinc-500 text-xs font-bold">
              PJC GCASH (NORMAN PATRICK S.)
            </p>
          </div>

          {/* SUMMARY */}
          <div className="border-t border-white/5 pt-4 space-y-4">
            <div className="flex justify-between bg-lime-400/10 p-4 rounded-xl border border-lime-400/20">
              <span className="text-lime-400 text-xs font-bold uppercase">Total to Pay</span>
              <span className="text-white font-black text-2xl">
                ₱{bookingData.totalPrice}
              </span>
            </div>

            {/* INPUTS */}
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
            />

            <input
              required
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Mobile Number"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl uppercase tracking-widest disabled:opacity-50"
          >
            {isSubmitting ? "Verifying..." : "I Have Paid & Confirm"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
