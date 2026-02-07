import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, LogOut, Clock, Trash2, ShieldCheck, MapPin, ArrowLeft } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- 1. LOGIN LOGIC ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert("Incorrect Password");
    }
  };

  // --- 2. LIVE DATA FEED ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  // --- 3. ACTIONS ---
  const approveBooking = async (id) => {
    const ref = doc(db, "bookings", id);
    await updateDoc(ref, { status: "APPROVED" });
  };

  const deleteBooking = async (id) => {
    if (confirm("Are you sure you want to delete this booking record?")) {
      await deleteDoc(doc(db, "bookings", id));
    }
  };

  const addToGoogleCalendar = (booking) => {
    const { court, date, timeSlot, customerName } = booking;
    const startTime = new Date(`${date} ${timeSlot}`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 
    const formatTime = (dateObj) => dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    const title = encodeURIComponent(`🎾 BOOKING: ${customerName} (${court})`);
    const details = encodeURIComponent(`Approved Booking.\nPlayer: ${customerName}\nCourt: ${court}\nTime: ${timeSlot}`);
    const location = encodeURIComponent("Pickle Jar Courts, Laguna");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  // --- RENDER: LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        
        <form onSubmit={handleLogin} className="relative bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-sm shadow-2xl z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-lime-400/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-lime-400" />
            </div>
          </div>
          
          <h2 className="text-white text-2xl font-black mb-2 text-center tracking-tighter uppercase font-display">Admin Portal</h2>
          <p className="text-zinc-500 text-xs text-center mb-8 uppercase tracking-widest">Authorized Personnel Only</p>
          
          <input 
            type="password" 
            placeholder="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-white mb-4 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition font-bold text-center tracking-widest"
          />
          <button type="submit" className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black py-4 rounded-xl transition uppercase tracking-widest shadow-[0_0_20px_rgba(163,230,53,0.3)]">
            Access Dashboard
          </button>
          
          {/* --- NEW BUTTON: BACK TO HOME --- */}
          <button onClick={onLogout} type="button" className="w-full mt-6 text-zinc-500 text-xs hover:text-white font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ArrowLeft size={12} /> Back to Website
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER: DASHBOARD ---
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 relative">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-zinc-800 pb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-display">
              Management <span className="text-lime-400">Hub</span>
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></span>
              Live System Active
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center hidden md:block">
              <span className="block text-2xl font-black text-lime-400">
                ₱{bookings.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 300), 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Revenue</span>
            </div>
            
            {/* --- NEW BUTTON: BACK TO HOME --- */}
            <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-6 py-3 rounded-2xl transition uppercase tracking-widest">
              <ArrowLeft size={14} /> Back to Home
            </button>
          </div>
        </div>

        {/* BOOKINGS GRID */}
        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 font-bold uppercase tracking-widest">No bookings found yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-lime-500/30 transition-all duration-300">
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  booking.status === 'APPROVED' || booking.status === 'CONFIRMED' 
                    ? 'bg-lime-500/10 text-lime-400 border-lime-500/20' 
                    : booking.status === 'REJECTED' 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse'
                }`}>
                  {booking.status}
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1 font-display">{booking.customerName || "Unknown"}</h3>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-mono">ID: {booking.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-3 mb-8 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center gap-3 text-zinc-300 text-xs font-bold uppercase tracking-wide">
                    <Calendar size={14} className="text-lime-400" />
                    {booking.date}
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300 text-xs font-bold uppercase tracking-wide">
                    <Clock size={14} className="text-lime-400" />
                    {booking.timeSlot}
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300 text-xs font-bold uppercase tracking-wide">
                    <MapPin size={14} className="text-lime-400" />
                    {booking.court}
                  </div>
                </div>

                <div className="flex gap-2">
                  {(booking.status === 'PENDING' || !booking.status) && (
                    <>
                      <button 
                        onClick={() => approveBooking(booking.id)}
                        className="flex-1 bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(163,230,53,0.2)]"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => deleteBooking(booking.id)}
                        className="flex-1 bg-zinc-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 border border-zinc-700 text-zinc-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}

                  {(booking.status === 'APPROVED' || booking.status === 'CONFIRMED') && (
                    <div className="w-full space-y-2">
                      <button 
                        onClick={() => addToGoogleCalendar(booking)}
                        className="w-full bg-zinc-800 hover:bg-white hover:text-black text-white border border-zinc-700 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                        <Calendar size={14} /> Add to Admin Calendar
                      </button>
                      <button 
                         onClick={() => deleteBooking(booking.id)}
                         className="w-full text-zinc-600 hover:text-red-400 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-1 py-2"
                      >
                        <Trash2 size={12} /> Delete Record
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}