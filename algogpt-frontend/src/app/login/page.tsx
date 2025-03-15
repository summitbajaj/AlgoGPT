"use client";
import { useState } from 'react';
import { useAuth } from '@/firebase/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState('');
  const { signInWithGoogle, signInWithGithub } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed');
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithGithub();
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'GitHub sign-in failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mt-4 text-center">
        <p>Log in using:</p>
        <button
          onClick={handleGoogleSignIn}
          className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Google
        </button>
        <button
          onClick={handleGithubSignIn}
          className="mt-2 w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded"
        >
          GitHub
        </button>
      </div>
    </div>
  );
}
