import Navbar from './components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Job Automator',
  description: 'AI-powered job application automator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
