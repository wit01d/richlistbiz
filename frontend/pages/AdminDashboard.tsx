import { Activity, AlertTriangle, CheckCircle, Crown, DollarSign, Pause, Play, RotateCcw, Shield, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import {
  COLORS,
  DEPOSIT_AMOUNT,
  SUCCESSOR_SEQUENCE_MAX,
  formatCurrency,
  formatTime,
  useReferralSimulation,
} from '../ux/hooks/useReferralSimulation';
import { ChartTooltip, StatCard } from '../ui/primitives';
import ReferralSimulation from './ReferralView';

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================
const SectionHeader: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; title: string; color: string }> = ({ icon: Icon, title, color }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
      <Icon size={20} />
    </div>
    <h2 className="text-lg font-display font-semibold text-white">{title}</h2>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function AdminDashboard() {
  // Single simulation instance shared with ReferralSimulation
  const simulation = useReferralSimulation({
    trackHistory: true,
    enableAnimations: true,  // Enable for tree visualization
    enableFraudDetection: true,
  });

  const {
    state,
    isPlaying,
    speed,
    setIsPlaying,
    setSpeed,
    step,
    reset,
    realUsers,
    depositedUsers,
    verifiedUsers,
    pendingUsers,
    unverifiedUsers,
    topEarners,
    topRecruiters,
    fraudAlerts,
    getUserName,
  } = simulation;

  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'last50' | 'last20'>('all');

  // Chart tooltip value formatter
  const formatChartValue = (name: string, value: number) =>
    name.includes('Revenue') || name.includes('Balance') ? formatCurrency(value) : value;

  // Chart Data
  const filteredHistory = useMemo(() => {
    if (selectedTimeRange === 'last20') return state.history.slice(-20);
    if (selectedTimeRange === 'last50') return state.history.slice(-50);
    return state.history;
  }, [state.history, selectedTimeRange]);

  const userGrowthData = useMemo(() =>
    filteredHistory.map(h => ({
      name: h.label,
      'Total Users': h.totalUsers,
      'Deposited': h.depositedUsers,
      'Pending': h.pendingUsers,
    })),
    [filteredHistory]
  );

  const revenueData = useMemo(() =>
    filteredHistory.map(h => ({
      name: h.label,
      'Revenue': h.totalRevenue,
      'System Balance': h.systemBalance,
    })),
    [filteredHistory]
  );

  const { earningsDistribution, recruiterDistribution } = useMemo(() => {
    const earningsCounts = [0, 0, 0, 0, 0];
    const recruiterCounts = [0, 0, 0, 0, 0];

    for (const u of realUsers) {
      const e = u.totalEarnings;
      if (e === 0) earningsCounts[0]++;
      else if (e <= 50) earningsCounts[1]++;
      else if (e <= 100) earningsCounts[2]++;
      else if (e <= 200) earningsCounts[3]++;
      else earningsCounts[4]++;

      const r = u.depositingRecruits;
      if (r === 0) recruiterCounts[0]++;
      else if (r <= 3) recruiterCounts[1]++;
      else if (r <= 6) recruiterCounts[2]++;
      else if (r < SUCCESSOR_SEQUENCE_MAX) recruiterCounts[3]++;
      else recruiterCounts[4]++;
    }

    return {
      earningsDistribution: [
        { range: '€0', count: earningsCounts[0] },
        { range: '€1-50', count: earningsCounts[1] },
        { range: '€51-100', count: earningsCounts[2] },
        { range: '€101-200', count: earningsCounts[3] },
        { range: '€200+', count: earningsCounts[4] },
      ],
      recruiterDistribution: [
        { range: '0', count: recruiterCounts[0] },
        { range: '1-3', count: recruiterCounts[1] },
        { range: '4-6', count: recruiterCounts[2] },
        { range: `7-${SUCCESSOR_SEQUENCE_MAX - 1}`, count: recruiterCounts[3] },
        { range: `${SUCCESSOR_SEQUENCE_MAX}+`, count: recruiterCounts[4] },
      ],
    };
  }, [realUsers]);

  const avgEarnings = depositedUsers.length > 0
    ? (depositedUsers.reduce((sum, u) => sum + u.totalEarnings, 0) / depositedUsers.length).toFixed(2)
    : '0';

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 pb-8 text-white">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent">
          Admin Console
        </h1>
        <p className="text-gray-400 text-sm mt-2">Real-time Platform Analytics & Monitoring</p>
      </header>

      {/* Controls */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6">
        <div className="flex gap-3 justify-center items-center flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              isPlaying
                ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50 hover:bg-neon-pink/30'
                : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/30'
            }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'} Simulation
          </button>
          <button
            onClick={step}
            disabled={isPlaying}
            className="px-5 py-2.5 rounded-lg font-medium bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step
          </button>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-neon-purple"
          >
            <option value={500}>Slow (500ms)</option>
            <option value={200}>Normal (200ms)</option>
            <option value={100}>Fast (100ms)</option>
            <option value={50}>Very Fast (50ms)</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400">
            <Activity size={14} className={isPlaying ? 'text-emerald-400 animate-pulse' : 'text-gray-500'} />
            {isPlaying ? 'Simulation Running' : 'Simulation Paused'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={realUsers.length}
          subtext={`${depositedUsers.length} deposited, ${pendingUsers.length} pending`}
          color="text-neon-blue"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(state.totalDeposited)}
          subtext={`Avg €${avgEarnings}/user`}
          color="text-neon-pink"
        />
        <StatCard
          icon={Wallet}
          label="System Balance"
          value={formatCurrency(state.systemBalance)}
          subtext="From shallow chains"
          color="text-neon-purple"
        />
        <StatCard
          icon={Crown}
          label="Successors"
          value={state.successorCount}
          subtext="Nominations triggered"
          color="text-emerald-400"
        />
      </div>

      {/* ================================================================== */}
      {/* OVERVIEW SECTION */}
      {/* ================================================================== */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <SectionHeader icon={Activity} title="Overview" color="text-neon-purple" />
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'last50', label: 'Last 50' },
              { id: 'last20', label: 'Last 20' },
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setSelectedTimeRange(range.id as typeof selectedTimeRange)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  selectedTimeRange === range.id
                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-neon-blue" />
              User Growth
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.neonBlue} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.neonBlue} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDeposited" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.neonPink} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.neonPink} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip formatValue={formatChartValue} />} />
                  <Legend />
                  <Area type="monotone" dataKey="Total Users" stroke={COLORS.neonBlue} fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="Deposited" stroke={COLORS.neonPink} fillOpacity={1} fill="url(#colorDeposited)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-neon-pink" />
              Revenue & System Balance
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip content={<ChartTooltip formatValue={formatChartValue} />} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke={COLORS.neonPink} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="System Balance" stroke={COLORS.neonPurple} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              Earnings Distribution
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="range" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip formatValue={formatChartValue} />} />
                  <Bar dataKey="count" fill={COLORS.neonPurple} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* USERS SECTION */}
      {/* ================================================================== */}
      <div className="mb-8">
        <SectionHeader icon={Users} title="Users" color="text-neon-blue" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Earners */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              Top Earners
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {topEarners.filter(u => u.totalEarnings > 0).length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">No earnings yet</div>
              ) : (
                topEarners.filter(u => u.totalEarnings > 0).slice(0, 10).map((user, i) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-500 text-yellow-900' : i === 1 ? 'bg-gray-400 text-gray-900' : i === 2 ? 'bg-amber-600 text-amber-100' : 'bg-white/10 text-gray-400'
                      }`}>{i + 1}</span>
                      <div>
                        <span className="text-white font-medium">{user.name}</span>
                        {user.successorNominated && <span className="ml-2 text-xs text-neon-pink">SUCCESSOR</span>}
                      </div>
                    </div>
                    <span className="text-neon-pink font-bold">€{user.totalEarnings}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Recruiters */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-neon-blue" />
              Top Recruiters
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {topRecruiters.filter(u => u.directRecruits > 0).length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">No recruiters yet</div>
              ) : (
                topRecruiters.filter(u => u.directRecruits > 0).slice(0, 10).map((user, i) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-neon-blue text-white' : i === 1 ? 'bg-neon-purple text-white' : i === 2 ? 'bg-neon-pink text-white' : 'bg-white/10 text-gray-400'
                      }`}>{i + 1}</span>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neon-blue font-bold">{user.directRecruits}</span>
                      <span className="text-gray-500 text-sm ml-1">recruits</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Users */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Pending Deposits ({pendingUsers.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingUsers.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">No pending users</div>
              ) : (
                pendingUsers.slice(0, 10).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-amber-500/20 text-amber-400">{user.name.charAt(0)}</span>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded">PENDING</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unverified Users */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={16} className="text-red-400" />
              Unverified Users ({unverifiedUsers.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unverifiedUsers.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">All users verified</div>
              ) : (
                unverifiedUsers.slice(0, 10).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-red-500/20 text-red-400">{user.name.charAt(0)}</span>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                    <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">UNVERIFIED</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FINANCIAL SECTION */}
      {/* ================================================================== */}
      <div className="mb-8">
        <SectionHeader icon={DollarSign} title="Financial" color="text-neon-pink" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={DollarSign} label="Gross Revenue" value={formatCurrency(state.totalDeposited)} subtext={`${depositedUsers.length} deposits @ €${DEPOSIT_AMOUNT}`} color="text-neon-pink" />
          <StatCard icon={Wallet} label="Net to Users" value={formatCurrency(state.totalDeposited - state.systemBalance)} subtext="Distributed to Position 1" color="text-emerald-400" />
          <StatCard icon={Shield} label="System Retained" value={formatCurrency(state.systemBalance)} subtext={`${state.totalDeposited > 0 ? ((state.systemBalance / state.totalDeposited) * 100).toFixed(1) : 0}% of total`} color="text-neon-purple" />
          <StatCard icon={Activity} label="Avg Transaction" value={`€${DEPOSIT_AMOUNT}`} subtext="Fixed deposit amount" color="text-neon-blue" />
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
          <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            Recent Transactions
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.listlines.slice(0, 10).map(listline => (
              <div key={listline.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-neon-pink/20 text-neon-pink">€</span>
                  <div>
                    <span className="text-white font-medium">{listline.userName}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="text-neon-pink font-medium">{listline.recipientName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold">€{DEPOSIT_AMOUNT}</span>
                  <div className="text-xs text-gray-500">{formatTime(listline.timestamp)}</div>
                </div>
              </div>
            ))}
            {state.listlines.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-8">No transactions yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ALERTS SECTION */}
      {/* ================================================================== */}
      <div className="mb-8">
        <SectionHeader icon={AlertTriangle} title={`Alerts ${fraudAlerts.length > 0 ? `(${fraudAlerts.length})` : ''}`} color="text-red-400" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4">Fraud Alerts</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fraudAlerts.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                  No alerts - System operating normally
                </div>
              ) : (
                fraudAlerts.slice(0, 10).map(alert => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl ${
                    alert.severity === 'high' ? 'bg-red-500/20 border border-red-500/30' :
                    alert.severity === 'medium' ? 'bg-amber-500/20 border border-amber-500/30' :
                    'bg-neon-blue/20 border border-neon-blue/30'
                  }`}>
                    <AlertTriangle size={18} className={alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-neon-blue'} />
                    <div className="flex-1">
                      <div className="text-white text-sm">{alert.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatTime(alert.timestamp)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <h3 className="text-sm font-display font-semibold text-white mb-4">Event Log</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
              {state.events.slice(0, 20).map(event => (
                <div key={event.id} className={`p-2 rounded-lg ${
                  event.type === 'successor' ? 'bg-neon-pink/10 border border-neon-pink/20 text-neon-pink' :
                  event.type === 'deposit' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                  event.type === 'fraud_alert' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                  'bg-neon-blue/10 border border-neon-blue/20 text-neon-blue'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>{event.message}</span>
                    <span className="text-gray-500 text-xs">{formatTime(event.timestamp)}</span>
                  </div>
                </div>
              ))}
              {state.events.length === 0 && (
                <div className="text-gray-500 text-center py-8">No events yet - Start the simulation</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SIMULATION SECTION */}
      {/* ================================================================== */}
      <div>
        <SectionHeader icon={Activity} title="Tree Visualization" color="text-neon-purple" />
        <ReferralSimulation
          externalSimulation={simulation}
          hideControls={true}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
