import { AuthProvider } from '@/lib/authContext';
import './globals.css';

export const metadata = { title: 'HRMS', description: 'HR Management System' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}