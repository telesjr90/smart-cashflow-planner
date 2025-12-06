import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { CATEGORY_LIST } from '../lib/categories';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export default function AddExpenseModal({ isOpen, onClose, onSave, accounts = [] }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('food'); 
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [type, setType] = useState('expense'); // 'expense' or 'income'

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description) return;

    // --- Unified Schema Construction ---
    const newTransaction = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount),
      description,
      category: categoryId,
      accountId,
      type, // 'expense' | 'income'
      createdAt: new Date().toISOString()
    };

    onSave(newTransaction);
    
    // Reset & Close
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-title-l font-bold text-surface-900">Add Transaction</h2>
          <button 
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-50 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Toggle */}
          <div className="flex p-1 bg-surface-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-caption font-bold rounded-xl transition-all ${type === 'expense' ? 'bg-white shadow-sm text-danger-500' : 'text-surface-500'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-caption font-bold rounded-xl transition-all ${type === 'income' ? 'bg-white shadow-sm text-success-500' : 'text-surface-500'}`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-caption font-semibold text-surface-500 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-title-l font-bold text-surface-400">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-surface-900 bg-surface-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none placeholder:text-surface-300"
                autoFocus
              />
            </div>
          </div>

          {/* Category Grid */}
          <div>
            <label className="block text-caption font-semibold text-surface-500 mb-3">Category</label>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORY_LIST.map((cat) => {
                const Icon = cat.icon;
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' 
                        : 'bg-white border-surface-200 hover:border-primary-200'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${cat.color} ${isSelected ? 'scale-110' : ''}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-primary-700' : 'text-surface-500'}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details (Date & Note) */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              icon={Calendar}
            />
            <Input 
              label="Description" 
              placeholder="For?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          {/* Account Select */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-caption font-semibold text-surface-500 mb-2">Account</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {accounts.map((acct) => (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => setAccountId(acct.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl border text-caption font-semibold transition-all ${
                      accountId === acct.id
                        ? 'bg-surface-900 text-white border-surface-900'
                        : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    {acct.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <Button type="submit" fullWidth size="lg">
              Save Transaction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
