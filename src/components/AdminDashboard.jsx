import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, LogOut, Clock, Trash2, ShieldCheck, AlertTriangle, Zap, TrendingUp, Wallet, ShoppingCart, CalendarPlus } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [groupedBookings, setGroupedBookings] = useState({});
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

  // --- LIVE DATA FEED & GROUPING ---
useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // NEW GROUPING LOGIC: Group by Customer Contact + Date
      // This forces all courts booked by the same person on the same day into ONE row.
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

  // --- REVENUE CALCULATIONS ---
  const allBookingsFlat = Object.values(groupedBookings).flatMap(group => group.items);
  
  const totalPaid = allBookingsFlat
    .filter(b => b.status === 'booked')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const totalPending = allBookingsFlat
    .filter(b => b.status === 'booked_unpaid' || !b.status || b.status === 'PENDING' || b.status === 'PAY_LATER')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  // --- GOOGLE CALENDAR LINK GENERATOR ---
const getGoogleCalendarLink = (group) => {
    try {
      if (!group.items || group.items.length === 0) return "#";
      
      let earliestStart = 24;
      let latestEnd = 0;
      
      // 1. Find the overall start/end times and build a list for the description
      const bookingLines = group.items.map(item => {
        const start = parseFloat(item.timeSlot); // Safely parses string like "14.5:00" to 14.5
        const duration = parseFloat(item.duration);
        const end = start + duration;
        
        if (start < earliestStart) earliestStart = start;
        if (end > latestEnd) latestEnd = end;
        
        // Format time for human-readable description
        const hour = Math.floor(start);
        const mins = start % 1 === 0 ? "00" : "30";
        const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        
        return `• Court ${item.court} @ ${displayHour}:${mins} ${ampm} (${duration}h)`;
      }).join('\n');

      // 2. Format strictly to YYYYMMDDTHHMMSS for Google API
      const formatGCalDate = (dateStr, timeNum) => {
        const [year, month, day] = dateStr.split('-');
        const hours = Math.floor(timeNum).toString().padStart(2, '0');
        const minutes = ((timeNum % 1) * 60).toString().padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}00`;
      };

      const startTimeGcal = formatGCalDate(group.date, earliestStart);
      const endTimeGcal = formatGCalDate(group.date, latestEnd);

      // 3. Encode everything for the URL
      const title = encodeURIComponent(`PickleJar: ${group.customerName}`);
      const details = encodeURIComponent(
        `Customer: ${group.customerName}\nContact: ${group.customerContact}\n\nBooked Slots:\n${bookingLines}\n\nTotal Due: ₱${group.totalPrice}`
      );
      const location = encodeURIComponent("PDR Business Hub, Cabuyao");

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeGcal}/${endTimeGcal}&details=${details}&location=${location}`;
    } catch (e) {
      console.error("Calendar link error", e);
      return "#";
    }
  };

  // --- GROUP STATUS UPDATE & SMS TRIGGER ---
  const handleGroupStatusUpdate = async (group, newStatus) => {
    try {
      // 1. Update Firebase for ALL items in this group
      await Promise.all(group.items.map(item => {
        const ref = doc(db, "bookings", item.id);
        return updateDoc(ref, { status: newStatus });
      }));
      
      // 2. Trigger SMS if status is 'booked' (PAID) OR 'booked_unpaid' (PAY LATER)
      if (newStatus === 'booked' || newStatus === 'booked_unpaid') {
        const API_KEY = "29a1827bca8ebef96d110e5920dea863";
        const SENDER_NAME = "SEMAPHORE"; // Update to "PickleJar" once LOI is approved
        
        // Create a summary string of the courts booked
        const courtSummary = group.items.map(i => `C${i.court}`).join(', ');
        
        // Dynamically change the text message based on the status
        let statusText = newStatus === 'booked' ? "CONFIRMED" : "APPROVED (Pay Later)";
        let extraNote = newStatus === 'booked' ? "See you on the court!" : "Please settle your payment at the venue. See you!";

        const smsMessage = `Hi ${group.customerName}, your booking at PickleJarCourts for ${courtSummary} on ${group.date} is now ${statusText}. ${extraNote}`;

        const response = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            'apikey': API_KEY,
            'number': group.customerContact,
            'message': smsMessage,
            'sendername': SENDER_NAME
          })
        });

        if (response.ok) {
          alert(`✅ Order Updated! SMS sent to ${group.customerName}.`);
        } else {
          alert("✅ Order updated, but SMS failed. Check Semaphore credits.");
        }
      } else {
        console.log(`Successfully updated order ${group.orderId} to ${newStatus}`);
      }
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      alert(`Failed to update order status: ${error.message}`);
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

  // Convert grouped object to array for mapping
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
                
                // For display, use the status of the first item in the group
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
                        <div className="text-zinc-300 text-xs font-bold flex items-center gap-2 mb-1">
                            <Calendar size={12} className="text-lime-400"/> {group.date}
                        </div>
                        {group.items.map(item => (
                            <div key={item.id} className="text-zinc-400 text-[11px] flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-white/5 inline-flex mr-2 mb-2">
                                <div className="flex items-center gap-1">
                                    <ShoppingCart size={10} /> C{item.court} @ {item.timeSlot} ({item.duration}h)
                                </div>
                                {/* INDIVIDUAL ITEM STATUS TAG */}
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                    item.status === 'booked' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                    (item.status === 'booked_unpaid' || item.status === 'PAY_LATER') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    item.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                    'bg-zinc-700/30 text-zinc-400 border-zinc-600'
                                }`}>
                                    {item.status === 'booked' ? 'PAID' : (item.status === 'booked_unpaid' || item.status === 'PAY_LATER') ? 'PAY LATER' : item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                  </td>
                  <td className="p-6 align-top font-mono text-lime-400 font-bold text-lg">₱{group.totalPrice}</td>
                  <td className="p-6 align-top">
                    <div className="flex gap-2 justify-end">
                      
                      {/* --- NEW CALENDAR BUTTON --- */}
                      <a 
                        href={getGoogleCalendarLink(group)}
                        target="_blank"
                        rel="noreferrer"
                        title="Add to Google Calendar"
                        className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition border border-blue-500/20 inline-flex items-center justify-center"
                      >
                        <CalendarPlus size={16} />
                      </a>
                      {/* --------------------------- */}

                      <button 
                        onClick={() => handleGroupStatusUpdate(group, 'booked')} 
                        title="Approve Order & Send SMS"
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition border border-green-500/20"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleGroupStatusUpdate(group, 'booked_unpaid')} title="Mark Pay Later" className="p-2 bg-orange-500/10 hover:bg-orange-400 text-orange-400 hover:text-white rounded-lg transition border border-orange-500/20"><AlertTriangle size={16} /></button>
                      <button onClick={() => handleGroupStatusUpdate(group, 'cancelled')} title="Cancel Order" className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition border border-red-500/20"><XCircle size={16} /></button>
                      <button onClick={() => deleteGroup(group)} title="Delete Data" className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-lg transition ml-2"><Trash2 size={16} /></button>
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