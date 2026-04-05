import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-gray-400 mb-4">Thank you for your purchase. Your content is ready to access.</p>
        {orderId && <p className="text-sm text-gray-500 mb-8">Order ID: <span className="text-gray-300 font-mono">{orderId}</span></p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
            Continue Browsing
          </Link>
          <Link to="/dashboard" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
