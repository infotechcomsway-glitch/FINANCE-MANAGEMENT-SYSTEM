/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  History, 
  PieChart as PieChartIcon,
  Sparkles,
  X,
  Trash2,
  ChevronRight,
  Search,
  Calendar,
  Target,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Transaction, TransactionType, DEFAULT_CATEGORIES, Bill, Budget, Investment } from './types';
import { getFinancialInsights } from './services/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fintrack_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('fintrack_bills');
    return saved ? JSON.parse(saved) : [];
  });
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('fintrack_budgets');
    return saved ? JSON.parse(saved) : [];
  });
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('fintrack_investments');
    return saved ? JSON.parse(saved) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'transaction' | 'bill' | 'budget' | 'investment'>('transaction');
  
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'insights' | 'bills' | 'budgets' | 'investments'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: DEFAULT_CATEGORIES[0].name,
    amount: 0,
    description: ''
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fintrack_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('fintrack_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('fintrack_investments', JSON.stringify(investments));
  }, [investments]);

  // Calculations
  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      balance: income - expenses,
      income,
      expenses
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'MMM dd');
      const dayTransactions = transactions.filter(t => 
        format(parseISO(t.date), 'MMM dd') === dateStr
      );
      
      return {
        name: dateStr,
        income: dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
        expense: dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      };
    });
    return last7Days;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === budget.category)
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        ...budget,
        spent,
        percentage: Math.min((spent / budget.limit) * 100, 100)
      };
    });
  }, [budgets, transactions]);

  const investmentStats = useMemo(() => {
    const totalInvested = investments.reduce((acc, inv) => acc + (inv.purchasePrice * inv.quantity), 0);
    const currentValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    
    return {
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercentage
    };
  }, [investments]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery]);

  // New Form States
  const [newBill, setNewBill] = useState<Partial<Bill>>({
    name: '',
    amount: 0,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'Utilities',
    isPaid: false
  });

  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    category: DEFAULT_CATEGORIES[0].name,
    limit: 0
  });

  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
    assetName: '',
    symbol: '',
    quantity: 0,
    purchasePrice: 0,
    currentPrice: 0,
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'Stock'
  });

  // Handlers
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount: Number(newTx.amount),
      description: newTx.description || '',
      category: newTx.category || 'Other',
      date: newTx.date || format(new Date(), 'yyyy-MM-dd'),
      type: newTx.type as TransactionType,
    };

    setTransactions(prev => [transaction, ...prev]);
    setIsModalOpen(false);
    setNewTx({
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      category: DEFAULT_CATEGORIES[0].name,
      amount: 0,
      description: ''
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    const bill: Bill = {
      id: crypto.randomUUID(),
      name: newBill.name || '',
      amount: Number(newBill.amount),
      dueDate: newBill.dueDate || format(new Date(), 'yyyy-MM-dd'),
      category: newBill.category || 'Utilities',
      isPaid: false
    };
    setBills(prev => [...prev, bill]);
    setIsModalOpen(false);
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const budget: Budget = {
      id: crypto.randomUUID(),
      category: newBudget.category || '',
      limit: Number(newBudget.limit)
    };
    setBudgets(prev => [...prev, budget]);
    setIsModalOpen(false);
  };

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const inv: Investment = {
      id: crypto.randomUUID(),
      assetName: newInvestment.assetName || '',
      symbol: newInvestment.symbol || '',
      quantity: Number(newInvestment.quantity),
      purchasePrice: Number(newInvestment.purchasePrice),
      currentPrice: Number(newInvestment.currentPrice),
      purchaseDate: newInvestment.purchaseDate || format(new Date(), 'yyyy-MM-dd'),
      category: newInvestment.category as any
    };
    setInvestments(prev => [...prev, inv]);
    setIsModalOpen(false);
  };

  const toggleBillPaid = (id: string) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: !b.isPaid } : b));
  };

  const fetchInsights = async () => {
    setIsAiLoading(true);
    const insights = await getFinancialInsights(transactions);
    setAiInsights(insights);
    setIsAiLoading(false);
    setActiveTab('insights');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">FinTrack AI</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<History size={20} />} 
            label="Transactions" 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')} 
          />
          <SidebarItem 
            icon={<Calendar size={20} />} 
            label="Bills" 
            active={activeTab === 'bills'} 
            onClick={() => setActiveTab('bills')} 
          />
          <SidebarItem 
            icon={<Target size={20} />} 
            label="Budgets" 
            active={activeTab === 'budgets'} 
            onClick={() => setActiveTab('budgets')} 
          />
          <SidebarItem 
            icon={<Briefcase size={20} />} 
            label="Investments" 
            active={activeTab === 'investments'} 
            onClick={() => setActiveTab('investments')} 
          />
          <SidebarItem 
            icon={<Sparkles size={20} />} 
            label="AI Insights" 
            active={activeTab === 'insights'} 
            onClick={() => setActiveTab('insights')} 
          />
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={fetchInsights}
            disabled={isAiLoading}
            className="w-full bg-indigo-50 text-indigo-700 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-indigo-100 transition-colors group"
          >
            <Sparkles className={cn("text-indigo-600", isAiLoading && "animate-pulse")} size={24} />
            <span className="text-sm font-semibold">Generate Insights</span>
            <p className="text-xs text-indigo-500 text-center opacity-80">Analyze your spending with Gemini AI</p>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={() => {
              setModalType('transaction');
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={20} />
            <span className="font-medium">Add Transaction</span>
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Total Balance" 
                  value={stats.balance} 
                  icon={<Wallet className="text-indigo-600" />} 
                  trend="+2.5% from last month"
                  color="indigo"
                />
                <StatCard 
                  title="Total Income" 
                  value={stats.income} 
                  icon={<TrendingUp className="text-emerald-600" />} 
                  trend="+12% from last month"
                  color="emerald"
                />
                <StatCard 
                  title="Total Expenses" 
                  value={stats.expenses} 
                  icon={<TrendingDown className="text-rose-600" />} 
                  trend="-4% from last month"
                  color="rose"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800">Spending Overview</h3>
                    <select className="text-xs bg-slate-50 border-none rounded-lg px-2 py-1 focus:ring-0">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 12, fill: '#94A3B8'}} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 12, fill: '#94A3B8'}} 
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="income" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorIncome)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="expense" 
                          stroke="#F43F5E" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorExpense)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Expense by Category</h3>
                  <div className="h-64 flex items-center justify-center">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={DEFAULT_CATEGORIES.find(c => c.name === entry.name)?.color || '#CBD5E1'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
                        <PieChartIcon size={48} className="opacity-20" />
                        No data to display
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-sm text-indigo-600 font-medium hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.slice(0, 5).map(tx => (
                    <TransactionRow key={tx.id} transaction={tx} onDelete={deleteTransaction} />
                  ))}
                  {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      No transactions found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">All Transactions</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-xs bg-slate-100 rounded-full font-medium">All</button>
                  <button className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded-full font-medium">Income</button>
                  <button className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded-full font-medium">Expenses</button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredTransactions.map(tx => (
                  <TransactionRow key={tx.id} transaction={tx} onDelete={deleteTransaction} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bills' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Bill Reminders</h3>
                <button 
                  onClick={() => { setModalType('bill'); setIsModalOpen(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <Plus size={20} /> Add Bill
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bills.map(bill => (
                  <div key={bill.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-lg", bill.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                        {bill.isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </div>
                      <span className="text-lg font-bold text-slate-800">${bill.amount}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{bill.name}</h4>
                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                      <Calendar size={12} /> Due: {format(parseISO(bill.dueDate), 'MMM dd, yyyy')}
                    </p>
                    <button 
                      onClick={() => toggleBillPaid(bill.id)}
                      className={cn(
                        "w-full py-2 rounded-xl text-sm font-bold transition-all",
                        bill.isPaid ? "bg-slate-100 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      )}
                    >
                      {bill.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Budget Tracking</h3>
                <button 
                  onClick={() => { setModalType('budget'); setIsModalOpen(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <Plus size={20} /> Set Budget
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetProgress.map(budget => (
                  <div key={budget.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800">{budget.category}</h4>
                      <span className="text-sm font-medium text-slate-500">${budget.spent} / ${budget.limit}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${budget.percentage}%` }}
                        className={cn(
                          "h-full rounded-full",
                          budget.percentage > 90 ? "bg-rose-500" : budget.percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {budget.percentage >= 100 ? "Over budget!" : `${Math.round(100 - budget.percentage)}% remaining`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Invested" value={investmentStats.totalInvested} icon={<Briefcase className="text-indigo-600" />} trend="Principal" color="indigo" />
                <StatCard title="Current Value" value={investmentStats.currentValue} icon={<TrendingUp className="text-emerald-600" />} trend="Market Value" color="emerald" />
                <StatCard title="Profit / Loss" value={investmentStats.profitLoss} icon={<AlertCircle className={investmentStats.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"} />} trend={`${investmentStats.profitLossPercentage.toFixed(2)}%`} color={investmentStats.profitLoss >= 0 ? "emerald" : "rose"} />
                <button 
                  onClick={() => { setModalType('investment'); setIsModalOpen(true); }}
                  className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                >
                  <Plus size={24} />
                  <span className="text-sm font-bold">Add Asset</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Asset</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Quantity</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Purchase Price</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Current Price</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Total Value</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {investments.map(inv => {
                      const performance = ((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{inv.assetName}</span>
                              <span className="text-xs text-slate-400">{inv.symbol}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{inv.quantity}</td>
                          <td className="p-4 text-sm text-slate-600">${inv.purchasePrice}</td>
                          <td className="p-4 text-sm text-slate-600">${inv.currentPrice}</td>
                          <td className="p-4 text-sm font-bold text-slate-800">${(inv.currentPrice * inv.quantity).toLocaleString()}</td>
                          <td className="p-4">
                            <span className={cn(
                              "text-xs font-bold px-2 py-1 rounded-full",
                              performance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles size={24} />
                    <h3 className="text-xl font-bold">AI Financial Advisor</h3>
                  </div>
                  <p className="text-indigo-100 leading-relaxed">
                    Based on your recent spending habits and income patterns, here are some personalized insights generated by Gemini AI.
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px]">
                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 animate-pulse">Gemini is analyzing your data...</p>
                  </div>
                ) : aiInsights ? (
                  <div className="prose prose-slate max-w-none">
                    <Markdown>{aiInsights}</Markdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center">
                    <Sparkles size={48} className="text-slate-200" />
                    <div>
                      <h4 className="font-bold text-slate-800">No Insights Yet</h4>
                      <p className="text-slate-500 text-sm">Click the button in the sidebar to generate your first report.</p>
                    </div>
                    <button 
                      onClick={fetchInsights}
                      className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition-all"
                    >
                      Generate Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold capitalize">New {modalType}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {modalType === 'transaction' && (
                  <form onSubmit={handleAddTransaction} className="space-y-4">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button type="button" onClick={() => setNewTx(prev => ({ ...prev, type: 'expense' }))} className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", newTx.type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}>Expense</button>
                      <button type="button" onClick={() => setNewTx(prev => ({ ...prev, type: 'income' }))} className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", newTx.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>Income</button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input type="number" required step="0.01" className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xl font-bold" placeholder="0.00" value={newTx.amount || ''} onChange={(e) => setNewTx(prev => ({ ...prev, amount: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" value={newTx.category} onChange={(e) => setNewTx(prev => ({ ...prev, category: e.target.value }))}>
                          {DEFAULT_CATEGORIES.filter(c => c.type === newTx.type).map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                        <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" value={newTx.date} onChange={(e) => setNewTx(prev => ({ ...prev, date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                      <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="e.g. Grocery shopping" value={newTx.description} onChange={(e) => setNewTx(prev => ({ ...prev, description: e.target.value }))} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 active:scale-95">Save Transaction</button>
                  </form>
                )}

                {modalType === 'bill' && (
                  <form onSubmit={handleAddBill} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill Name</label>
                      <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="e.g. Electricity Bill" value={newBill.name} onChange={(e) => setNewBill(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                        <input type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="0.00" value={newBill.amount || ''} onChange={(e) => setNewBill(prev => ({ ...prev, amount: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                        <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" value={newBill.dueDate} onChange={(e) => setNewBill(prev => ({ ...prev, dueDate: e.target.value }))} />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 active:scale-95">Add Bill Reminder</button>
                  </form>
                )}

                {modalType === 'budget' && (
                  <form onSubmit={handleAddBudget} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" value={newBudget.category} onChange={(e) => setNewBudget(prev => ({ ...prev, category: e.target.value }))}>
                        {DEFAULT_CATEGORIES.filter(c => c.type === 'expense').map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Limit</label>
                      <input type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="0.00" value={newBudget.limit || ''} onChange={(e) => setNewBudget(prev => ({ ...prev, limit: Number(e.target.value) }))} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 active:scale-95">Set Budget</button>
                  </form>
                )}

                {modalType === 'investment' && (
                  <form onSubmit={handleAddInvestment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Name</label>
                        <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="e.g. Bitcoin" value={newInvestment.assetName} onChange={(e) => setNewInvestment(prev => ({ ...prev, assetName: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</label>
                        <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="e.g. BTC" value={newInvestment.symbol} onChange={(e) => setNewInvestment(prev => ({ ...prev, symbol: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                        <input type="number" required step="0.00001" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="0.00" value={newInvestment.quantity || ''} onChange={(e) => setNewInvestment(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Price</label>
                        <input type="number" required step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="0.00" value={newInvestment.purchasePrice || ''} onChange={(e) => setNewInvestment(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Market Price</label>
                      <input type="number" required step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="0.00" value={newInvestment.currentPrice || ''} onChange={(e) => setNewInvestment(prev => ({ ...prev, currentPrice: Number(e.target.value) }))} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 active:scale-95">Add Asset</button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
        active 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <span className={cn("transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto opacity-60" />}
    </button>
  );
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: number, icon: React.ReactNode, trend: string, color: 'indigo' | 'emerald' | 'rose' }) {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", colorClasses[color])}>
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          Monthly
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-800">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full", color === 'rose' ? "bg-rose-400" : "bg-emerald-400")} />
        <p className="text-xs text-slate-400 font-medium">{trend}</p>
      </div>
    </div>
  );
}

function TransactionRow({ transaction, onDelete }: { transaction: Transaction, onDelete: (id: string) => void }) {
  const category = DEFAULT_CATEGORIES.find(c => c.name === transaction.category) || DEFAULT_CATEGORIES[8];
  
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: category.color }}
        >
          <History size={18} />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{transaction.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{transaction.category}</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span className="text-[10px] font-medium text-slate-400">{format(parseISO(transaction.date), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <p className={cn(
          "font-bold text-sm",
          transaction.type === 'income' ? "text-emerald-600" : "text-slate-800"
        )}>
          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
