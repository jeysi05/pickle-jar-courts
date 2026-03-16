import { useState } from 'react';

export default function CourtCard({ courtName, image, cart, currentSelection, currentDuration, startTimeOffset = 0, onSlotSelect, courtId, isCoachMode, existingBookings = [] }) {
  
  const getLocalTodayString = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalTodayString());

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i < 24; i += 0.5) slots.push(i);
    return slots;
  };

  const formatTime = (time) => {
    const hour = Math.floor(time);
    const minutes = time % 1 === 0 ? "00" : "30";
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isSlotPast = (timeVal) => {
    const today = new Date();
    const [year, month, day] = selectedDate.split('-');
    const selected = new Date(year, month - 1, day);
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (selected > todayDateOnly) return false; 
    if (selected < todayDateOnly) return true;  
    
    const currentHour = today.getHours();
    const currentTimeVal = currentHour + (today.getMinutes() / 60);
    return timeVal <= currentTimeVal;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col group hover:border-lime-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
        
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isCoachMode ? 'via-yellow-500' : 'via-lime-500'} to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>

        <div className="h-40 overflow-hidden relative bg-zinc-900">
          <img src={image} alt={courtName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-90 grayscale group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent"></div>
          <div className="absolute bottom-3 left-4">
            <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter drop-shadow-lg">{courtName}</h3>
          </div>
        </div>

        <div className="p-4 flex-grow flex flex-col gap-4">
            <input 
                type="date" 
                value={selectedDate}
                min={getLocalTodayString()} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase focus:border-lime-500 outline-none hover:bg-zinc-950 transition-colors"
            />

            <div className="grid grid-cols-2 gap-2 h-64 overflow-y-auto custom-scrollbar pr-1">
                {generateTimeSlots().map((time) => {
                    const isPast = isSlotPast(time);
                    
                    // 1. Check local cart
                    const cartItem = cart.find(item => 
                        item.court === courtId && 
                        item.date === selectedDate &&
                        time >= item.time && time < (item.time + item.duration)
                    );

                    // 2. Check DB
                    const dbItem = existingBookings.find(item => {
                        if (item.court !== courtId || item.date !== selectedDate || item.status === 'cancelled') return false;
                        const itemStart = parseFloat(item.timeSlot);
                        const itemEnd = itemStart + parseFloat(item.duration);
                        return time >= itemStart && time < itemEnd;
                    });

                    const occupyingItem = cartItem || dbItem;
                    let isOccupiedStart = false;
                    let isOccupiedTrail = false;

                    // BUG FIX: Only flag the exact start time as "Occupied" (green), make the rest dimmed.
                    if (occupyingItem) {
                        const itemStart = occupyingItem.time !== undefined ? occupyingItem.time : parseFloat(occupyingItem.timeSlot);
                        if (time === itemStart) {
                            isOccupiedStart = true;
                        } else {
                            isOccupiedTrail = true;
                        }
                    }

                    // Strict preview highlight for ONLY the clicked start time
                    let isPreview = false;
                    if (currentSelection?.court === courtId && currentSelection?.date === selectedDate) {
                        if (time === currentSelection.time) {
                            isPreview = true;
                        }
                    }

                    let btnClass = 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-white/20'; 
                    
                    if (isPast) {
                        btnClass = 'bg-zinc-950 text-zinc-700 border-transparent cursor-not-allowed opacity-50';
                    } else if (isOccupiedStart) {
                        btnClass = isCoachMode 
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 cursor-not-allowed'
                            : 'bg-lime-500/10 border-lime-500/30 text-lime-400 cursor-not-allowed';
                    } else if (isOccupiedTrail) {
                        // Dimmed out slots for the remainder of a long booking
                        btnClass = 'bg-zinc-900/50 text-zinc-600 border-transparent cursor-not-allowed opacity-40';
                    } else if (isPreview) {
                        btnClass = 'bg-white text-black border-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10'; 
                    }

                    return (
                        <button
                            key={time}
                            disabled={isPast || isOccupiedStart || isOccupiedTrail} 
                            onClick={() => onSlotSelect(courtId, time, selectedDate)}
                            className={`relative py-3 rounded-xl text-[10px] font-black transition-all border flex flex-col items-center justify-center ${btnClass}`}
                        >
                            <span>{formatTime(time)}</span>
                            {isOccupiedStart && <span className="text-[7px] uppercase mt-0.5">Occupied</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
} 