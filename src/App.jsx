import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Bell, CalendarDays, Check,
  ChevronRight, CircleDollarSign, CreditCard, Download, Filter, Home,
  LayoutDashboard, Menu, Moon, Plus, ReceiptText, Search, Settings,
  Sparkles, Sun, Target, Trash2, TrendingDown, TrendingUp, Wallet, X
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STORAGE_KEY = "spendly_transactions_v1";
const BUDGET_KEY = "spendly_budget_v1";
const THEME_KEY = "spendly_theme_v1";

const categories = [
  ["Food & Dining", "🍔"], ["Transport", "🚗"], ["Shopping", "🛍️"],
  ["Bills & Utilities", "💡"], ["Entertainment", "🎬"], ["Health", "❤️"],
  ["Education", "📚"], ["Travel", "✈️"], ["Salary", "💼"], ["Other", "📦"]
];

const starterTransactions = [
  { id: 1, title: "Monthly Salary", amount: 65000, type: "income", category: "Salary", date: "2026-09-01", note: "September salary", account: "Bank" },
  { id: 2, title: "Apartment Rent", amount: 18000, type: "expense", category: "Bills & Utilities", date: "2026-09-02", note: "Monthly rent", account: "Bank" },
  { id: 3, title: "Groceries", amount: 3250, type: "expense", category: "Food & Dining", date: "2026-09-04", note: "Weekly groceries", account: "UPI" },
  { id: 4, title: "Metro & Cab", amount: 1480, type: "expense", category: "Transport", date: "2026-09-06", note: "Commute", account: "UPI" },
  { id: 5, title: "Online Course", amount: 999, type: "expense", category: "Education", date: "2026-09-08", note: "React course", account: "Card" },
  { id: 6, title: "Freelance Design", amount: 8500, type: "income", category: "Other", date: "2026-09-10", note: "Side project", account: "Bank" },
  { id: 7, title: "Movie Night", amount: 720, type: "expense", category: "Entertainment", date: "2026-09-13", note: "Cinema + snacks", account: "Card" },
  { id: 8, title: "New Backpack", amount: 1850, type: "expense", category: "Shopping", date: "2026-09-17", note: "College backpack", account: "Card" }
];

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}
function dateLabel(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function categoryEmoji(category) {
  return categories.find(c => c[0] === category)?.[1] || "📦";
}
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export default function App() {
  const [transactions, setTransactions] = useState(() => load(STORAGE_KEY, starterTransactions));
  const [budget, setBudget] = useState(() => load(BUDGET_KEY, 30000));
  const [dark, setDark] = useState(() => load(THEME_KEY, true));
  const [modal, setModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem(BUDGET_KEY, JSON.stringify(budget)), [budget]);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(dark));
    document.body.className = dark ? "dark" : "light";
  }, [dark]);

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === "income").reduce((s,t) => s+t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s,t) => s+t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }
  function saveTransaction(data) {
    if (data.id) setTransactions(prev => prev.map(t => t.id === data.id ? data : t));
    else setTransactions(prev => [{ ...data, id: Date.now() }, ...prev]);
    setModal(null);
    notify(data.id ? "Transaction updated" : "Transaction added");
  }
  function removeTransaction(id) {
    setTransactions(prev => prev.filter(t => t.id !== id));
    notify("Transaction deleted");
  }
  function exportCSV() {
    const rows = [["Title","Type","Amount","Category","Date","Account","Note"], ...transactions.map(t => [t.title,t.type,t.amount,t.category,t.date,t.account,t.note])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "spendly-transactions.csv"; a.click();
    URL.revokeObjectURL(a.href);
    notify("CSV exported");
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} close={() => setSidebarOpen(false)} />
      <main className="main">
        <Header onMenu={() => setSidebarOpen(true)} dark={dark} setDark={setDark} />
        <Routes>
          <Route path="/" element={<Dashboard transactions={transactions} totals={totals} budget={budget} onAdd={() => setModal({type:"add"})} onEdit={t => setModal({type:"edit", data:t})} onDelete={removeTransaction} onExport={exportCSV} />} />
          <Route path="/transactions" element={<Transactions transactions={transactions} onAdd={() => setModal({type:"add"})} onEdit={t => setModal({type:"edit",data:t})} onDelete={removeTransaction} />} />
          <Route path="/analytics" element={<Analytics transactions={transactions} budget={budget} />} />
          <Route path="/budget" element={<Budget transactions={transactions} budget={budget} setBudget={setBudget} notify={notify} />} />
          <Route path="/settings" element={<SettingsPage transactions={transactions} setTransactions={setTransactions} setBudget={setBudget} budget={budget} notify={notify} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {modal && <TransactionModal initial={modal.data} onClose={() => setModal(null)} onSave={saveTransaction} />}
      {toast && <div className="toast"><Check size={18}/>{toast}</div>}
    </div>
  );
}

function Sidebar({open, close}) {
  const location = useLocation();
  const nav = useNavigate();
  const items = [
    ["/", "Overview", LayoutDashboard], ["/transactions", "Transactions", ReceiptText],
    ["/analytics", "Analytics", BarChart3], ["/budget", "Budget Planner", Target],
    ["/settings", "Settings", Settings]
  ];
  return <aside className={`sidebar ${open ? "mobile-open":""}`}>
    <div className="brand">
      <div className="brand-icon"><Wallet size={21}/></div>
      <div><strong>Spendly</strong><span>Money, made simple.</span></div>
      <button className="icon-btn mobile-close" onClick={close}><X/></button>
    </div>
    <div className="profile-mini">
      <div className="avatar">YS</div>
      <div><strong>Yazhini</strong><span>Personal account</span></div>
    </div>
    <nav>
      <small>WORKSPACE</small>
      {items.map(([path,label,Icon]) => <button key={path} className={location.pathname===path?"active":""} onClick={()=>{nav(path);close();}}>
        <Icon size={19}/><span>{label}</span>{location.pathname===path && <ChevronRight size={15} className="nav-arrow"/>}
      </button>)}
    </nav>
    <div className="sidebar-card">
      <Sparkles size={18}/>
      <strong>Smart money tip</strong>
      <p>Review your subscriptions every month to find easy savings.</p>
    </div>
    <div className="sidebar-bottom">v1.0 • React Expense Manager</div>
  </aside>
}

function Header({onMenu,dark,setDark}) {
  const location = useLocation();
  const title = {"/":"Overview","/transactions":"Transactions","/analytics":"Analytics","/budget":"Budget Planner","/settings":"Settings"}[location.pathname] || "Overview";
  return <header className="topbar">
    <div className="mobile-menu"><button className="icon-btn" onClick={onMenu}><Menu/></button></div>
    <div><p className="eyebrow">PERSONAL FINANCE</p><h1>{title}</h1></div>
    <div className="top-actions">
      <button className="icon-btn" title="Notifications"><Bell size={19}/><i/></button>
      <button className="icon-btn" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
      <div className="top-avatar">YS</div>
    </div>
  </header>
}

function Dashboard({transactions,totals,budget,onAdd,onEdit,onDelete,onExport}) {
  const expenses = transactions.filter(t=>t.type==="expense");
  const budgetUsed = Math.min(100, budget ? totals.expense/budget*100 : 0);
  const recent = transactions.slice(0,5);
  const monthly = [...Array(6)].map((_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-5+i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const income=transactions.filter(t=>t.type==="income"&&t.date.startsWith(key)).reduce((s,t)=>s+t.amount,0);
    const expense=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(key)).reduce((s,t)=>s+t.amount,0);
    return {name:d.toLocaleString("en",{month:"short"}), income, expense};
  });
  const topCategory = Object.entries(expenses.reduce((a,t)=>(a[t.category]=(a[t.category]||0)+t.amount,a),{})).sort((a,b)=>b[1]-a[1])[0];
  return <section className="page">
    <div className="hero-row">
      <div><p className="welcome">Good afternoon, Yazhini 👋</p><h2>Here's your money snapshot.</h2><p className="muted">Track your cash flow, stay within budget, and build better habits.</p></div>
      <div className="hero-actions"><button className="btn secondary" onClick={onExport}><Download size={17}/> Export CSV</button><button className="btn primary" onClick={onAdd}><Plus size={18}/> Add transaction</button></div>
    </div>
    <div className="stats-grid">
      <StatCard label="Available balance" value={money(totals.balance)} icon={Wallet} tone="violet" change="Your current net balance"/>
      <StatCard label="Total income" value={money(totals.income)} icon={TrendingUp} tone="green" change="Money received"/>
      <StatCard label="Total expenses" value={money(totals.expense)} icon={TrendingDown} tone="red" change="Money spent"/>
      <StatCard label="Budget remaining" value={money(Math.max(0,budget-totals.expense))} icon={Target} tone="blue" change={`${Math.max(0,100-budgetUsed).toFixed(0)}% budget left`}/>
    </div>
    <div className="dashboard-grid">
      <div className="card chart-card">
        <div className="card-head"><div><h3>Cash flow</h3><p>Income vs expenses over the last 6 months</p></div><span className="pill">6 months</span></div>
        <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><defs><linearGradient id="inc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopOpacity=".25"/><stop offset="95%" stopOpacity="0"/></linearGradient><linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopOpacity=".2"/><stop offset="95%" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} opacity=".1"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`}/><Tooltip formatter={v=>money(v)} /><Area type="monotone" dataKey="income" stroke="var(--green)" fill="url(#inc)" strokeWidth={2.5}/><Area type="monotone" dataKey="expense" stroke="var(--red)" fill="url(#exp)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="card budget-card">
        <div className="card-head"><div><h3>Monthly budget</h3><p>September spending</p></div><Target size={19}/></div>
        <div className="budget-ring"><div><strong>{budgetUsed.toFixed(0)}%</strong><span>used</span></div></div>
        <div className="budget-numbers"><div><span>Spent</span><strong>{money(totals.expense)}</strong></div><div><span>Limit</span><strong>{money(budget)}</strong></div></div>
        <div className="progress"><span style={{width:`${budgetUsed}%`}}/></div>
        <p className={budgetUsed>100?"danger":"muted"}>{budgetUsed>100?"You've exceeded your budget.":"You are within your planned monthly budget."}</p>
      </div>
    </div>
    <div className="lower-grid">
      <div className="card">
        <div className="card-head"><div><h3>Recent transactions</h3><p>Your latest activity</p></div><a href="/transactions">View all <ChevronRight size={15}/></a></div>
        <TransactionList transactions={recent} onEdit={onEdit} onDelete={onDelete}/>
      </div>
      <div className="card insight-card">
        <div className="insight-icon"><Sparkles size={19}/></div>
        <h3>Spending insight</h3>
        {topCategory ? <><p>Your highest spending category is <strong>{categoryEmoji(topCategory[0])} {topCategory[0]}</strong>.</p><div className="insight-value">{money(topCategory[1])}<span> spent</span></div></> : <p>Add a few expenses to unlock insights.</p>}
        <div className="tip"><CircleDollarSign size={17}/><span>Small, consistent savings can make a big difference over time.</span></div>
      </div>
    </div>
  </section>
}

function StatCard({label,value,icon:Icon,tone,change}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div><span>{label}</span><h3>{value}</h3><small>{change}</small></div></div>
}

function TransactionList({transactions,onEdit,onDelete}) {
  if(!transactions.length) return <div className="empty">No transactions found.</div>;
  return <div className="transaction-list">{transactions.map(t=><div className="transaction-row" key={t.id}>
    <div className="transaction-icon">{categoryEmoji(t.category)}</div>
    <div className="transaction-main"><strong>{t.title}</strong><span>{t.category} • {dateLabel(t.date)}</span></div>
    <span className={`account-tag ${t.account.toLowerCase()}`}>{t.account}</span>
    <strong className={t.type==="income"?"income":"expense"}>{t.type==="income"?"+":"−"}{money(t.amount)}</strong>
    <div className="row-actions"><button onClick={()=>onEdit(t)}>Edit</button><button className="danger-text" onClick={()=>onDelete(t.id)}>Delete</button></div>
  </div>)}</div>
}

function Transactions({transactions,onAdd,onEdit,onDelete}) {
  const [query,setQuery]=useState(""); const [type,setType]=useState("all"); const [category,setCategory]=useState("all");
  const filtered=transactions.filter(t=>(type==="all"||t.type===type)&&(category==="all"||t.category===category)&&`${t.title} ${t.category} ${t.note}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="page">
    <div className="hero-row"><div><p className="welcome">Your money activity</p><h2>Transactions</h2><p className="muted">Search, filter and manage every income and expense.</p></div><button className="btn primary" onClick={onAdd}><Plus size={18}/> Add transaction</button></div>
    <div className="card filters">
      <div className="search-box"><Search size={18}/><input placeholder="Search transactions..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="filter-select"><Filter size={16}/><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></div>
      <div className="filter-select"><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c[0]}>{c[0]}</option>)}</select></div>
    </div>
    <div className="card table-card"><div className="table-summary"><strong>{filtered.length} transactions</strong><span>Showing matching activity</span></div><TransactionList transactions={filtered} onEdit={onEdit} onDelete={onDelete}/></div>
  </section>
}

function Analytics({transactions,budget}) {
  const expenseData=Object.entries(transactions.filter(t=>t.type==="expense").reduce((a,t)=>(a[t.category]=(a[t.category]||0)+t.amount,a),{})).sort((a,b)=>b[1]-a[1]);
  const colors=["#8b5cf6","#22c55e","#ef4444","#3b82f6","#f59e0b","#06b6d4","#ec4899","#84cc16"];
  const monthly=[...Array(6)].map((_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return {name:d.toLocaleString("en",{month:"short"}),value:transactions.filter(t=>t.type==="expense"&&t.date.startsWith(k)).reduce((s,t)=>s+t.amount,0)}});
  const expense=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  return <section className="page"><div className="hero-row"><div><p className="welcome">Understand your habits</p><h2>Analytics</h2><p className="muted">A visual breakdown of where your money is going.</p></div></div>
    <div className="analytics-grid">
      <div className="card chart-card large"><div className="card-head"><div><h3>Spending trend</h3><p>Monthly expense movement</p></div></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity=".1"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip formatter={v=>money(v)}/><Bar dataKey="value" radius={[8,8,0,0]}>{monthly.map((_,i)=><Cell key={i} fill="var(--accent)"/>)}</Bar></BarChart></ResponsiveContainer></div></div>
      <div className="card"><div className="card-head"><div><h3>Category split</h3><p>Total expenses: {money(expense)}</p></div></div><div className="pie-wrap"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={expenseData.map(([name,value])=>({name,value}))} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{expenseData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{expenseData.slice(0,6).map(([name,value],i)=><div key={name}><i style={{background:colors[i%colors.length]}}/><span>{categoryEmoji(name)} {name}</span><strong>{money(value)}</strong></div>)}</div></div>
    </div>
    <div className="card">
      <div className="card-head"><div><h3>Financial health</h3><p>Based on your recorded transactions</p></div><span className="health-badge">{expense<=budget?"Within budget":"Over budget"}</span></div>
      <div className="health-grid"><HealthItem icon={TrendingUp} title="Income recorded" value={money(transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0))}/><HealthItem icon={ReceiptText} title="Transactions" value={transactions.length}/><HealthItem icon={Target} title="Budget utilization" value={`${budget?Math.round(expense/budget*100):0}%`}/><HealthItem icon={CircleDollarSign} title="Avg. expense" value={money(transactions.filter(t=>t.type==="expense").length?expense/transactions.filter(t=>t.type==="expense").length:0)}/></div>
    </div>
  </section>
}
function HealthItem({icon:Icon,title,value}){return <div className="health-item"><div className="mini-icon"><Icon size={18}/></div><span>{title}</span><strong>{value}</strong></div>}

function Budget({transactions,budget,setBudget,notify}) {
  const [value,setValue]=useState(budget); const spent=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0); const pct=budget?spent/budget*100:0;
  const cat=Object.entries(transactions.filter(t=>t.type==="expense").reduce((a,t)=>(a[t.category]=(a[t.category]||0)+t.amount,a),{})).sort((a,b)=>b[1]-a[1]);
  return <section className="page"><div className="hero-row"><div><p className="welcome">Plan ahead</p><h2>Budget Planner</h2><p className="muted">Set a monthly spending limit and keep your expenses on track.</p></div></div>
    <div className="budget-layout">
      <div className="card budget-editor"><div className="section-icon"><Target/></div><h3>Monthly spending limit</h3><p className="muted">How much are you comfortable spending this month?</p><div className="big-input"><span>₹</span><input type="number" value={value} onChange={e=>setValue(Number(e.target.value))}/></div><button className="btn primary full" onClick={()=>{setBudget(value);notify("Budget updated")}}>Save budget</button></div>
      <div className="card budget-status"><div className="card-head"><div><h3>Budget status</h3><p>Current month</p></div><span className={pct>100?"status danger-bg":"status"}>{pct>100?"Over budget":"On track"}</span></div><div className="status-number"><strong>{money(Math.max(0,budget-spent))}</strong><span>remaining</span></div><div className="progress big"><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="status-row"><span>Spent <b>{money(spent)}</b></span><span>Limit <b>{money(budget)}</b></span></div></div>
    </div>
    <div className="card"><div className="card-head"><div><h3>Category budgets</h3><p>Where most of your spending is going</p></div></div><div className="category-bars">{cat.map(([name,amount],i)=><div className="cat-bar" key={name}><div><span>{categoryEmoji(name)} {name}</span><strong>{money(amount)}</strong></div><div className="progress"><span style={{width:`${Math.min(100,amount/(budget||1)*100*1.8)}%`}}/></div></div>)}</div></div>
  </section>
}

function SettingsPage({transactions,setTransactions,setBudget,budget,notify}) {
  function reset(){if(confirm("Reset all data to the demo transactions?")){setTransactions(starterTransactions);setBudget(30000);notify("Demo data restored")}}
  return <section className="page"><div className="hero-row"><div><p className="welcome">Customize your workspace</p><h2>Settings</h2><p className="muted">Manage your local finance data and preferences.</p></div></div>
    <div className="settings-grid">
      <div className="card setting-card"><div className="setting-icon"><Wallet/></div><div><h3>Local storage</h3><p>Transactions are saved automatically in this browser. No account or server is required.</p></div><span className="status">Active</span></div>
      <div className="card setting-card"><div className="setting-icon"><CircleDollarSign/></div><div><h3>Currency</h3><p>All amounts are displayed in Indian Rupees (₹).</p></div><span className="pill">INR</span></div>
      <div className="card setting-card"><div className="setting-icon"><ReceiptText/></div><div><h3>Data controls</h3><p>You currently have {transactions.length} transactions and a {money(budget)} monthly budget.</p></div><button className="btn danger-btn" onClick={reset}><Trash2 size={16}/> Reset demo data</button></div>
    </div>
  </section>
}

function TransactionModal({initial,onClose,onSave}) {
  const [form,setForm]=useState(initial||{title:"",amount:"",type:"expense",category:"Food & Dining",date:new Date().toISOString().slice(0,10),note:"",account:"UPI"});
  const [errors,setErrors]=useState({});
  function change(k,v){setForm(f=>({...f,[k]:v}))}
  function submit(e){e.preventDefault();const er={};if(!form.title.trim())er.title="Title is required";if(!form.amount||Number(form.amount)<=0)er.amount="Enter an amount greater than 0";if(!form.date)er.date="Choose a date";setErrors(er);if(Object.keys(er).length)return;onSave({...form,amount:Number(form.amount)})}
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">MONEY ENTRY</p><h2>{initial?"Edit transaction":"Add transaction"}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <form onSubmit={submit}>
      <div className="type-toggle"><button type="button" className={form.type==="expense"?"selected expense-tab":""} onClick={()=>change("type","expense")}><ArrowDownLeft/> Expense</button><button type="button" className={form.type==="income"?"selected income-tab":""} onClick={()=>change("type","income")}><ArrowUpRight/> Income</button></div>
      <div className="form-grid"><label>Title<input value={form.title} onChange={e=>change("title",e.target.value)} placeholder="e.g. Grocery shopping"/>{errors.title&&<small className="error">{errors.title}</small>}</label><label>Amount<input type="number" min="1" value={form.amount} onChange={e=>change("amount",e.target.value)} placeholder="0"/>{errors.amount&&<small className="error">{errors.amount}</small>}</label><label>Category<select value={form.category} onChange={e=>change("category",e.target.value)}>{categories.map(c=><option key={c[0]}>{c[0]}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={e=>change("date",e.target.value)}/>{errors.date&&<small className="error">{errors.date}</small>}</label><label>Account<select value={form.account} onChange={e=>change("account",e.target.value)}><option>UPI</option><option>Bank</option><option>Card</option><option>Cash</option></select></label><label>Note<input value={form.note} onChange={e=>change("note",e.target.value)} placeholder="Optional note"/></label></div>
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary">{initial?"Save changes":"Add transaction"}</button></div>
    </form>
  </div></div>
}