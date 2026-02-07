export default function Navbar() {
  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {/* Simple Blue Circle Logo */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          P
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
          Pickle Jar <span className="text-blue-600">Courts</span>
        </h1>
      </div>
      
      <button className="text-gray-600 hover:text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
    </nav>
  );
}