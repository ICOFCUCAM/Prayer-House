import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', country: 'US', zip: '' });

  const tax = cartTotal * 0.08;
  const total = cartTotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const { data: order, error: orderError } = await supabase
        .from('ecom_orders')
        .insert([{
          email: form.email,
          total_price: Math.round(total * 100),
          subtotal_price: Math.round(cartTotal * 100),
          total_tax: Math.round(tax * 100),
          financial_status: 'pending',
          fulfillment_status: 'unfulfilled',
          billing_address: { name: form.name, address1: form.address, city: form.city, country: form.country, zip: form.zip },
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      if (order) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.id,
          title: item.title,
          price: Math.round(item.price * 100),
          quantity: item.quantity,
        }));
        await supabase.from('ecom_order_items').insert(orderItems);
      }

      clearCart();
      navigate(`/order-confirmation?orderId=${order?.id || 'new'}`);
    } catch (err: any) {
      setError('Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Checkout</h1>
        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Billing Information</h3>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'john@example.com' },
                { label: 'Address', key: 'address', type: 'text', placeholder: '123 Main St' },
                { label: 'City', key: 'city', type: 'text', placeholder: 'Lagos' },
                { label: 'ZIP / Postal Code', key: 'zip', type: 'text', placeholder: '100001' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-300 mb-1">{f.label}</label>
                  <input type={f.type} required value={form[f.key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors">
              {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
          </form>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.image && <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-white">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-white font-bold text-base pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
