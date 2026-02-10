import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore'; 
import { X } from 'lucide-react'; 
import emailjs from '@emailjs/browser'; 

// --- YOUR KEYS ---
const SERVICE_ID = "service_2kiok8v"; 
const TEMPLATE_ID = "template_qelnx59"; 
const PUBLIC_KEY = "V6CJEroyQL2AHs8CS"; 

export default function PaymentModal({ isOpen, onClose, bookingData }) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [contact, setContact] = useState(''); // NEW STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Save to Firebase (Includes Contact Info)
      const bookingPromises = bookingData.slots.map(slot => 
        addDoc(collection(db, "bookings"), {
          court: bookingData.court,
          date: bookingData.date,
          timeSlot: slot, 
          customerName: name,
          customerContact: contact, // SAVE TO DB
          paymentProof: "Demo Mode - No Image",
          status: "PENDING",
          createdAt: new Date(),
          totalPrice: bookingData.totalPrice
        })
      );

      await Promise.all(bookingPromises);

      // 2. SEND EMAIL TO OWNER
      const templateParams = {
        to_name: "Pickle Jar Admin", // Greeting for the owner
        customer_name: name,
        customer_contact: contact, // SEND IN EMAIL
        court: bookingData.court,
        date: bookingData.date,
        time: bookingData.slots.join(", "), 
        total_price: bookingData.totalPrice
      };

      emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
        .then((response) => {
           console.log('SUCCESS!', response.status, response.text);
        }, (err) => {
           console.log('FAILED...', err);
        });

      alert(`Success! Request sent. Admin has been notified.`);
      onClose(); 
      setName(""); 
      setContact(""); // Clear contact field
      
    } catch (error) {
      console.error("Error booking:", error);
      alert("Something went wrong. Check console.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 relative">
        
        {/* HEADER */}
        <div className="bg-zinc-950/50 p-6 flex justify-between items-center border-b border-white/5">
          <div>
            <h3 className="font-black text-xl text-white tracking-wide uppercase font-display">Confirm Booking</h3>
            <p className="text-zinc-500 text-xs mt-1">Please review your reservation details</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* SUMMARY BOX */}
          <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden mb-4">
             <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -z-10"></div>
             <div className="flex justify-between text-sm">
               <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest">Court</span>
               <span className="text-white font-bold">{bookingData.court}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest">Date</span>
               <span className="text-white font-bold">{bookingData.date}</span>
             </div>
             <div className="pt-2 border-t border-white/10 flex justify-between items-center">
               <span className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest">Total</span>
               <span className="text-lime-400 font-black text-xl">₱{bookingData.totalPrice}</span>
             </div>
          </div>

          {/* NAME INPUT */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input 
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none transition-all font-bold tracking-wide"
              placeholder="Ex. Juan Dela Cruz"
            />
          </div>

          {/* NEW: CONTACT NUMBER INPUT */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
            <input 
              type="tel" required value={contact} onChange={(e) => setContact(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none transition-all font-bold tracking-wide"
              placeholder="Ex. 0917 123 4567"
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] mt-2"
          >
            {isSubmitting ? "Sending..." : "Confirm & Notify Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}