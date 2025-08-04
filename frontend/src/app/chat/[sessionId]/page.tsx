'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Home from '../../page';

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const sessionId = params.sessionId as string;

  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsValidating(true);
        
        // Check if session exists in database
        const response = await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setSessionExists(true);
        } else if (response.status === 404) {
          // Session not found - show notification and redirect
          setSessionExists(false);
          setShowNotification(true);
          
          // Auto redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        }
      } catch (error) {
        console.error('Error validating session:', error);
        setSessionExists(false);
        setShowNotification(true);
        
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } finally {
        setIsValidating(false);
      }
    };

    if (sessionId) {
      validateSession();
    }
  }, [sessionId, router]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memvalidasi sesi chat...</p>
        </div>
      </div>
    );
  }

  // Show notification if session doesn't exist
  if (showNotification && !sessionExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Error Notification Popup */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg border border-red-600">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-medium">Sesi Chat Tidak Ditemukan</p>
                <p className="text-sm opacity-90">Session chat sudah tidak ada atau terhapus. Mengalihkan ke halaman utama...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading/redirect screen */}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Mengalihkan ke halaman utama...</p>
          </div>
        </div>
      </div>
    );
  }

  // If session exists, render the main chat interface with this session active
  if (sessionExists) {
    return <Home initialSessionId={sessionId} />;
  }

  return null;
}
