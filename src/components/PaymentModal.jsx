import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Copy, Check, ShoppingCart } from 'lucide-react';
import emailjs from '@emailjs/browser';

// --- EMAILJS KEYS ---
const SERVICE_ID = "service_2kiok8v";
const TEMPLATE_ID = "template_qelnx59";
const PUBLIC_KEY = "V6CJEroyQL2AHs8CS";

export default function PaymentModal({ isOpen, onClose, cart, totalPrice }) {

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lock Scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen && !cart) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("09175917475");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cart || cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save EACH cart item as a separate booking in Firebase
      await Promise.all(
        cart.map(item =>
          addDoc(collection(db, "bookings"), {
            court: item.court,
            date: item.date,
            timeSlot: `${item.time}:00`, // Saving as string "14:00"
            duration: item.duration,
            price: item.price,
            customerName: name,
            customerContact: contact,
            paymentProof: "Pending Verification",
            status: "PENDING", // Default status
            createdAt: new Date(),
          })
        )
      );

      // 2. Prepare Email Summary
      const bookingDetails = cart.map(item => 
        `Court ${item.court} on ${item.date} @ ${item.time}:00 (${item.duration}hrs)`
      ).join('\n');

      // 3. Send Email
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_name: "Pickle Jar Admin",
          customer_name: name,
          customer_contact: contact,
          message: bookingDetails, // We use 'message' or create a specific field in your template
          total_price: totalPrice
        },
        PUBLIC_KEY
      );

      alert("Success! Your booking request has been sent.");
      setName('');
      setContact('');
      onClose();
      window.location.reload(); // Reload to clear cart and refresh state

    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">

      <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative max-h-[90vh] overflow-y-auto flex flex-col">

        {/* HEADER */}
        <div className="bg-zinc-950/80 p-6 flex justify-between items-center border-b border-white/5 sticky top-0 backdrop-blur-md z-10">
          <div>
            <h3 className="font-black text-xl text-white uppercase tracking-wide italic">Confirm Payment</h3>
            <p className="text-zinc-500 text-xs mt-1">Scan QR via GCash</p>
          </div>
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full text-zinc-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

          {/* QR SECTION */}
          <div className="flex flex-col items-center space-y-4 bg-zinc-800/30 p-4 rounded-2xl border border-white/5">
            <div className="p-2 bg-white rounded-xl">
              <img src="/gcash-qr.jpg" alt="GCash QR" className="w-40 h-40 rounded-lg" />
            </div>

            <button
              type="button"
              onClick={handleCopyNumber}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex justify-between items-center hover:bg-zinc-700 transition group"
            >
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest group-hover:text-white">Copy Number</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold">0917 591 7475</span>
                {copied ? <Check size={16} className="text-lime-400" /> : <Copy size={16} className="text-zinc-500" />}
              </div>
            </button>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">PJC GCASH (NORMAN PATRICK S.)</p>
          </div>

          {/* CART SUMMARY */}
          <div className="space-y-2">
             <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShoppingCart size={14} /> Order Summary
             </h4>
             <div className="bg-zinc-950/50 rounded-xl border border-white/5 p-3 max-h-32 overflow-y-auto custom-scrollbar">
                {cart && cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                        <span className="text-zinc-300">Court {item.court} <span className="text-zinc-500 text-xs">({item.time}:00, {item.duration}h)</span></span>
                        <span className="text-lime-400 font-mono">₱{item.price}</span>
                    </div>
                ))}
             </div>
             <div className="flex justify-between items-center pt-2">
                <span className="text-white font-bold uppercase">Total Due</span>
                <span className="text-2xl font-black text-lime-400">₱{totalPrice}</span>
             </div>
          </div>

          {/* INPUTS */}
          <div className="space-y-3 pt-2">
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name (for booking ref)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition"
            />

            <input
              required
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Mobile Number"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-lg shadow-lime-400/20"
          >
            {isSubmitting ? "Processing..." : "Confirm Payment"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}