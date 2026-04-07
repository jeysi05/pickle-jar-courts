import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Copy, Check, ShoppingCart, AlertTriangle, Wallet } from 'lucide-react';
import emailjs from '@emailjs/browser';

const SERVICE_ID = "service_2kiok8v";
const TEMPLATE_ID = "template_qelnx59";
const PUBLIC_KEY = "V6CJEroyQL2AHs8CS";

export default function PaymentModal({ isOpen, onClose, cart, totalPrice }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [referenceNo, setReferenceNo] = useState(''); 
  const [paymentChannel, setPaymentChannel] = useState('GCash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const getQRCodeImage = () => {
    switch (paymentChannel) {
      case 'PayMaya': return '/maya-qr.jpg';
      case 'Chinabank': return '/chinabank-qr.jpg';
      default: return '/gcash-qr.jpg';
    }
  };

  const handleSubmit = async (e, paymentType = "PAID") => {
    e.preventDefault();

    if (!cart || cart.length === 0) return alert("Cart is empty.");
    if (!name.trim()) return alert("Please fill out your name.");

    // BUG FIX: Sanitize contact number (Remove spaces, parens, etc.)
    const cleanContact = contact.replace(/\D/g, ''); 
    if (cleanContact.length !== 11) {
        return alert("Please enter a valid 11-digit mobile number (e.g., 09171234567).");
    }

    if (paymentType === "PAID") {
        if (!referenceNo || referenceNo.length !== 6 || isNaN(referenceNo)) {
            return alert("Please enter exactly the LAST 6 DIGITS of your Reference Number.");
        }
    }

    setIsSubmitting(true);

    try {
      // We keep "PAY_LATER" as the internal DB status to avoid breaking the Admin Panel logic
      const initialStatus = paymentType === "PAY_LATER" ? "PAY_LATER" : "PENDING";

      await Promise.all(
        cart.map(item =>
          addDoc(collection(db, "bookings"), {
            court: item.court,
            date: item.date,
            timeSlot: `${item.time}:00`,
            duration: item.duration,
            price: item.price,
            customerName: name,
            customerContact: cleanContact, // Use sanitized number
            referenceNo: paymentType === "PAY_LATER" ? "N/A" : referenceNo, 
            paymentChannel: paymentType === "PAY_LATER" ? "N/A" : paymentChannel,
            paymentProof: paymentType === "PAY_LATER" ? "Pay-in-person Requested" : "Pending Verification",
            status: initialStatus, 
            createdAt: new Date(),
          })
        )
      );

      const bookingDetails = cart.map(item => 
        `Court ${item.court} on ${item.date} @ ${item.time}:00 (${item.duration}hrs)`
      ).join('\n');

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
          to_name: "Pickle Jar Admin",
          customer_name: name,
          customer_contact: cleanContact,
          message: bookingDetails, 
          total_price: totalPrice
        }, PUBLIC_KEY);

      const successMsg = paymentType === "PAY_LATER" 
        ? "Success! Your Pay-in-person request has been sent for approval." 
        : "Success! Your booking request has been sent.";
      
      alert(successMsg);
      onClose();
      window.location.reload(); 
    } catch (error) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-zinc-950/80 p-6 flex justify-between items-center border-b border-white/5 sticky top-0 backdrop-blur-md z-10">
          <div>
            <h3 className="font-black text-xl text-white uppercase tracking-wide italic">Checkout</h3>
            <p className="text-zinc-500 text-xs mt-1">Confirm details to book</p>
          </div>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full text-zinc-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center space-y-4 bg-zinc-800/30 p-4 rounded-2xl border border-white/5">
            <div className="w-full flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2">
                <Wallet size={16} className="text-lime-400" />
                <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} className="w-full bg-transparent text-white text-sm font-bold outline-none cursor-pointer">
                    <option value="GCash" className="bg-zinc-900 text-white">GCash</option>
                    <option value="PayMaya" className="bg-zinc-900 text-white">PayMaya</option>
                    <option value="Chinabank" className="bg-zinc-900 text-white">Chinabank (InstaPay)</option>
                </select>
            </div>

            <div className="p-3 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <img src={getQRCodeImage()} alt={`${paymentChannel} QR`} className="w-64 h-64 rounded-lg object-contain" />
            </div>

            <button type="button" onClick={handleCopyNumber} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex justify-between items-center hover:bg-zinc-700 transition group">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest group-hover:text-white">Copy Number</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold">0917 591 7475</span>
                {copied ? <Check size={16} className="text-lime-400" /> : <Copy size={16} className="text-zinc-500" />}
              </div>
            </button>
          </div>

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
                <span className="text-white font-bold uppercase">Total Due Now</span>
                <span className="text-2xl font-black text-lime-400">₱{totalPrice}</span>
             </div>
          </div>

          <div className="space-y-3 pt-2">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition" />
            <input required value={contact} onChange={e => setContact(e.target.value)} placeholder="Mobile Number (e.g., 09171234567)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition" />
            <input value={referenceNo} onChange={e => setReferenceNo(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={`${paymentChannel} Ref No. (LAST 6 DIGITS)`} maxLength={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-lime-500 outline-none transition" />
          </div>

          <div className="bg-zinc-950/50 border border-yellow-500/20 rounded-xl p-4 text-[10px] text-zinc-400 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-3 text-yellow-500 font-bold uppercase tracking-widest">
                  <AlertTriangle size={12} /> Rate & Payment Policy
              </div>
              
              <ul className="space-y-2 list-none">
                  <li className="flex gap-2">
                      <span className="text-lime-400 font-bold">●</span>
                      <p><strong className="text-white">Rate Policy:</strong> Discounted Promo Rates (₱200/hr or ₱250/hr) and Bundles are <span className="text-lime-400 uppercase font-black">exclusive to Online Payments</span>.</p>
                  </li>
                  <li className="flex gap-2">
                      <span className="text-zinc-500">●</span>
                      <p><strong className="text-white">Pay-in-Person:</strong> Choosing to "Pay-in-person" will be charged at the <span className="text-white font-bold underline">Regular Rate (₱380/hr or ₱1000/3hrs)</span>.</p>
                  </li>
                  <li className="flex gap-2">
                      <span className="text-zinc-500">●</span>
                      <p><strong className="text-white">Guarantee:</strong> "Pay-in-person" requests require manual approval and do not guarantee your slot until a confirmation SMS is received.</p>
                  </li>
                  <li className="flex gap-2">
                      <span className="text-zinc-500">●</span>
                      <p><strong className="text-white">Refunds:</strong> Payments are non-refundable except in cases where Pickle Jar Courts is liable.</p>
                  </li>
                  <li className="flex gap-2">
                      <span className="text-zinc-500">●</span>
                      <p><strong className="text-white">Rescheduling:</strong> Cancellations are not permitted. Rescheduling requires <span className="text-white font-bold">24-hour notice</span>. Failure to notify results in forfeiture of payment.</p>
                  </li>
              </ul>
              
              <p className="mt-3 pt-2 border-t border-white/5 font-bold text-zinc-300 italic text-center">
                  A confirmation SMS will be sent once your order is approved.
              </p>
          </div>

          <div className="flex gap-3">
              <button type="button" onClick={(e) => handleSubmit(e, "PAY_LATER")} disabled={isSubmitting} className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl text-[9px] uppercase tracking-widest disabled:opacity-50 transition-colors border border-zinc-700">
                Pay-in-Person
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, "PAID")} disabled={isSubmitting} className="w-2/3 bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl text-sm uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-lg shadow-lime-400/20">
                {isSubmitting ? "..." : "Confirm Online Payment"}
              </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}