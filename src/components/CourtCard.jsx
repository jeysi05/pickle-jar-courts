import { useState } from 'react';
import { Calendar, Clock, Tag } from 'lucide-react'; 
import PaymentModal from './PaymentModal';

// FULL SCHEDULE: 8:00 AM - 11:00 PM
const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", 
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", 
  "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM"
];

export default function CourtCard({ courtName, image, isCoachMode }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- HELPER: GET HOUR INTEGER FROM SLOT ---
  const getSlotHour = (slot) => {
    let [time, modifier] = slot.split(' ');
    let [hours] = time.split(':');
    let slotHour = parseInt(hours);
    if (modifier === 'PM' && slotHour !== 12) slotHour += 12;
    if (modifier === 'AM' && slotHour === 12) slotHour = 0;
    return slotHour;
  };

  // --- LOGIC 1: PAST TIME CHECKER ---
  const isSlotPast = (slot) => {
    const today = new Date();
    const selected = new Date(selectedDate);
    // Check if selected date matches today
    const isToday = new Date(today.toDateString()).getTime() === new Date(selected.toDateString()).getTime();

    if (!isToday) return false; // Future dates are open

    const currentHour = today.getHours();
    return getSlotHour(slot) <= currentHour;
  };

  // --- LOGIC 2: PROMO CHECKER ---
  const checkPromo = (slot) => {
    // Rule 1: Must select at least 2 slots total to qualify for promo price
    // (We check total length inside calculation, this just checks day/time validity)
    
    const dateObj = new Date(selectedDate);
    const day = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = getSlotHour(slot);

    // Rule 2: Monday (1) to Thursday (4)
    const isPromoDay = day >= 1 && day <= 4;

    // Rule 3: 10 AM (10) to 8 PM (20)
    // The 7:00 PM slot covers 7-8 PM, so it IS included. 8:00 PM starts at 8, so excluded.
    const isPromoTime = hour >= 10 && hour < 20;

    return isPromoDay && isPromoTime;
  };

  const toggleSlot = (slot) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  // --- DYNAMIC PRICE CALCULATION ---
  const calculateTotal = () => {
    let total = 0;
    const isPromoLength = selectedSlots.length >= 2; // Rule: Must book 2+ hours for promo

    selectedSlots.forEach(slot => {
        if (isCoachMode) {
            total += 250; // Coach Rate
        } else if (isPromoLength && checkPromo(slot)) {
            total += 250; // PROMO RATE (If eligible)
        } else {
            total += 300; // STANDARD RATE (Updated to 300)
        }
    });
    return total;
  };

  const totalPrice = calculateTotal();
  
  // Check if ANY of the selected slots are getting the promo price (for UI badge)
  const isPromoActive = !isCoachMode && selectedSlots.length >= 2 && selectedSlots.some(s => checkPromo(s));

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300 relative group">
        
        {/* IMAGE AREA */}
        <div className="h-48 overflow-hidden relative">
          <img src={image} alt={courtName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
          <div className="absolute bottom-4 left-4">
            <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter">{courtName}</h3>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
               <span className={`w-2 h-2 rounded-full ${isCoachMode ? 'bg-yellow-400' : 'bg-lime-400'} animate-pulse`}></span>
               Available
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="p-5 flex-grow flex flex-col gap-4">
            
            {/* DATE PICKER */}
            <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Select Date
                </label>
                <input 
                    type="date" 
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]} 
                    onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlots([]); 
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-lime-500 transition-colors uppercase cursor-pointer hover:bg-zinc-900"
                />
            </div>

            {/* TIME GRID */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-1">
                        <Clock size={12} /> Select Time
                    </label>
                    {/* Visual Hint for Promo */}
                    {!isCoachMode && (
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase tracking-wider">
                            Mon-Thu Promo: ₱250
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => {
                        const isPast = isSlotPast(slot); 
                        const isSelected = selectedSlots.includes(slot);
                        
                        // Check if this specific slot WOULD be a promo slot (ignoring length requirement for the visual hint)
                        const isPromoCandidate = !isCoachMode && checkPromo(slot); 

                        return (
                            <button
                                key={slot}
                                disabled={isPast} 
                                onClick={() => toggleSlot(slot)}
                                className={`
                                    py-2 px-1 rounded-lg text-[10px] font-bold transition-all border relative overflow-hidden
                                    ${isSelected 
                                        ? (isCoachMode ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-lime-400 text-black border-lime-400') 
                                        : isPast 
                                            ? 'bg-zinc-800/30 text-zinc-700 border-transparent cursor-not-allowed opacity-50 decoration-zinc-700 line-through' 
                                            : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                                    }
                                `}
                            >
                                {slot.replace(":00", "")}
                                {/* Small Dot to indicate Promo Slot */}
                                {isPromoCandidate && !isPast && !isSelected && (
                                    <div className="absolute top-1 right-1 w-1 h-1 bg-blue-400 rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SUMMARY & BUTTON */}
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        Total
                        {isPromoActive && (
                            <span className="text-blue-400 flex items-center gap-1 animate-pulse">
                                <Tag size={10} /> PROMO APPLIED
                            </span>
                        )}
                    </p>
                    <p className={`text-2xl font-black ${isCoachMode ? 'text-yellow-400' : isPromoActive ? 'text-blue-400' : 'text-lime-400'}`}>
                        ₱{totalPrice}
                    </p>
                </div>
                <button 
                    disabled={selectedSlots.length === 0}
                    onClick={() => setIsModalOpen(true)}
                    className={`
                        px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all
                        ${selectedSlots.length === 0 
                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                            : (isCoachMode ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-lime-400 text-black hover:bg-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.3)]')
                        }
                    `}
                >
                    Book
                </button>
            </div>
        </div>

        {/* MODAL */}
        {isModalOpen && (
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
        )}
      </div>
    </>
  );
}