import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, LogOut, Trash2, ShieldCheck, AlertTriangle, Zap, TrendingUp, Wallet, ShoppingCart, CalendarPlus } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [groupedBookings, setGroupedBookings] = useState({});
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // NEW: Pulls from .env
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
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const grouped = allDocs.reduce((acc, curr) => {
        const groupId = (curr.customerContact && curr.date) 
          ? `${curr.customerContact}_${curr.date}` 
          : curr.orderGroupId || curr.id; 

        if (!acc[groupId]) {
          acc[groupId] = {
            orderId: groupId,
            customerName: curr.customerName,
            customerContact: curr.customerContact,
            date: curr.date, 
            createdAt: curr.createdAt, 
            overallStatus: curr.status, 
            totalPrice: 0,
            items: []
          };
        }
        acc[groupId].items.push(curr);
        acc[groupId].totalPrice += (Number(curr.price) || 0);
        return acc;
      }, {});

      setGroupedBookings(grouped);
    });
    
    return () => unsubscribe();
  }, [isAuthenticated]);

  const allBookingsFlat = Object.values(groupedBookings).flatMap(group => group.items);
  
  const totalPaid = allBookingsFlat
    .filter(b => b.status === 'booked')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const totalPending = allBookingsFlat
    .filter(b => b.status === 'booked_unpaid' || !b.status || b.status === 'PENDING' || b.status === 'PAY_LATER')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const getGoogleCalendarLinkForItem = (item, group) => {
    try {
      const start = parseFloat(item.timeSlot);
      const duration = parseFloat(item.duration);
      const end = start + duration;

      const formatGCalDate = (dateStr, timeNum) => {
        const [year, month, day] = dateStr.split('-');
        const hours = Math.floor(timeNum).toString().padStart(2, '0');
        const minutes = ((timeNum % 1) * 60).toString().padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}00`;
      };

      const startTimeGcal = formatGCalDate(group.date, start);
      const endTimeGcal = formatGCalDate(group.date, end);

      const isPaid = (group.overallStatus === 'PAY_LATER' || item.status === 'booked_unpaid' || item.status === 'PAY_LATER') ? 'UNPAID' : 'PAID';
      
      const title = encodeURIComponent(`C${item.court} ${group.customerName} ${isPaid}`);
      const details = encodeURIComponent(`Customer: ${group.customerName}\nContact: ${group.customerContact}\nTotal Price: ₱${item.price}\nReference: ${item.referenceNo || 'N/A'}`);
      const location = encodeURIComponent("PDR Business Hub, Cabuyao");

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeGcal}/${endTimeGcal}&details=${details}&location=${location}`;
    } catch (e) {
      console.error("Calendar link error", e);
      return "#";
    }
  };

  const handleConfirmOrder = async (group) => {
    try {
      await Promise.all(group.items.map(item => {
        const ref = doc(db, "bookings", item.id);
        const newStatus = (item.status === 'PAY_LATER' || item.status === 'booked_unpaid') ? 'booked_unpaid' : 'booked';
        return updateDoc(ref, { status: newStatus });
      }));
      
      const API_KEY = import.meta.env.VITE_SEMAPHORE_API_KEY;
      
      const courtSummary = group.items.map(i => `${i.court}`).join(', ');
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const d = new Date(group.date);
      const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;

      const timeSummary = group.items.map(i => {
          const startHour = Math.floor(parseFloat(i.timeSlot));
          const startMins = parseFloat(i.timeSlot) % 1 === 0 ? "00" : "30";
          const startAmPm = startHour >= 12 && startHour < 24 ? "PM" : "AM";
          const dispStart = startHour > 12 ? startHour - 12 : (startHour === 0 ? 12 : startHour);
          return `${dispStart}:${startMins} ${startAmPm}`;
      }).join(', ');

      const smsMessage = `Hello, this is to confirm your reservation at Pickle Jar Courts!\n\nYour reservation details:\nName: ${group.customerName}\nCourt No.: ${courtSummary}\nDate and Time: ${formattedDate} @ ${timeSummary}\n\nThank you and see you on the court!`;

      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'apikey': API_KEY,
          'number': group.customerContact,
          'message': smsMessage,
        })
      });

      if (response.ok) {
        alert(`✅ Order Confirmed! SMS sent to ${group.customerName}.`);
      } else {
        alert("✅ Order confirmed, but SMS failed. Check Semaphore credits.");
      }
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      alert(`Failed to confirm order: ${error.message}`);
    }
  };

  const handleCancelOrder = async (group) => {
    if (confirm("Are you sure you want to CANCEL this order?")) {
        try {
            await Promise.all(group.items.map(item => updateDoc(doc(db, "bookings", item.id), { status: 'cancelled' })));
        } catch (error) {
            alert(`Failed to cancel order: ${error.message}`);
        }
    }
  };

  const deleteGroup = async (group) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this entire order?")) {
      await Promise.all(group.items.map(item => deleteDoc(doc(db, "bookings", item.id))));
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

  const groupArray = Object.values(groupedBookings);

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
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Booked Slots</p>
            <p className="text-3xl font-black text-white">{allBookingsFlat.length}</p>
          </div>
        </div>
      </div>

      {/* CONSOLIDATED TABLE */}
      <div className="max-w-7xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="p-6">Order Status</th>
                <th className="p-6">Customer</th>
                <th className="p-6">Order Items</th>
                <th className="p-6">Total Price</th>
                <th className="p-6 text-right">Order Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groupArray.map((group) => {
                const displayStatus = group.items[0]?.status || 'PENDING';
                
                return (
                <tr key={group.orderId} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-6 align-top">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                      displayStatus === 'booked' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      (displayStatus === 'booked_unpaid' || displayStatus === 'PAY_LATER') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      displayStatus === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      'bg-zinc-700/30 text-zinc-400 border-zinc-600'
                    }`}>
                      {displayStatus === 'booked' ? 'PAID' : (displayStatus === 'booked_unpaid' || displayStatus === 'PAY_LATER') ? 'PAY LATER' : displayStatus}
                    </span>
                    <div className="text-[9px] text-zinc-600 mt-2 font-mono break-words w-24">ID: {group.orderId.substring(0, 10)}...</div>
                  </td>
                  <td className="p-6 align-top">
                    <div className="font-bold text-white text-sm">{group.customerName}</div>
                    <div className="text-zinc-500 text-xs font-mono">{group.customerContact}</div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                        <div className="text-zinc-300 text-xs font-bold flex items-center gap-2 mb-2">
                            <Calendar size={12} className="text-lime-400"/> {group.date}
                        </div>
                        {group.items.map(item => (
                            <div key={item.id} className="text-zinc-400 text-[11px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-950 p-2.5 rounded-lg border border-white/5 mb-2 max-w-sm">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                      <ShoppingCart size={10} /> C{item.court} @ {item.timeSlot} ({item.duration}h)
                                  </div>
                                  {/* --- NEW: DISPLAYS THE PAYMENT CHANNEL AND REF NO --- */}
                                  {item.referenceNo && item.referenceNo !== "N/A" && (
                                      <span className="text-[9px] font-mono text-zinc-500 mt-1 block">
                                          <span className="text-lime-400 font-bold">{item.paymentChannel || 'GCash'}</span> | Ref: {item.referenceNo}
                                      </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                      item.status === 'booked' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                      (item.status === 'booked_unpaid' || item.status === 'PAY_LATER') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                      item.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                      'bg-zinc-700/30 text-zinc-400 border-zinc-600'
                                  }`}>
                                      {item.status === 'booked' ? 'PAID' : (item.status === 'booked_unpaid' || item.status === 'PAY_LATER') ? 'PAY LATER' : item.status}
                                  </span>

                                  <a 
                                    href={getGoogleCalendarLinkForItem(item, group)}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Add to Google Calendar"
                                    className="p-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded transition border border-blue-500/20"
                                  >
                                    <CalendarPlus size={12} />
                                  </a>
                                </div>
                            </div>
                        ))}
                    </div>
                  </td>
                  <td className="p-6 align-top font-mono text-lime-400 font-bold text-lg">₱{group.totalPrice}</td>
                  
                  <td className="p-6 align-top">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => handleConfirmOrder(group)} 
                        title="Confirm Order & Send SMS"
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition border border-green-500/20"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleCancelOrder(group)} 
                        title="Cancel Order" 
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition border border-red-500/20"
                      >
                        <XCircle size={16} />
                      </button>
                      <button 
                        onClick={() => deleteGroup(group)} 
                        title="Delete Data" 
                        className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-lg transition ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}