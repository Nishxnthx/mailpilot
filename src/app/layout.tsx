import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MailPilot - AI-Controlled Email Client',
  description: 'AI-powered mail web application with state-driven UI control and Gmail integration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
