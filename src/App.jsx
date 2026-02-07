import { useState } from 'react';
import CourtCard from './components/CourtCard';
import AdminDashboard from './components/AdminDashboard';
import { MapPin, ShieldCheck, Lock, LogOut } from 'lucide-react';

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCoachMode, setIsCoachMode] = useState(false); 

  // --- COACH LOGIN LOGIC ---
  const handleCoachLogin = () => {
    const password = prompt("Enter Coach Access Code:");
    if (password === "coach2026") { 
      setIsCoachMode(true);
      alert("Welcome, Coach! Special rates applied.");
    } else {
      alert("Invalid Code");
    }
  };

  // --- EXIT COACH MODE ---
  const handleExitCoachMode = () => {
    if(confirm("Exit Coach View and return to standard pricing?")) {
      setIsCoachMode(false);
    }
  };

  if (isAdminMode) {
    return <AdminDashboard onLogout={() => setIsAdminMode(false)} />;
  }

  return (
    <div className={`min-h-screen relative selection:bg-lime-500/30 overflow-x-hidden ${isCoachMode ? 'bg-zinc-950' : 'bg-zinc-950'}`}>
      
      {/* BACKGROUND TEXTURE */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none"></div>
      
      {/* AMBIENT LIGHT */}
      <div className={`fixed top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] pointer-events-none z-0 ${isCoachMode ? 'bg-yellow-500/10' : 'bg-lime-500/10'}`}></div>

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 pb-20">
        
        {/* NAVBAR */}
<nav className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-zinc-950/80">
  <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
    
    {/* LOGO SECTION */}
    <div className="flex items-center gap-2">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(163,230,53,0.3)] ${isCoachMode ? 'bg-yellow-400' : 'bg-lime-400'}`}>
        <span className="text-zinc-950 font-black text-xl">P</span>
      </div>
      {/* Shorten name on mobile, show full on desktop */}
      <span className="font-bold text-white text-lg tracking-tight">
        <span className="md:hidden">Pickle<span className={isCoachMode ? 'text-yellow-400' : 'text-lime-400'}>Jar</span></span>
        <span className="hidden md:inline">Pickle<span className={isCoachMode ? 'text-yellow-400' : 'text-lime-400'}>JarCourts</span></span>
      </span>
    </div>
    
    {/* BUTTONS SECTION */}
    <div className="flex gap-3">
      
      {/* COACH BUTTON: Visible on Mobile now (Icon only) */}
      {isCoachMode ? (
         <button 
           onClick={handleExitCoachMode}
           className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-2 rounded-full border border-red-500/20"
         >
           <LogOut size={14} /> <span className="hidden md:inline">EXIT</span>
         </button>
      ) : (
        <button 
          onClick={handleCoachLogin}
          // REMOVED 'hidden' class here so it shows on mobile
          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-yellow-400 transition-colors uppercase tracking-widest bg-zinc-900/50 px-3 py-2 rounded-lg border border-white/5"
        >
          <Lock size={14} /> <span className="hidden md:inline">Coach</span>
        </button>
      )}

      {/* ADMIN BUTTON */}
      <button 
        onClick={() => setIsAdminMode(true)}
        className="text-xs font-bold text-zinc-500 hover:text-lime-400 transition-colors uppercase tracking-widest flex items-center gap-2 bg-zinc-900/50 px-3 py-2 rounded-lg border border-white/5"
      >
        <ShieldCheck size={14} /> <span className="hidden md:inline">Admin</span>
      </button>
    </div>
  </div>
</nav>

        {/* HERO SECTION */}
        <div className="pt-16 pb-24 text-center px-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide mb-6 backdrop-blur-md ${isCoachMode ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-lime-500/30 bg-lime-500/10 text-lime-400'}`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCoachMode ? 'bg-yellow-400' : 'bg-lime-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCoachMode ? 'bg-yellow-500' : 'bg-lime-500'}`}></span>
            </span>
            {isCoachMode ? "Coach Rates Active" : "Live Bookings Active"}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">
            {isCoachMode ? "TRAIN THE" : "RESERVE YOUR"} <br className="hidden md:block" />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isCoachMode ? 'from-yellow-300 to-orange-400' : 'from-lime-300 to-emerald-400'}`}>
              {isCoachMode ? "NEXT CHAMPIONS" : "WINNING MOMENT"}
            </span>
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-zinc-400 mb-12 font-medium">
            <MapPin className={`w-4 h-4 ${isCoachMode ? 'text-yellow-400' : 'text-lime-400'}`} />
            <span>PDR Business Hub, Cabuyao</span>
          </div>

          {/* THE CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
            
            {/* COURT 1 */}
            <CourtCard courtName="Centre Court" image="/court1.jpg" isCoachMode={isCoachMode} />

            {/* COURT 2 */}
            <CourtCard courtName="Court 2" image="/court2.jpg" isCoachMode={isCoachMode} />

            {/* COURT 3 */}
            <CourtCard courtName="Court 3" image="/court3.jpg" isCoachMode={isCoachMode} />

            {/* RECLUB CARD */}
            <div className="relative w-full max-w-sm mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col hover:border-[#FFC107] transition-all duration-300 group hover:-translate-y-1">
              
              <div className="h-32 bg-[#FFC107] relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent"></div>
                
                <div className="w-20 h-20 bg-[#2ECC71] rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10 transform group-hover:scale-110 transition-transform duration-500">
                  <span className="text-white font-black text-xs text-center leading-none">
                    PICKLE<br/>JAR<br/><span className="text-[8px] font-normal opacity-80">COURTS</span>
                  </span>
                </div>
              </div>

              <div className="p-6 pt-8 flex-grow flex flex-col items-center text-center -mt-6 relative z-0">
                <h3 className="text-white font-black text-xl tracking-tight mb-1">PickleJarCourts</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Laguna • Pickleball</p>
                
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                  Join our official community on Reclub! Sign up for <span className="text-[#FFC107]">Open Play</span>, tournaments, and social mixers.
                </p>
                
                <a 
                  href="https://reclub.co/clubs/@picklejar-courts" 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-auto block w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs text-white bg-blue-700 hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <span>Open App</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-12 border-t border-white/5 pt-12">
          <p className="text-zinc-600 text-xs uppercase tracking-widest">© 2026 PickleJarCourts</p>
        </div>
      </div>
    </div>
  );
}

export default App;