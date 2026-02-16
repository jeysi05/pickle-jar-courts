import { useState } from 'react';

export default function CourtCard({ courtName, image, cart, currentSelection, currentDuration, onSlotSelect, courtId, isCoachMode }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i < 24; i += 0.5) slots.push(i);
    return slots;
  };

  const formatTime = (time) => {
    const hour = Math.floor(time);
    const minutes = time % 1 === 0 ? "00" : "30";
    const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 || hour === 24 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isSlotPast = (timeVal) => {
    const today = new Date();
    const selected = new Date(selectedDate);
    if (today.toDateString() !== selected.toDateString()) return false; 
    const currentHour = today.getHours();
    const currentTimeVal = currentHour + (today.getMinutes() / 60);
    return timeVal <= currentTimeVal;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col group hover:border-lime-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
        
        {/* TOP GRADIENT LINE */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isCoachMode ? 'via-yellow-500' : 'via-lime-500'} to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>

        {/* IMAGE */}
        <div className="h-40 overflow-hidden relative bg-zinc-900">
          <img src={image} alt={courtName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-90 grayscale group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent"></div>
          <div className="absolute bottom-3 left-4">
            <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter drop-shadow-lg">{courtName}</h3>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="p-4 flex-grow flex flex-col gap-4">
            <input 
                type="date" 
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase focus:border-lime-500 outline-none hover:bg-zinc-950 transition-colors"
            />

            {/* GRID - 3 Columns with Visible Buttons */}
            <div className="grid grid-cols-3 gap-2 h-64 overflow-y-auto custom-scrollbar pr-1">
                {generateTimeSlots().map((time) => {
                    const isPast = isSlotPast(time);
                    
                    const inCart = cart.find(item => 
                        item.court === courtId && 
                        item.date === selectedDate &&
                        time >= item.time && time < (item.time + item.duration)
                    );

                    let isPreview = false;
                    if (currentSelection?.court === courtId && currentSelection?.date === selectedDate) {
                        if (time >= currentSelection.time && time < (currentSelection.time + currentDuration)) {
                            isPreview = true;
                        }
                    }

                    // --- STYLING LOGIC (BRIGHTER BUTTONS) ---
                    // Default: Dark Gray background (800) with Light border
                    let btnClass = 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-white/20'; 
                    
                    if (isPast) {
                        // Past: Very dark, low opacity
                        btnClass = 'bg-zinc-950 text-zinc-700 border-transparent cursor-not-allowed opacity-50';
                    } else if (inCart) {
                        // Booked: Neon Green/Yellow
                        btnClass = isCoachMode 
                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)] cursor-not-allowed'
                            : 'bg-lime-500/20 border-lime-500/50 text-lime-400 shadow-[0_0_10px_rgba(132,204,22,0.1)] cursor-not-allowed';
                    } else if (isPreview) {
                        // Selecting: White Pulse
                        btnClass = 'bg-white text-black border-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10'; 
                    }

                    return (
                        <button
                            key={time}
                            disabled={isPast || inCart} 
                            onClick={() => onSlotSelect(courtId, time, selectedDate)}
                            className={`
                                relative py-2.5 rounded-lg text-[10px] font-bold transition-all border flex flex-col items-center justify-center overflow-hidden
                                ${btnClass}
                            `}
                        >
                            <span className="relative z-10">{formatTime(time)}</span>
                            {inCart && <span className="text-[7px] uppercase mt-0.5 opacity-80">Booked</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
}