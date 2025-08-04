'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import HomePage from './page';

export default function MainPage() {
  const router = useRouter();

  // Redirect logic for main page
  useEffect(() => {
    // Check if there's a session in URL hash or query
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId) {
      // Redirect to session-specific URL
      router.push(`/chat/${sessionId}`);
    }
  }, [router]);

  // Render main page without any initial session
  return <HomePage />;
}
