import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore'; 
import { X, CheckCircle2 } from 'lucide-react'; // Optional: Use icons if available

export default function PaymentModal({ isOpen, onClose, bookingData }) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // LOOPS through all selected slots and creates a booking for EACH one.
      // We use Promise.all to ensure they all save at the same time.
      const bookingPromises = bookingData.slots.map(slot => 
        addDoc(collection(db, "bookings"), {
          court: bookingData.court,
          date: bookingData.date,
          timeSlot: slot, // Save the specific hour
          customerName: name,
          paymentProof: "Demo Mode - No Image",
          status: "PENDING",
          createdAt: new Date(),
          batchId: Date.now().toString() // Optional: Groups these bookings together
        })
      );

      await Promise.all(bookingPromises);

      alert(`Success! ${bookingData.slots.length} slots reserved.`);
      onClose(); 
      setName(""); // Reset form
      
    } catch (error) {
      console.error("Error booking:", error);
      alert("Something went wrong. Check console.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      
      {/* Modal Container: Zinc Dark Theme */}
      <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 relative">
        
        {/* Header */}
        <div className="bg-zinc-950/50 p-6 flex justify-between items-center border-b border-white/5">
          <div>
            <h3 className="font-black text-xl text-white tracking-wide uppercase font-display">Confirm Booking</h3>
            <p className="text-zinc-500 text-xs mt-1">Please review your reservation details</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Summary Box */}
          <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden">
            {/* Decoration Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -z-10"></div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest">Court</span>
              <span className="text-white font-bold tracking-tight">{bookingData.court}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest">Date</span>
              <span className="text-white font-bold tracking-tight">{bookingData.date}</span>
            </div>

            {/* List of Times */}
            <div className="flex justify-between text-sm items-start">
              <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest mt-1">Times</span>
              <div className="text-right flex flex-col items-end">
                {bookingData.slots.map((slot, index) => (
                  <span key={index} className="text-zinc-300 font-medium text-xs bg-zinc-800 px-2 py-0.5 rounded mb-1 ml-1 inline-block">
                    {slot}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest">Total Amount</span>
              <span className="text-lime-400 font-black text-2xl tracking-tight">₱{bookingData.totalPrice}</span>
            </div>
          </div>

          {/* Input Field */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input 
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none transition-all font-bold tracking-wide"
              placeholder="ENTER YOUR NAME"
            />
          </div>

          {/* Action Button */}
          <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.5)] transform active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : (
              "Confirm & Pay"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}