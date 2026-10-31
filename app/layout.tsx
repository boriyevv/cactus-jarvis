import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'CACTUS JARVIS — Founder Command Center', description: 'Задания, время, проверка, финансы и голосовой AI-ассистент Jarvis' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
