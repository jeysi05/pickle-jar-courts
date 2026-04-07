import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, LogOut, Trash2, ShieldCheck, Zap, TrendingUp, Wallet, ShoppingCart, CalendarPlus } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [bookings, setBookings] = useState([]); // CHANGED: Flat array instead of object
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) { 
      setIsAuthenticated(true);
    } else {
      alert("Incorrect Password");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // CHANGED: No more .reduce logic. Just map the raw docs.
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(allDocs);
    });
    
    return () => unsubscribe();
  }, [isAuthenticated]);

  // REVENUE CALCULATIONS (Now using flat array)
  const totalPaid = bookings
    .filter(b => b.status === 'booked')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const totalPending = bookings
    .filter(b => b.status === 'booked_unpaid' || !b.status || b.status === 'PENDING' || b.status === 'PAY_LATER')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const getGoogleCalendarLink = (booking) => {
    try {
      const start = parseFloat(booking.timeSlot);
      const duration = parseFloat(booking.duration);
      const end = start + duration;

      const formatGCalDate = (dateStr, timeNum) => {
        const [year, month, day] = dateStr.split('-');
        const hours = Math.floor(timeNum).toString().padStart(2, '0');
        const minutes = ((timeNum % 1) * 60).toString().padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}00`;
      };

      const startTimeGcal = formatGCalDate(booking.date, start);
      const endTimeGcal = formatGCalDate(booking.date, end);
      const isPaid = (booking.status === 'booked') ? 'PAID' : 'UNPAID';
      
      const title = encodeURIComponent(`C${booking.court} ${booking.customerName} ${isPaid}`);
      const details = encodeURIComponent(`Customer: ${booking.customerName}\nContact: ${booking.customerContact}\nPrice: ₱${booking.price}\nRef: ${booking.referenceNo || 'N/A'}`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeGcal}/${endTimeGcal}&details=${details}&location=PDR+Business+Hub,+Cabuyao`;
    } catch (e) { return "#"; }
  };

  // INDIVIDUAL HANDLERS
  const handleConfirmOrder = async (booking) => {
    try {
      const ref = doc(db, "bookings", booking.id);
      const newStatus = (booking.status === 'PAY_LATER' || booking.status === 'booked_unpaid') ? 'booked_unpaid' : 'booked';
      await updateDoc(ref, { status: newStatus });
      
      const API_KEY = import.meta.env.VITE_SEMAPHORE_API_KEY;
      
      // Date formatting for SMS
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const d = new Date(booking.date);
      const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;

      const smsMessage = `Hello ${booking.customerName}, your reservation at Pickle Jar Courts is confirmed!\n\nDetails:\nCourt: ${booking.court}\nDate: ${formattedDate}\nTime: ${booking.timeSlot}\n\nSee you on the court!`;

      await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'apikey': API_KEY, 'number': booking.customerContact, 'message': smsMessage })
      });

      alert(`✅ Confirmed: ${booking.customerName}`);
    } catch (error) { alert(`Error: ${error.message}`); }
  };

  const handleCancelOrder = async (booking) => {
    if (confirm("Cancel this specific booking?")) {
      await updateDoc(doc(db, "bookings", booking.id), { status: 'cancelled' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-center">
        <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-sm shadow-2xl">
            <div className="flex justify-center mb-6"><ShieldCheck className="w-12 h-12 text-lime-400" /></div>
            <h2 className="text-white text-2xl font-black mb-6 uppercase italic">Admin Portal</h2>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white mb-4 outline-none text-center font-bold" />
            <button type="submit" className="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-xl uppercase tracking-widest">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase">Admin <span className="text-lime-400">Dashboard</span></h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Version 1.1 Maintenance</p>
          </div>
          <button onClick={onLogout} className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl uppercase tracking-widest flex items-center gap-2"><LogOut size={14}/> Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><TrendingUp className="text-lime-400 mb-2" size={20}/><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Paid Revenue</p><p className="text-3xl font-black">₱{totalPaid.toLocaleString()}</p></div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><Wallet className="text-orange-400 mb-2" size={20}/><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Pending Pay-in-person</p><p className="text-3xl font-black">₱{totalPending.toLocaleString()}</p></div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><Zap className="text-blue-400 mb-2" size={20}/><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Bookings</p><p className="text-3xl font-black">{bookings.length}</p></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="p-6">Status</th>
                <th className="p-6">Customer</th>
                <th className="p-6">Booking Details</th>
                <th className="p-6">Price</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                      booking.status === 'booked' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      (booking.status === 'booked_unpaid' || booking.status === 'PAY_LATER') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-700/30 text-zinc-400 border-zinc-600'
                    }`}>
                      {booking.status === 'booked' ? 'PAID' : (booking.status === 'booked_unpaid' || booking.status === 'PAY_LATER') ? 'PAY LATER' : booking.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-white text-sm">{booking.customerName}</div>
                    <div className="text-zinc-500 text-xs font-mono">{booking.customerContact}</div>
                  </td>
                  <td className="p-6">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 inline-block">
                        <div className="text-zinc-300 text-[10px] font-bold flex items-center gap-2 mb-1">
                            <Calendar size={12} className="text-lime-400"/> {booking.date}
                        </div>
                        <div className="text-white text-xs font-black uppercase italic">
                            Court {booking.court} @ {booking.timeSlot} ({booking.duration}h)
                        </div>
                        {booking.referenceNo && booking.referenceNo !== "N/A" && (
                            <div className="text-[9px] font-mono text-zinc-500 mt-2">
                                <span className="text-lime-400 font-bold">{booking.paymentChannel}</span> | Ref: {booking.referenceNo}
                            </div>
                        )}
                    </div>
                  </td>
                  <td className="p-6 font-mono text-lime-400 font-bold">₱{booking.price}</td>
                  <td className="p-6">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleConfirmOrder(booking)} title="Confirm" className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition border border-green-500/20"><CheckCircle size={16}/></button>
                      <button onClick={() => handleCancelOrder(booking)} title="Cancel" className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition border border-red-500/20"><XCircle size={16}/></button>
                      <a href={getGoogleCalendarLink(booking)} target="_blank" rel="noreferrer" title="Add to Calendar" className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition border border-blue-500/20"><CalendarPlus size={16}/></a>
                      <button onClick={() => { if(confirm("Delete permanently?")) deleteDoc(doc(db, "bookings", booking.id)) }} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-lg transition ml-2"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}