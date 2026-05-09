import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 hover:opacity-80 transition">
          Job Automator
        </Link>
        <div className="space-x-6">
          <Link href="/" className="hover:text-blue-400 transition">Dashboard</Link>
          <Link href="/applications" className="hover:text-blue-400 transition">Applications</Link>
          <Link href="/profile" className="hover:text-blue-400 transition">Profile</Link>
        </div>
      </div>
    </nav>
  );
}
