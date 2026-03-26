import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LogOut, Plus, Trash2, DollarSign, PieChart as PieChartIcon, List } from 'lucide-react';

interface Expense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

const CATEGORIES = ['Food', 'Travel', 'Bills', 'Entertainment', 'Other'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expensesData: Expense[] = [];
        snapshot.forEach((doc) => {
          expensesData.push({ id: doc.id, ...doc.data() } as Expense);
        });
        setExpenses(expensesData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'expenses');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !amount || !category || !date) return;

    try {
      const expenseData = {
        userId: user.uid,
        title,
        amount: parseFloat(amount),
        category,
        date: new Date(date).toISOString(),
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'expenses'), expenseData);
      setTitle('');
      setAmount('');
      setCategory(CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Tracker</h1>
          <p className="text-gray-500 mb-8">Track your spending, analyze your habits, and take control of your finances.</p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByCategory = CATEGORIES.map(category => {
    const value = expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: category, value };
  }).filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <DollarSign size={24} />
            <span className="font-bold text-xl text-gray-900">ExpenseTracker</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Add Expense & Summary */}
          <div className="lg:col-span-1 space-y-8">
            {/* Total Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Expenses</h2>
              <p className="text-4xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
            </div>

            {/* Add Expense Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g., Groceries"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors mt-2"
                >
                  Add Expense
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Charts & List */}
          <div className="lg:col-span-2 space-y-8">
            {/* Chart Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>
              </div>
              {expensesByCategory.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No data to display. Add some expenses!
                </div>
              )}
            </div>

            {/* Recent Expenses List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <List className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
              </div>
              
              {expenses.length > 0 ? (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {expense.category.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.title}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{expense.category}</span>
                            <span>•</span>
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">${expense.amount.toFixed(2)}</span>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete expense"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No expenses recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
