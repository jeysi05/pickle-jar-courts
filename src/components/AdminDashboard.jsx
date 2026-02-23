import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, LogOut, Clock, Trash2, ShieldCheck, MapPin, ArrowLeft, AlertTriangle, Zap, TrendingUp, Wallet } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert("Incorrect Password");
    }
  };

  // --- LIVE DATA FEED ---
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

  // --- REVENUE CALCULATIONS ---
  const totalPaid = bookings
    .filter(b => b.status === 'booked')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const totalPending = bookings
    .filter(b => b.status === 'booked_unpaid' || !b.status || b.status === 'PENDING')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  // --- STATUS UPDATE & SMS TRIGGER ---
  const handleStatusUpdate = async (id, newStatus, customerContact, customerName, bookingDetails) => {
    try {
      // 1. Update Firebase
      const ref = doc(db, "bookings", id);
      await updateDoc(ref, { status: newStatus });
      
      // 2. Trigger SMS ONLY if status is set to 'booked' (PAID)
      if (newStatus === 'booked') {
        const API_KEY = "29a1827bca8ebef96d110e5920dea863";
        const SENDER_NAME = "SEMAPHORE"; // Update to "PickleJar" once LOI is approved
        
        const smsMessage = `Hi ${customerName}, your booking at PickleJarCourts for ${bookingDetails} is now CONFIRMED. See you on the court!`;

        const response = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            'apikey': API_KEY,
            'number': customerContact,
            'message': smsMessage,
            'sendername': SENDER_NAME
          })
        });

        if (response.ok) {
          alert(`✅ Approved! SMS confirmation sent to ${customerName}.`);
        } else {
          alert("✅ Status updated, but SMS failed. Check Semaphore credits.");
        }
      } else {
        console.log(`Successfully updated ${id} to ${newStatus}`);
      }
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const deleteBooking = async (id) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this record?")) {
      await deleteDoc(doc(db, "bookings", id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-sm shadow-2xl text-center">
            <div className="flex justify-center mb-6"><ShieldCheck className="w-12 h-12 text-lime-400" /></div>
            <h2 className="text-white text-2xl font-black mb-6 uppercase italic">Admin Portal</h2>
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white mb-4 outline-none text-center font-bold"
            />
            <button type="submit" className="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-xl uppercase tracking-widest">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      
      {/* HEADER & ANALYTICS */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-zinc-800 pb-8 gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Admin <span className="text-lime-400 font-bold">Dashboard</span></h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">PickleJarCourts Live Management</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl transition uppercase">
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* REVENUE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <TrendingUp className="text-lime-400 mb-2" size={20} />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Paid Revenue</p>
            <p className="text-3xl font-black text-white">₱{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <Wallet className="text-orange-400 mb-2" size={20} />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Pending (Pay Later)</p>
            <p className="text-3xl font-black text-white">₱{totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <Zap className="text-blue-400 mb-2" size={20} />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Bookings</p>
            <p className="text-3xl font-black text-white">{bookings.length}</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-7xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="p-6">Status</th>
                <th className="p-6">Customer</th>
                <th className="p-6">Details</th>
                <th className="p-6">Price</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                      booking.status === 'booked' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      booking.status === 'booked_unpaid' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      'bg-zinc-700/30 text-zinc-400 border-zinc-600'
                    }`}>
                      {booking.status === 'booked' ? 'PAID' : booking.status === 'booked_unpaid' ? 'PAY LATER' : booking.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-white text-sm">{booking.customerName}</div>
                    <div className="text-zinc-500 text-xs font-mono">{booking.customerContact}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-zinc-300 text-xs font-bold flex items-center gap-2">
                         <Calendar size={12} className="text-lime-400"/> {booking.date}
                    </div>
                    <div className="text-zinc-400 text-[10px] mt-1 flex items-center gap-2">
                         <Clock size={12} /> {booking.timeSlot} | Court {booking.court}
                    </div>
                  </td>
                  <td className="p-6 font-mono text-lime-400 font-bold">₱{booking.price || 0}</td>
                  <td className="p-6">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => handleStatusUpdate(
                          booking.id, 
                          'booked', 
                          booking.customerContact, 
                          booking.customerName, 
                          `Court ${booking.court} @ ${booking.timeSlot}`
                        )} 
                        title="Approve & Send SMS"
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition border border-green-500/20"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleStatusUpdate(booking.id, 'booked_unpaid')} className="p-2 bg-orange-500/10 hover:bg-orange-400 text-orange-400 hover:text-white rounded-lg transition border border-orange-500/20"><AlertTriangle size={16} /></button>
                      <button onClick={() => handleStatusUpdate(booking.id, 'cancelled')} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition border border-red-500/20"><XCircle size={16} /></button>
                      <button onClick={() => deleteBooking(booking.id)} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-lg transition ml-2"><Trash2 size={16} /></button>
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