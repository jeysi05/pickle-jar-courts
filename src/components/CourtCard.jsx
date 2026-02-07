import { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';
import { db } from '../firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { Calendar, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 NN", 
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", 
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", 
  "11:00 PM", "12:00 MN"
];

// --- PRICING CONFIGURATION ---
const RATES = {
  STANDARD: 300, // Regular Price
  COACH: 250,    // Coach Price
  PROMO_BUNDLE: 1000, // 3 Slots for 1000 (Regular only)
};

export default function CourtCard({ courtName, image, isCoachMode }) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlots, setSelectedSlots] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookedTimes, setBookedTimes] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      where("court", "==", courtName),
      where("date", "==", selectedDate)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taken = snapshot.docs.map(doc => doc.data().timeSlot);
      setBookedTimes(taken);
    });
    return () => unsubscribe();
  }, [courtName, selectedDate]);

  const toggleSlot = (slot) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  // --- THE PRICING ENGINE ---
  const calculateTotal = () => {
    const count = selectedSlots.length;
    
    // 1. IF COACH: Flat rate of 250 per hour
    if (isCoachMode) {
      return count * RATES.COACH;
    }

    // 2. IF REGULAR: Check for "3 for 1000" Promo
    // (Logic: If exactly 3 slots, 1000. Otherwise standard rate)
    if (count === 3) {
      return RATES.PROMO_BUNDLE;
    }

    // 3. STANDARD CALCULATION
    return count * RATES.STANDARD;
  };

  const totalPrice = calculateTotal();

  return (
    <div className={`relative w-full max-w-sm mx-auto bg-zinc-900 border rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 group hover:-translate-y-1 ${isCoachMode ? 'border-yellow-500/30 hover:border-yellow-400' : 'border-zinc-800 hover:border-lime-500/50'}`}>
      
      {/* 1. Header Image */}
      <div className="h-44 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent z-10" />
        <img src={image} alt={courtName} className="w-full h-full object-cover"/>
        
        {/* Coach Badge on Card */}
        {isCoachMode && (
          <div className="absolute top-3 right-3 z-20 bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg">
            Coach Rate
          </div>
        )}

        <div className="absolute bottom-3 left-5 z-20">
          <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
            {courtName}
            <CheckCircle2 className={`w-5 h-5 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} />
          </h2>
        </div>
      </div>

      {/* 2. Date Selection */}
      <div className="px-5 pt-4">
        <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
          <Calendar className={`w-3 h-3 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} /> Select Date
        </label>
        <div className="relative">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => { 
              setSelectedDate(e.target.value); 
              setSelectedSlots([]); 
            }}
            style={{ colorScheme: 'dark' }} 
            className={`w-full bg-zinc-800 border text-white text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all cursor-pointer hover:bg-zinc-700 ${isCoachMode ? 'border-zinc-700 focus:border-yellow-400 focus:ring-yellow-400' : 'border-zinc-700 focus:border-lime-500 focus:ring-lime-500'}`}
          />
        </div>
      </div>

      {/* 3. Time Slots Grid */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Clock className={`w-3 h-3 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} /> Available Slots
          </label>
          
          {selectedSlots.length > 0 && (
            <span className={`text-[10px] font-mono font-bold animate-pulse ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
              {selectedSlots.length} Selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          {TIME_SLOTS.map((slot, index) => {
            const isTaken = bookedTimes.includes(slot);
            const isSelected = selectedSlots.includes(slot);

            return (
              <button
                key={index}
                disabled={isTaken}
                onClick={() => toggleSlot(slot)}
                className={`
                  relative py-2 px-1 rounded-lg text-[10px] font-bold transition-all border
                  ${isTaken 
                    ? 'bg-zinc-900 text-zinc-700 border-zinc-800 line-through cursor-not-allowed' 
                    : isSelected
                      ? isCoachMode 
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105 z-10'
                        : 'bg-lime-400 text-black border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.5)] scale-105 z-10'
                      : `bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700 ${isCoachMode ? 'hover:border-yellow-400' : 'hover:border-lime-400'}`
                  }
                `}
              >
                {slot.replace(" ", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Footer */}
      <div className="p-5 mt-auto border-t border-white/5 bg-zinc-900/50">
        <button 
          disabled={selectedSlots.length === 0}
          onClick={() => setIsModalOpen(true)}
          className={`
            w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300
            flex items-center justify-center gap-2
            ${selectedSlots.length > 0
              ? isCoachMode 
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 hover:shadow-[0_0_20px_-5px_rgba(250,204,21,0.6)] transform active:scale-[0.98]'
                : 'bg-lime-400 text-black hover:bg-lime-300 hover:shadow-[0_0_20px_-5px_rgba(163,230,53,0.6)] transform active:scale-[0.98]' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            }
          `}
        >
          {selectedSlots.length > 0 ? (
            <div className="flex items-center justify-between w-full px-2">
               <span className="flex flex-col text-left leading-none">
                 <span>CONFIRM</span>
                 {isCoachMode && <span className="text-[9px] opacity-70">COACH RATE APPLIED</span>}
                 {!isCoachMode && selectedSlots.length === 3 && <span className="text-[9px] opacity-70">PROMO APPLIED</span>}
               </span>
               <div className="flex items-center gap-1">
                 <span className="text-lg font-black">₱{totalPrice}</span>
                 <ChevronRight className="w-4 h-4" />
               </div>
            </div>
          ) : (
            "Select Time"
          )}
        </button>
      </div>

      <PaymentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        bookingData={{ 
          court: courtName, 
          date: selectedDate, 
          slots: selectedSlots, 
          totalPrice: totalPrice 
        }}
      />
    </div>
  );
}