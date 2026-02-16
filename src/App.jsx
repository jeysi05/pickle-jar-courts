import { useState } from 'react';
import CourtCard from './components/CourtCard';
import AdminDashboard from './components/AdminDashboard';
import PaymentModal from './components/PaymentModal'; 
import { MapPin, ShieldCheck, Lock, ShoppingCart, X, PlusCircle, Zap } from 'lucide-react';

// --- PRICING LOGIC ---
const calculateBlockPrice = (startTime, duration, dateString, isCoach) => {
  const date = dateString ? new Date(dateString) : new Date();
  const day = date.getDay(); 
  const isWeekend = day === 0 || day === 5 || day === 6; 
  
  if (isCoach) {
    let ratePerHour = 380; 
    if (!isWeekend && startTime >= 8 && startTime < 24) ratePerHour = 250;
    else if (isWeekend && startTime >= 8 && startTime < 12) ratePerHour = 250;
    return ratePerHour * duration;
  } 

  const endTime = startTime + duration;
  if (!isWeekend && duration === 3 && startTime >= 10 && endTime <= 22) {
     return 1000; 
  }

  return 380 * duration;
};

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCoachMode, setIsCoachMode] = useState(false); 
  const [cart, setCart] = useState([]); 
  const [currentSelection, setCurrentSelection] = useState(null); 
  const [duration, setDuration] = useState(1); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
    
    const newBooking = {
      id: Date.now(), 
      court: currentSelection.court,
      time: currentSelection.time,
      date: currentSelection.date,
      duration: duration,
      price: calculateBlockPrice(currentSelection.time, duration, currentSelection.date, isCoachMode)
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

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  if (isAdminMode) return <AdminDashboard onLogout={() => setIsAdminMode(false)} />;

  const courts = [1, 2, 3, 4, 5];

  return (
    <div className={`min-h-screen relative selection:bg-lime-500/30 overflow-x-hidden bg-zinc-950 text-white font-sans`}>
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none"></div>
      <div className={`fixed top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-0 ${isCoachMode ? 'bg-yellow-500/10' : 'bg-lime-500/10'}`}></div>

      <div className="relative z-10 pb-48"> 
        
        {/* NAVBAR */}
        <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-zinc-950/80">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(132,204,22,0.3)] ${isCoachMode ? 'bg-yellow-400 shadow-yellow-400/20' : 'bg-lime-400 shadow-lime-400/20'}`}>
                <span className="text-black font-black text-xl">P</span>
              </div>
              <span className="font-bold text-white text-xl tracking-tight">
                Pickle<span className={isCoachMode ? 'text-yellow-400' : 'text-lime-400'}>Jar</span>Courts
              </span>
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

        {/* HERO SECTION */}
        <div className="pt-16 pb-10 text-center px-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest mb-8 ${isCoachMode ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-lime-500/30 bg-lime-500/10 text-lime-400'}`}>
             <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCoachMode ? 'bg-yellow-400' : 'bg-lime-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCoachMode ? 'bg-yellow-500' : 'bg-lime-500'}`}></span>
            </span>
            {isCoachMode ? "Coach Rates Active" : "Live Bookings Active"}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[0.9]">
            RESERVE YOUR <br className="hidden md:block"/>
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isCoachMode ? 'from-yellow-300 via-orange-400 to-yellow-500' : 'from-lime-300 via-green-400 to-lime-500'}`}>
              WINNING MOMENT
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 text-zinc-500 mb-16 font-medium text-xs uppercase tracking-widest">
            <MapPin className={`w-3 h-3 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} />
            PDR Business Hub, Cabuyao
          </div>
          
          {/* GRID OF COURTS + RECLUB (Updated to 6 columns) */}
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
              />
            ))}

            {/* THE RECLUB CARD */}
            <div className="relative w-full bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col hover:border-yellow-500/50 transition-all duration-300 group hover:-translate-y-1">
                <div className="h-32 bg-yellow-500 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent"></div>
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10 transform group-hover:scale-110 transition-transform duration-500">
                        <span className="text-white font-black text-[10px] text-center leading-none uppercase">Pickle<br/>Jar</span>
                    </div>
                </div>
                <div className="p-6 pt-8 flex-grow flex flex-col items-center text-center -mt-6 relative z-0">
                    <h3 className="text-white font-black text-lg tracking-tight mb-1">Join Community</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">Laguna • Reclub</p>
                    <p className="text-zinc-400 text-xs mb-6 leading-relaxed">Join our official community for Open Play, tournaments, and mixers.</p>
                    <a href="https://reclub.co/clubs/@picklejar-courts" target="_blank" rel="noreferrer" className="mt-auto block w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white bg-blue-700 hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2">
                        Open Reclub
                    </a>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FOOTER / CART --- */}
      {(currentSelection || cart.length > 0) && (
        <div className="fixed bottom-0 left-0 w-full z-50">
             <div className={`h-[1px] w-full bg-gradient-to-r from-transparent ${isCoachMode ? 'via-yellow-500/50' : 'via-lime-500/50'} to-transparent`}></div>
             
             <div className="bg-zinc-900/95 backdrop-blur-xl p-4 md:p-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)]">
                <div className="max-w-7xl mx-auto">
                    {currentSelection && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-bottom duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isCoachMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-lime-500/20 text-lime-400'}`}>
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-xl italic uppercase tracking-tighter">
                                        Court {currentSelection.court} <span className="text-zinc-600">@</span> {currentSelection.time}:00
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Duration:</p>
                                        <select 
                                            value={duration} 
                                            onChange={(e) => setDuration(parseFloat(e.target.value))}
                                            className="bg-zinc-800 text-white border border-zinc-700 rounded-md py-0.5 px-2 text-xs font-bold outline-none focus:border-lime-500"
                                        >
                                            <option value={1}>1 Hour</option>
                                            <option value={1.5}>1.5 Hours</option>
                                            <option value={2}>2 Hours</option>
                                            <option value={2.5}>2.5 Hours</option>
                                            <option value={3}>3 Hours</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Price</p>
                                    <p className={`text-3xl font-black ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
                                        ₱{calculateBlockPrice(currentSelection.time, duration, currentSelection.date, isCoachMode)}
                                    </p>
                                </div>
                                <button onClick={addToCart} className="bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
                                    <PlusCircle size={18} /> Add to Cart
                                </button>
                            </div>
                        </div>
                    )}

                    {!currentSelection && cart.length > 0 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in">
                            <div className="flex items-center gap-3 overflow-x-auto max-w-full md:max-w-3xl custom-scrollbar py-2">
                                <div className={`flex items-center gap-2 font-black uppercase italic tracking-tighter mr-4 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
                                    <ShoppingCart size={20} /> Cart ({cart.length})
                                </div>
                                {cart.map((item) => (
                                    <div key={item.id} className="bg-zinc-800 border border-white/10 rounded-full pl-4 pr-2 py-1.5 flex items-center gap-3 whitespace-nowrap">
                                        <span className="text-white text-xs font-bold">Court {item.court}</span>
                                        <span className="text-zinc-500 text-xs font-mono">|</span>
                                        <span className="text-zinc-300 text-xs font-bold">{item.time}:00 ({item.duration}h)</span>
                                        <button onClick={() => removeFromCart(item.id)} className="bg-white/5 hover:bg-red-500 hover:text-white text-zinc-500 rounded-full p-1 transition">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Due</p>
                                    <p className={`text-3xl font-black leading-none ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`}>
                                        ₱{cartTotal}
                                    </p>
                                </div>
                                <button onClick={() => setShowPaymentModal(true)} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform ${isCoachMode ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20' : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-400/20'}`}>
                                    Checkout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {showPaymentModal && <PaymentModal cart={cart} totalPrice={cartTotal} onClose={() => setShowPaymentModal(false)} isCoachMode={isCoachMode} />}
    </div>
  );
}

export default App;