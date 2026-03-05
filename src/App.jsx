import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot } from 'firebase/firestore'; 
import CourtCard from './components/CourtCard';
import AdminDashboard from './components/AdminDashboard';
import PaymentModal from './components/PaymentModal'; 
import { MapPin, ShieldCheck, Lock, ShoppingCart, X, PlusCircle, Zap } from 'lucide-react';

// --- ADVANCED PRICING & BREAKDOWN ENGINE ---
const calculatePriceDetails = (startTime, duration, dateString, isCoach) => {
  let date = new Date();
  if (dateString) {
    const [year, month, day] = dateString.split('-');
    date = new Date(year, month - 1, day);
  }
  
  const dayOfWeek = date.getDay(); 
  const isMonThurs = dayOfWeek >= 1 && dayOfWeek <= 4;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
  
  let segments = [];
  let totalCalculatedPrice = 0;

  // 1. Classify each 30-min segment
  for (let t = startTime; t < startTime + duration; t += 0.5) {
    let currentRate = 380; 
    let type = "Standard Rate";

    if (isCoach) {
      if (isMonThurs && t >= 8 && t < 24) { currentRate = 250; type = "Coach Off-Peak"; }
      else if (isWeekend && t >= 8 && t < 12) { currentRate = 250; type = "Coach Off-Peak"; }
      else { type = "Coach Standard"; }
    } else {
      if (isMonThurs && t >= 10 && t < 22) {
        currentRate = 250;
        type = "Mon - Thurs(10am-10pm) Promo";
      }
    }
    
    let segmentPrice = currentRate * 0.5;
    segments.push({ time: t, price: segmentPrice, rate: currentRate, type });
    totalCalculatedPrice += segmentPrice;
  }

  let bestPrice = totalCalculatedPrice;
  let bestBreakdown = [];
  let hasBundle = false;

  // 2. Sliding Window for 3-Hour Bundle
  if (!isCoach && duration >= 3) {
    const bundleSize = 6; // 3 hours = 6 half-hour segments
    let bestBundleStartIndex = -1;

    for (let i = 0; i <= segments.length - bundleSize; i++) {
      let priceWithThisBundle = 1000; 
      for (let j = 0; j < segments.length; j++) {
        if (j < i || j >= i + bundleSize) {
          priceWithThisBundle += segments[j].price;
        }
      }
      
      // If the bundle combination is cheaper (or equal) to standard segments, select it
      if (priceWithThisBundle <= bestPrice) { 
        bestPrice = priceWithThisBundle;
        bestBundleStartIndex = i;
        hasBundle = true;
      }
    }

    // Build breakdown for the bundle scenario
    if (hasBundle) {
        bestBreakdown.push({ label: "3-Hour Bundle", price: 1000 });
        let remainingPromo = 0;
        let remainingStd = 0;
        
        for (let j = 0; j < segments.length; j++) {
            if (j < bestBundleStartIndex || j >= bestBundleStartIndex + bundleSize) {
                if (segments[j].type === "Mon - Thurs(10am-10pm) Promo") remainingPromo += 0.5;
                else remainingStd += 0.5;
            }
        }
        if (remainingPromo > 0) bestBreakdown.push({ label: `${remainingPromo}h @ Mon - Thurs(10am-10pm) Promo (₱250/hr)`, price: remainingPromo * 250 });
        if (remainingStd > 0) bestBreakdown.push({ label: `${remainingStd}h @ Standard (₱380/hr)`, price: remainingStd * 380 });
    }
  }

  // 3. Fallback Breakdown (If no bundle is applied)
  if (!hasBundle) {
      let counts = { "Standard Rate": 0, "Mon - Thurs(10am-10pm) Promo": 0, "Coach Standard": 0, "Coach Off-Peak": 0 };
      segments.forEach(seg => counts[seg.type] += 0.5);

      if (counts["Standard Rate"] > 0) bestBreakdown.push({ label: `${counts["Standard Rate"]}h @ Standard (₱380/hr)`, price: counts["Standard Rate"] * 380 });
      if (counts["Mon - Thurs(10am-10pm) Promo"] > 0) bestBreakdown.push({ label: `${counts["Mon - Thurs(10am-10pm) Promo"]}h @ Mon - Thurs(10am-10pm) Promo (₱250/hr)`, price: counts["Mon - Thurs(10am-10pm) Promo"] * 250 });
      if (counts["Coach Standard"] > 0) bestBreakdown.push({ label: `${counts["Coach Standard"]}h @ Coach Standard (₱380/hr)`, price: counts["Coach Standard"] * 380 });
      if (counts["Coach Off-Peak"] > 0) bestBreakdown.push({ label: `${counts["Coach Off-Peak"]}h @ Coach Promo (₱250/hr)`, price: counts["Coach Off-Peak"] * 250 });
  }

  const basePrice = duration * 380;
  const isDiscounted = bestPrice < basePrice;

  return { total: bestPrice, breakdown: bestBreakdown, isDiscounted };
};

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCoachMode, setIsCoachMode] = useState(false); 
  const [cart, setCart] = useState([]); 
  const [currentSelection, setCurrentSelection] = useState(null); 
  const [duration, setDuration] = useState(1); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [liveBookings, setLiveBookings] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLiveBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (time) => {
    const hour = Math.floor(time);
    const minutes = time % 1 === 0 ? "00" : "30";
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCoachLogin = () => {
    if (prompt("Enter Coach Access Code:") === "coach2026") { 
      setIsCoachMode(true);
      alert("Welcome Coach!");
    } else alert("Invalid Code");
  };

  const handleSlotClick = (courtId, timeSlot, date) => {
    setCurrentSelection({ court: courtId, time: timeSlot, date: date });
    setDuration(1);
  };

  const addToCart = () => {
    if (!currentSelection) return;
    if (currentSelection.time + duration > 24) {
      alert(`⚠️ INVALID DURATION\n\nWe close at 12:00 Midnight.`);
      return;
    }
    
    // Updated to use the new calculatePriceDetails().total
    const newBooking = {
      id: Date.now(), 
      court: currentSelection.court,
      time: currentSelection.time,
      date: currentSelection.date,
      duration: duration,
      price: calculatePriceDetails(currentSelection.time, duration, currentSelection.date, isCoachMode).total
    };

    const isOverlap = cart.some(item => 
      item.court === newBooking.court && 
      item.date === newBooking.date &&
      ((newBooking.time >= item.time && newBooking.time < item.time + item.duration) ||
       (item.time >= newBooking.time && item.time < newBooking.time + newBooking.duration))
    );

    if (isOverlap) {
      alert("This slot overlaps with a booking already in your cart!");
      return;
    }

    setCart([...cart, newBooking]);
    setCurrentSelection(null); 
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  if (isAdminMode) return <AdminDashboard onLogout={() => setIsAdminMode(false)} />;

  const courts = [1, 2, 3, 4, 5];

  // We generate the price details for the current selection here so the UI can use it
  let priceInfo = null;
  if (currentSelection) {
    priceInfo = calculatePriceDetails(currentSelection.time, duration, currentSelection.date, isCoachMode);
  }

  return (
    <div className="min-h-screen relative selection:bg-lime-500/30 overflow-x-hidden bg-zinc-950 text-white font-sans">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none"></div>
      
      <div className={`fixed top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none z-0 opacity-40 animate-pulse transition-colors duration-1000 ${isCoachMode ? 'bg-yellow-500/20' : 'bg-lime-500/20'}`}></div>
      <div className={`fixed bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none z-0 opacity-20 transition-colors duration-1000 ${isCoachMode ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}></div>

      <div className="relative z-10 pb-48"> 
        <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-zinc-950/80">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(132,204,22,0.3)] ${isCoachMode ? 'bg-yellow-400 shadow-yellow-400/20' : 'bg-lime-400 shadow-lime-400/20'}`}>
                <span className="text-black font-black text-xl">P</span>
              </div>
              <span className="font-bold text-white text-xl tracking-tight">Pickle<span className={isCoachMode ? 'text-yellow-400' : 'text-lime-400'}>Jar</span>Courts</span>
            </div>
            
            <div className="flex gap-3">
              {isCoachMode ? (
                 <button onClick={() => setIsCoachMode(false)} className="text-[10px] font-black text-red-400 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 hover:bg-red-500/20 transition">EXIT COACH MODE</button>
              ) : (
                <button onClick={handleCoachLogin} className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-lg border border-white/5 transition">
                    <Lock size={12}/> Coach
                </button>
              )}
              <button onClick={() => setIsAdminMode(true)} className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-lg border border-white/5 transition">
                <ShieldCheck size={12}/> Admin
              </button>
            </div>
          </div>
        </nav>

        <div className="pt-16 pb-10 text-center px-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest mb-8 ${isCoachMode ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-lime-500/30 bg-lime-500/10 text-lime-400'}`}>
            {isCoachMode ? "Coach Rates Active" : "Live Bookings Active"}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[0.9]">
            RESERVE YOUR <br className="hidden md:block"/>
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isCoachMode ? 'from-yellow-300 via-orange-400 to-yellow-500' : 'from-lime-300 via-green-400 to-lime-500'}`}>WINNING MOMENT</span>
          </h1>

          <div className="flex items-center justify-center gap-2 text-zinc-500 mb-16 font-medium text-xs uppercase tracking-widest">
            <MapPin className={`w-3 h-3 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} /> PDR Business Hub, Cabuyao
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 max-w-[98rem] mx-auto px-4">
            {courts.map((courtNum) => (
              <CourtCard 
                key={courtNum}
                courtName={`Court ${courtNum}`} 
                image={`/court${courtNum > 3 ? 2 : courtNum}.jpg`} 
                isCoachMode={isCoachMode}
                cart={cart}
                currentSelection={currentSelection}
                currentDuration={duration}
                onSlotSelect={handleSlotClick} 
                courtId={courtNum}
                existingBookings={liveBookings}
              />
            ))}

            <div className="relative w-full bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col hover:border-blue-500/50 transition-all duration-300 group hover:-translate-y-1">
                <div className="h-32 bg-blue-600 relative flex items-center justify-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-blue-400 z-10 transform group-hover:scale-110 transition-transform duration-500">
                        <span className="text-blue-600 font-black text-[9px] uppercase leading-none text-center">Join<br/>Club</span>
                    </div>
                </div>
                <div className="p-5 pt-8 flex-grow flex flex-col items-center text-center -mt-6 relative z-0">
                    <h3 className="text-white font-black text-sm tracking-tight mb-1">Community</h3>
                    <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-4">Laguna • Reclub</p>
                    <a href="https://reclub.co/clubs/@picklejar-courts" target="_blank" rel="noreferrer" className="mt-auto block w-full py-2.5 rounded-xl font-bold uppercase tracking-widest text-[9px] text-white bg-blue-700 hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20">Open Reclub</a>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER / CART */}
      {(currentSelection || cart.length > 0) && (
        <div className="fixed bottom-0 left-0 w-full z-50">
             <div className="bg-zinc-900/95 backdrop-blur-xl p-4 md:p-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)] border-t border-white/10">
                <div className="max-w-7xl mx-auto">
                    {currentSelection && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-bottom duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isCoachMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-lime-500/20 text-lime-400'}`}>
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-xl italic uppercase tracking-tighter flex items-baseline gap-2">
                                        Court {currentSelection.court} <span className="text-zinc-600 text-sm">@</span> {formatTime(currentSelection.time)}
                                        <span className="text-[10px] font-bold text-lime-400 tracking-widest">{currentSelection.date}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Duration:</p>
                                            <select 
                                                value={duration} 
                                                onChange={(e) => setDuration(parseFloat(e.target.value))}
                                                className="bg-zinc-800 text-white border border-zinc-700 rounded-md py-0.5 px-2 text-xs font-bold outline-none"
                                            >
                                                <option value={1}>1 Hour</option>
                                                <option value={1.5}>1.5 Hours</option>
                                                <option value={2}>2 Hours</option>
                                                <option value={2.5}>2.5 Hours</option>
                                                <option value={3}>3 Hours</option>
                                                <option value={3.5}>3.5 Hours</option>
                                                <option value={4}>4 Hours</option>
                                                <option value={4.5}>4.5 Hours</option>
                                                <option value={5}>5 Hours</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* --- THE NEW BREAKDOWN TOOLTIP UI --- */}
                            <div className="flex items-center justify-between w-full md:w-auto gap-4 mt-4 md:mt-0">
                              <div className="text-left md:text-right relative group cursor-help">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center justify-start md:justify-end gap-1">
                                      {priceInfo.isDiscounted && !isCoachMode && (
                                          <span className="bg-lime-500 text-black px-1.5 py-0.5 rounded-[4px] text-[8px] animate-pulse">
                                              BEST RATE APPLIED
                                          </span>
                                      )}
                                      Block Price
                                      <span className="text-[8px] border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center opacity-50 ml-1 group-hover:opacity-100">?</span>
                                  </p>
                                  <p className={`text-3xl font-black ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
                                      ₱{priceInfo.total}
                                  </p>

                                  {/* FIXED Tooltip Box */}
                                  {/* Changed from right-0 to: left-0 md:left-auto md:right-0 */}
                                  <div className="absolute bottom-full left-0 md:left-auto md:right-0 mb-2 w-64 max-w-[90vw] bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                      <p className="text-white text-xs font-black uppercase tracking-widest border-b border-white/10 pb-2 mb-2 text-left">Price Breakdown</p>
                                      {priceInfo.breakdown.map((item, idx) => (
                                          <div key={idx} className="flex justify-between items-center text-xs text-zinc-300 py-1 gap-2">
                                              <span className="text-left whitespace-normal">{item.label}</span>
                                              <span className="font-mono text-white shrink-0">₱{item.price}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              
                              <button onClick={addToCart} className="bg-white hover:bg-zinc-200 text-black px-6 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-transform hover:scale-105 shadow-xl shadow-white/10 whitespace-nowrap">
                                  <PlusCircle size={18} /> Add to Cart
                              </button>
                          </div>
                        </div>
                    )}

                    {!currentSelection && cart.length > 0 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 overflow-x-auto max-w-full md:max-w-3xl py-2">
                                <div className={`flex items-center gap-2 font-black uppercase italic tracking-tighter mr-4 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
                                    <ShoppingCart size={20} /> Cart ({cart.length})
                                </div>
                                {cart.map((item) => (
                                    <div key={item.id} className="bg-zinc-800 border border-white/10 rounded-full pl-4 pr-2 py-1.5 flex items-center gap-3 whitespace-nowrap">
                                        <span className="text-white text-xs font-bold">C{item.court}</span>
                                        <span className="text-lime-400 text-[10px] font-bold">{item.date}</span>
                                        <span className="text-zinc-300 text-xs font-bold">{formatTime(item.time)}</span>
                                        <button onClick={() => removeFromCart(item.id)} className="hover:text-red-500 transition"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Due</p>
                                    <p className={`text-3xl font-black ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>₱{cartTotal}</p>
                                </div>
                                <button onClick={() => setShowPaymentModal(true)} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform ${isCoachMode ? 'bg-yellow-400 text-black shadow-yellow-400/20 shadow-lg' : 'bg-lime-400 text-black shadow-lime-400/20 shadow-lg'}`}>
                                    Checkout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {showPaymentModal && <PaymentModal cart={cart} totalPrice={cartTotal} onClose={() => setShowPaymentModal(false)} setCart={setCart} isCoachMode={isCoachMode} />}
    </div>
  );
}

export default App;