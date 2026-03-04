import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Copy, Check, ShoppingCart, AlertTriangle } from 'lucide-react';
import emailjs from '@emailjs/browser';

// --- EMAILJS KEYS ---
const SERVICE_ID = "service_2kiok8v";
const TEMPLATE_ID = "template_qelnx59";
const PUBLIC_KEY = "V6CJEroyQL2AHs8CS";

// --- SEMAPHORE SMS KEY ---
const SEMAPHORE_API_KEY = "29a1827bca8ebef96d110e5920dea863"; 

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

  const handleSubmit = async (e, paymentType = "PAID") => {
    e.preventDefault();

    if (!cart || cart.length === 0) {
      alert("Cart is empty.");
      return;
    }
    
    if (!name.trim() || !contact.trim()) {
        alert("Please fill out your name and contact number.");
        return;
    }

    setIsSubmitting(true);

    try {
      const initialStatus = paymentType === "PAY_LATER" ? "PAY_LATER" : "PENDING";

      // 1. Save EACH cart item as a separate booking in Firebase
      await Promise.all(
        cart.map(item =>
          addDoc(collection(db, "bookings"), {
            court: item.court,
            date: item.date,
            timeSlot: `${item.time}:00`,
            duration: item.duration,
            price: item.price,
            customerName: name,
            customerContact: contact,
            paymentProof: paymentType === "PAY_LATER" ? "Pay Later Requested" : "Pending Verification",
            status: initialStatus, 
            createdAt: new Date(),
          })
        )
      );

      // 2. Prepare Email Summary
      const bookingDetails = cart.map(item => 
        `Court ${item.court} on ${item.date} @ ${item.time}:00 (${item.duration}hrs)`
      ).join('\n');

      // 3. Send Email to Admin
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_name: "Pickle Jar Admin",
          customer_name: name,
          customer_contact: contact,
          message: bookingDetails, 
          total_price: totalPrice
        },
        PUBLIC_KEY
      );

      // --- 4. Send SMS to Customer via Semaphore ---
      const smsMessage = paymentType === "PAY_LATER" 
        ? `Hi ${name}, your Pay Later request at Pickle Jar Courts is pending approval. Total: P${totalPrice}. We will update you soon!`
        : `Hi ${name}, your booking at Pickle Jar Courts is received and pending verification. Total: P${totalPrice}. Thank you!`;

      const smsData = new URLSearchParams();
      smsData.append('apikey', SEMAPHORE_API_KEY);
      smsData.append('number', contact);
      smsData.append('message', smsMessage);

      try {
        await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: smsData.toString()
        });
      } catch (smsError) {
        console.error("SMS Delivery Failed:", smsError);
      }
      // --------------------------------------------------

      const successMsg = paymentType === "PAY_LATER" 
        ? "Success! Your Pay Later request has been sent for approval." 
        : "Success! Your booking request has been sent.";
      
      alert(successMsg);
      setName('');
      setContact('');
      onClose();
      window.location.reload(); 

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

        <form className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

          {/* QR SECTION */}
          <div className="flex flex-col items-center space-y-4 bg-zinc-800/30 p-4 rounded-2xl border border-white/5">
            <div className="p-2 bg-white rounded-xl">
              <img src="/gcash-qr.jpg" alt="GCash QR" className="w-40 h-40 rounded-lg object-contain" />
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
                        <span className="text-zinc-300 flex flex-col">
                            <span>Court {item.court} <span className="text-zinc-500 text-xs">({item.duration}h)</span></span>
                            <span className="text-lime-400/80 text-[10px]">{item.date} @ {item.time}:00</span>
                        </span>
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
              placeholder="Mobile Number (e.g., 09171234567)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition"
            />
          </div>

          {/* DISCLAIMER TEXT */}
          <div className="bg-zinc-950/50 border border-yellow-500/20 rounded-xl p-4 text-[10px] text-zinc-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold uppercase tracking-widest">
                <AlertTriangle size={12} /> Booking & Payment Disclaimer
            </div>
            <p className="mb-2">By completing your reservation, you agree to the following terms:</p>
            <ul className="list-disc pl-4 space-y-1 mb-2">
                <li>Payments are non-refundable except in cases where Pickle Jar Courts is liable or requests for cancellations.</li>
                <li>Any changes to your booking must be requested at least 24 hours prior to the scheduled booking time.</li>
                <li>"Pay later" bookings are subject to approval and does not guarantee your reservation.</li>
                <li>Cancellations are not permitted. However, bookings may be rescheduled, subject to availability, provided the request is made at least 24 hours in advance.</li>
            </ul>
            <p>Failure to notify us within the required time frame will result in forfeiture of the reservation and payment.</p>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "PAY_LATER")}
                disabled={isSubmitting}
                className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 transition-colors border border-zinc-700"
              >
                Pay Later
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "PAID")}
                disabled={isSubmitting}
                className="w-2/3 bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl text-sm uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-lg shadow-lime-400/20"
              >
                {isSubmitting ? "..." : "Confirm Payment"}
              </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}