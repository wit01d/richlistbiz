import { Check, ChevronDown, ChevronRight, Copy, Crown, Eye, Gift, Link, LogOut, MousePointerClick, Play, TrendingUp, Trophy, UserPlus, Users, Wallet } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
  PieChart, Pie,
} from 'recharts';
import { logout } from '../services/Keycloak';

interface ListlineStats {
  position1Count: number;
  position2Count: number;
  position3Count: number;
  position4Count: number;
  totalEarningsFromPosition1: number;
}

interface Referral {
  id: string;
  username: string;
  date: string;
  paid: boolean;
}

interface Payment {
  id: string;
  from: string;
  amount: number;
  netAmount: number;
  date: string;
}

interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  registrations: number;
  clickHistory: { date: string; clicks: number }[];
}

interface ReferralTreeNode {
  id: string;
  username: string;
  date: string;
  paid: boolean;
  level: number;
  children: ReferralTreeNode[];
}

interface UserDashboardProps {
  username?: string;
  referralCode?: string;
  listlineStats?: ListlineStats;
  upline?: string[];
  referrals?: Referral[];
  payments?: Payment[];
  linkStats?: LinkStats;
  referralTree?: ReferralTreeNode[];
  onNavigate?: (view: 'dashboard' | 'simulation' | 'admin') => void;
}

const MEMBERSHIP_FEE = 10;
const MAINTENANCE_FEE_PERCENT = 10;
const NET_PAYOUT = MEMBERSHIP_FEE * (1 - MAINTENANCE_FEE_PERCENT / 100);
const SUCCESSOR_THRESHOLD = 10;

const LEVEL_COLORS = [
  { bg: 'bg-neon-purple/20', border: 'border-neon-purple', text: 'text-neon-purple', dot: 'bg-neon-purple' },
  { bg: 'bg-neon-blue/20', border: 'border-neon-blue', text: 'text-neon-blue', dot: 'bg-neon-blue' },
  { bg: 'bg-neon-pink/20', border: 'border-neon-pink', text: 'text-neon-pink', dot: 'bg-neon-pink' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-500' },
];

interface TreeNodeProps {
  node: ReferralTreeNode;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, expandedNodes, toggleNode, level }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const colors = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];

  return (
    <div className="relative">
      {/* Connection line */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-4 h-6 border-l-2 border-b-2 border-gray-700 rounded-bl-lg"
          style={{ marginLeft: `${(level - 1) * 24 + 12}px` }}
        />
      )}

      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-white/5 ${colors.bg} ${colors.border}/30`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={() => toggleNode(node.id)}
            className={`p-1 rounded hover:bg-white/10 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          >
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        ) : (
          <div className="w-6 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          </div>
        )}

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${colors.text}`}>{node.username}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              L{level + 1}
            </span>
            {node.paid ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Deposited
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                Pending
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Joined {node.date}</span>
            {hasChildren && (
              <span className="text-gray-600">• {node.children.length} referral{node.children.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        {hasChildren && (
          <div className="text-right">
            <div className={`text-sm font-medium ${colors.text}`}>
              {node.children.reduce((acc, child) => {
                const countAll = (n: ReferralTreeNode): number =>
                  1 + n.children.reduce((sum, c) => sum + countAll(c), 0);
                return acc + countAll(child);
              }, node.children.length)}
            </div>
            <div className="text-xs text-gray-500">in network</div>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  username = "Member",
  referralCode = "ABC123",
  listlineStats = {
    position1Count: 0,
    position2Count: 0,
    position3Count: 0,
    position4Count: 0,
    totalEarningsFromPosition1: 0,
  },
  upline = [],
  referrals = [],
  payments = [],
  linkStats = {
    totalClicks: 0,
    uniqueClicks: 0,
    registrations: 0,
    clickHistory: [],
  },
  referralTree = [],
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const referralLink = `richlist.biz/?ref=${referralCode}`;

  // Toggle tree node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Link conversion rate
  const conversionRate = useMemo(() => {
    if (linkStats.uniqueClicks === 0) return 0;
    return (linkStats.registrations / linkStats.uniqueClicks) * 100;
  }, [linkStats]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  // Memoized computed values
  const ownListline = useMemo(() => [
    { position: 1, label: "Received Payment", user: upline[2] || null, isSystem: !upline[2] },
    { position: 2, label: "2nd Ancestor", user: upline[1] || null, isSystem: !upline[1] },
    { position: 3, label: "Direct Referrer", user: upline[0] || null, isSystem: !upline[0] },
    { position: 4, label: "You", user: username, isSystem: false },
  ], [upline, username]);

  const { totalReferrals, paidReferrals, totalEarnings, successorEligible, additionalAfterThreshold } = useMemo(() => {
    const total = referrals.length;
    const paid = referrals.filter(r => r.paid).length;
    const earnings = payments.reduce((sum, p) => sum + p.netAmount, 0);
    const eligible = paid >= SUCCESSOR_THRESHOLD;
    return {
      totalReferrals: total,
      paidReferrals: paid,
      totalEarnings: earnings,
      successorEligible: eligible,
      additionalAfterThreshold: Math.max(0, paid - SUCCESSOR_THRESHOLD),
    };
  }, [referrals, payments]);

  // Memoized chart data - Position Distribution
  const positionChartData = useMemo(() => [
    { position: 'P1', count: listlineStats.position1Count, fill: '#ff2d75' },
    { position: 'P2', count: listlineStats.position2Count, fill: '#a855f7' },
    { position: 'P3', count: listlineStats.position3Count, fill: '#3b82f6' },
    { position: 'P4', count: listlineStats.position4Count, fill: '#10b981' },
  ], [listlineStats]);

  // Memoized chart data - Earnings Timeline
  const earningsTimelineData = useMemo(() => {
    if (payments.length === 0) return [];
    return payments
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce((acc, payment, idx) => {
        const cumulative = (acc[idx - 1]?.cumulative || 0) + payment.netAmount;
        acc.push({ date: payment.date, amount: payment.netAmount, cumulative });
        return acc;
      }, [] as { date: string; amount: number; cumulative: number }[]);
  }, [payments]);

  // Memoized chart data - Referral Status Pie
  const referralStatusData = useMemo(() => [
    { name: 'Deposited', value: paidReferrals, fill: '#10b981' },
    { name: 'Pending', value: totalReferrals - paidReferrals, fill: '#eab308' },
  ], [paidReferrals, totalReferrals]);

  const positionStats = useMemo(() => [
    {
      position: 1,
      label: "Position 1",
      description: "Receiving payments",
      count: listlineStats.position1Count,
      earnings: listlineStats.totalEarningsFromPosition1,
      color: "neon-pink",
      icon: "💰",
    },
    {
      position: 2,
      label: "Position 2",
      description: "2nd ancestor in chains",
      count: listlineStats.position2Count,
      earnings: null,
      color: "neon-purple",
      icon: "📊",
    },
    {
      position: 3,
      label: "Position 3",
      description: "Direct referrer",
      count: listlineStats.position3Count,
      earnings: null,
      color: "neon-blue",
      icon: "👥",
    },
    {
      position: 4,
      label: "Position 4",
      description: "Newest member",
      count: listlineStats.position4Count,
      earnings: null,
      color: "neon-green",
      icon: "🌱",
    },
  ], [listlineStats]);

  const stats = useMemo(() => [
    { icon: Users, label: "Direct Referrals", value: totalReferrals.toString(), color: "text-neon-blue", subtext: `${paidReferrals} deposited` },
    { icon: Wallet, label: "Total Earnings", value: `€${totalEarnings.toFixed(2)}`, color: "text-neon-pink", subtext: `${MAINTENANCE_FEE_PERCENT}% maintenance deducted` },
    { icon: Trophy, label: "Global Rank", value: "#---", color: "text-yellow-400", subtext: "Based on earnings" },
    { icon: Gift, label: "Successors Available", value: additionalAfterThreshold.toString(), color: "text-emerald-400", subtext: successorEligible ? "Ready to nominate!" : `${SUCCESSOR_THRESHOLD - paidReferrals} more needed` },
  ], [totalReferrals, paidReferrals, totalEarnings, additionalAfterThreshold, successorEligible]);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pb-8">

      <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="font-display text-3xl text-white mb-1">
            Welcome, <span className="text-neon-pink">{username}</span>
          </h2>
          <p className="font-sans text-gray-400 text-sm">Your listline is active. Start building your network.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('simulation')}
                className="px-4 py-2 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
              >
                <Play size={16} />
                Simulation
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="px-4 py-2 bg-neon-pink/20 border border-neon-pink/50 text-neon-pink hover:bg-neon-pink/30 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
              >
                <Crown size={16} />
                Admin Console
              </button>
            </>
          )}
          <button
            onClick={() => logout()}
            className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-pink/20 rounded-lg">
              <TrendingUp className="text-neon-pink" size={20} />
            </div>
            <div>
              <p className="text-white font-medium">Membership Fee: €{MEMBERSHIP_FEE}</p>
              <p className="text-gray-400 text-xs">Position 1 receives €{NET_PAYOUT} ({MAINTENANCE_FEE_PERCENT}% maintenance fee to system)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Your link:</span>
            <code className="text-neon-blue bg-black/40 px-3 py-1 rounded font-mono text-sm">{referralLink}</code>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-white"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Link Analytics Section */}
      <div className="bg-black/40 backdrop-blur-md border border-neon-blue/30 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-neon-blue/20 rounded-lg">
            <Link className="text-neon-blue" size={20} />
          </div>
          <div>
            <h3 className="text-white font-display text-lg">Referral Link Analytics</h3>
            <p className="text-gray-400 text-xs">Track how your referral link is performing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="text-gray-400" size={16} />
              <span className="text-xs text-gray-500 uppercase">Total Views</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">{linkStats.totalClicks.toLocaleString()}</div>
            <div className="text-xs text-gray-600">All time clicks</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="text-neon-blue" size={16} />
              <span className="text-xs text-gray-500 uppercase">Unique Clicks</span>
            </div>
            <div className="text-2xl font-display font-bold text-neon-blue">{linkStats.uniqueClicks.toLocaleString()}</div>
            <div className="text-xs text-gray-600">Unique visitors</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="text-emerald-400" size={16} />
              <span className="text-xs text-gray-500 uppercase">Registrations</span>
            </div>
            <div className="text-2xl font-display font-bold text-emerald-400">{linkStats.registrations.toLocaleString()}</div>
            <div className="text-xs text-gray-600">Sign-ups from link</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-neon-pink" size={16} />
              <span className="text-xs text-gray-500 uppercase">Conversion</span>
            </div>
            <div className="text-2xl font-display font-bold text-neon-pink">{conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-600">Click to signup rate</div>
          </div>
        </div>

        {linkStats.clickHistory.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={linkStats.clickHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value} clicks`, 'Clicks']}
                />
                <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fill="url(#clicksGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {linkStats.totalClicks === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            <MousePointerClick className="mx-auto mb-2 text-gray-600" size={24} />
            No link clicks yet. Share your referral link to start tracking!
          </div>
        )}
      </div>

      {/* Overview Section */}
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl hover:border-neon-blue/50 transition-colors group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={18} />
                </div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="font-display text-2xl text-white font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.subtext}</div>
            </div>
          ))}
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Position Distribution Bar Chart */}
          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-display text-lg mb-4">Position Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={positionChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="position" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#374151' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#9ca3af' }}
                    formatter={(value: number) => [`${value} listlines`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {positionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">How often you appear at each position</p>
          </div>

          {/* Earnings Timeline Area Chart */}
          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-display text-lg mb-4">Earnings Timeline</h3>
            <div className="h-48">
              {earningsTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={earningsTimelineData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff2d75" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ff2d75" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#374151' }} tickLine={false} tickFormatter={(v) => `€${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number, name: string) => [
                        `€${value.toFixed(2)}`,
                        name === 'cumulative' ? 'Total' : 'Payment'
                      ]}
                    />
                    <Area type="monotone" dataKey="cumulative" stroke="#ff2d75" strokeWidth={2} fill="url(#earningsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No payment data yet
                </div>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">Cumulative earnings over time</p>
          </div>

          {/* Referral Status Donut Chart */}
          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-display text-lg mb-4">Referral Status</h3>
            <div className="h-48 relative">
              {totalReferrals > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={referralStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {referralStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [`${value} referrals`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{Math.round((paidReferrals / totalReferrals) * 100)}%</div>
                      <div className="text-xs text-gray-500">converted</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No referrals yet
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-400">Deposited ({paidReferrals})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-gray-400">Pending ({totalReferrals - paidReferrals})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-display text-lg mb-4 flex items-center gap-2">
              <Crown className="text-yellow-400" size={18} />
              Successor Progress
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Referrals with deposits</span>
                <span className="text-white font-mono">{paidReferrals}/{SUCCESSOR_THRESHOLD}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-neon-purple to-neon-pink h-full transition-all duration-500"
                  style={{ width: `${Math.min((paidReferrals / SUCCESSOR_THRESHOLD) * 100, 100)}%` }}
                />
              </div>
            </div>
            {successorEligible ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400 font-medium mb-1">🎉 Milestone Reached!</p>
                <p className="text-gray-400 text-sm">You have {additionalAfterThreshold} successor(s) to nominate. Each successor will be gifted to your Position 1 (3rd ancestor).</p>
                <button className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center gap-2">
                  Nominate Successor <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm">
                  Recruit <span className="text-neon-pink font-bold">{SUCCESSOR_THRESHOLD - paidReferrals}</span> more members with deposits to unlock the successor nomination feature.
                </p>
              </div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-display text-lg mb-4">Recent Payments</h3>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{payment.from}</p>
                      <p className="text-gray-500 text-xs">{payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-neon-pink font-bold">+€{payment.netAmount.toFixed(2)}</p>
                      <p className="text-gray-600 text-xs">€{payment.amount} - {MAINTENANCE_FEE_PERCENT}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Wallet className="text-gray-600 mb-3" size={32} />
                <p className="text-gray-500 text-sm">No payments yet</p>
                <p className="text-gray-600 text-xs mt-1">You receive €{NET_PAYOUT} when someone in your network reaches Position 4 (3 levels deep)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listline Section */}
      <div className="space-y-6 mb-8">
        <div className="bg-black/40 backdrop-blur-md border border-neon-purple/30 rounded-2xl p-6">
          <h3 className="text-white font-display text-xl mb-2">Your Listline Presence</h3>
          <p className="text-gray-400 text-sm mb-6">
            See how many times you appear at each position across all listlines in the network.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {positionStats.map((stat) => (
              <div
                key={stat.position}
                className={`relative p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${stat.position === 1
                    ? 'bg-neon-pink/10 border-neon-pink'
                    : stat.position === 2
                      ? 'bg-neon-purple/10 border-neon-purple/50'
                      : stat.position === 3
                        ? 'bg-neon-blue/10 border-neon-blue/50'
                        : 'bg-emerald-500/10 border-emerald-500/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${stat.position === 1 ? 'bg-neon-pink/20 text-neon-pink' :
                      stat.position === 2 ? 'bg-neon-purple/20 text-neon-purple' :
                        stat.position === 3 ? 'bg-neon-blue/20 text-neon-blue' :
                          'bg-emerald-500/20 text-emerald-400'
                    }`}>
                    POS {stat.position}
                  </span>
                </div>
                <div className={`text-4xl font-display font-bold mb-1 ${stat.position === 1 ? 'text-neon-pink' :
                    stat.position === 2 ? 'text-neon-purple' :
                      stat.position === 3 ? 'text-neon-blue' :
                        'text-emerald-400'
                  }`}>
                  {stat.count}
                </div>
                <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                <div className="text-xs text-gray-600">{stat.description}</div>
                {stat.earnings !== null && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-500">Earnings from Position 1</div>
                    <div className="text-lg font-bold text-neon-pink">€{stat.earnings.toFixed(2)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-lg">📈</span> What This Means
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-neon-pink/5 rounded-lg border border-neon-pink/20">
                <p className="text-neon-pink font-medium mb-1">Position 1 × {listlineStats.position1Count}</p>
                <p className="text-gray-500">You've received €{NET_PAYOUT} from {listlineStats.position1Count} members</p>
              </div>
              <div className="p-3 bg-neon-purple/5 rounded-lg border border-neon-purple/20">
                <p className="text-neon-purple font-medium mb-1">Position 2 × {listlineStats.position2Count}</p>
                <p className="text-gray-500">You're one level away from earning on {listlineStats.position2Count} chains</p>
              </div>
              <div className="p-3 bg-neon-blue/5 rounded-lg border border-neon-blue/20">
                <p className="text-neon-blue font-medium mb-1">Position 3 × {listlineStats.position3Count}</p>
                <p className="text-gray-500">You directly referred {listlineStats.position3Count} members</p>
              </div>
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <p className="text-emerald-400 font-medium mb-1">Position 4 × {listlineStats.position4Count}</p>
                <p className="text-gray-500">You're the newest member in {listlineStats.position4Count} chains</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-display text-xl mb-2">Your Own Listline</h3>
          <p className="text-gray-400 text-sm mb-6">
            This is who received payment when you joined. Position 1 received €{NET_PAYOUT} from your membership.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {ownListline.map((pos, idx) => (
              <div
                key={pos.position}
                className={`relative p-4 rounded-xl border-2 transition-all ${pos.position === 1
                    ? 'bg-neon-pink/10 border-neon-pink'
                    : pos.position === 4
                      ? 'bg-neon-blue/10 border-neon-blue'
                      : 'bg-white/5 border-white/10'
                  }`}
              >
                <div className="absolute -top-3 left-4 px-2 bg-black text-xs font-mono text-gray-400">
                  Position {pos.position}
                </div>
                <div className={`text-lg font-display mb-1 ${pos.position === 1 ? 'text-neon-pink' : pos.position === 4 ? 'text-neon-blue' : 'text-white'
                  }`}>
                  {pos.isSystem ? 'SYSTEM' : pos.user}
                </div>
                <div className="text-xs text-gray-500">{pos.label}</div>
                {pos.position === 1 && !pos.isSystem && (
                  <div className="mt-2 text-xs text-neon-pink">💰 Received €{NET_PAYOUT}</div>
                )}
                {pos.position === 1 && pos.isSystem && (
                  <div className="mt-2 text-xs text-gray-500">💰 €{NET_PAYOUT} to system</div>
                )}
                {idx < ownListline.length - 1 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="text-gray-600" size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <h4 className="text-white font-medium mb-2">How it works:</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• When you refer someone, they become Position 4 in their own listline</li>
              <li>• You (their referrer) become their Position 3</li>
              <li>• Your referrer becomes their Position 2</li>
              <li>• Your referrer's referrer (3 levels up) becomes Position 1 and receives the payment</li>
              <li>• The system collects {MAINTENANCE_FEE_PERCENT}% maintenance fee from every payment</li>
            </ul>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6">
          <h3 className="text-white font-display text-xl mb-2 flex items-center gap-2">
            <Gift className="text-emerald-400" size={20} />
            Successor System
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            After recruiting {SUCCESSOR_THRESHOLD} members who deposit, each additional recruit can be nominated as a "Successor" - gifted to your Position 1 ancestor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Without Successor</p>
              <p className="text-gray-500 text-sm">New recruit stays in your direct downline</p>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 font-medium mb-1">With Successor</p>
              <p className="text-gray-500 text-sm">New recruit is moved to Position 1's downline as a reward</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Section */}
      <div className="space-y-6">
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-display text-xl">Your Direct Referrals</h3>
            <span className="text-gray-400 text-sm">{totalReferrals} total</span>
          </div>

          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((referral, idx) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neon-purple/30 flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{referral.username}</p>
                      <p className="text-gray-500 text-xs">Joined {referral.date}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${referral.paid
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {referral.paid ? 'Deposited' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Users className="text-gray-600 mb-3" size={40} />
              <p className="text-gray-400 mb-2">No referrals yet</p>
              <p className="text-gray-600 text-sm max-w-sm">Share your unique link to start building your network. You earn when your chain grows 3 levels deep!</p>
              <button
                onClick={handleCopy}
                className="mt-4 px-4 py-2 bg-neon-purple text-white rounded-lg font-medium text-sm hover:bg-neon-purple/80 transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                Copy Referral Link
              </button>
            </div>
          )}
        </div>

        {/* 4-Level Referral Tree */}
        <div className="bg-black/40 backdrop-blur-md border border-neon-purple/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-purple/20 rounded-lg">
                <Users className="text-neon-purple" size={20} />
              </div>
              <div>
                <h3 className="text-white font-display text-xl">Your Referral Network</h3>
                <p className="text-gray-400 text-xs">4 levels deep - expand to see your full downline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {referralTree.reduce((acc, node) => {
                  const countNodes = (n: ReferralTreeNode): number =>
                    1 + n.children.reduce((sum, child) => sum + countNodes(child), 0);
                  return acc + countNodes(node);
                }, 0)} members
              </span>
            </div>
          </div>

          {referralTree.length > 0 ? (
            <div className="space-y-2">
              {referralTree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  level={0}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center mb-4">
                <Users className="text-neon-purple/50" size={32} />
              </div>
              <p className="text-gray-400 mb-2">No referral network yet</p>
              <p className="text-gray-600 text-sm max-w-sm">
                When your referrals invite others, they'll appear here up to 4 levels deep.
              </p>
            </div>
          )}

          {referralTree.length > 0 && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neon-purple" />
                  <span className="text-gray-400">Level 1 (Direct)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neon-blue" />
                  <span className="text-gray-400">Level 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neon-pink" />
                  <span className="text-gray-400">Level 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-gray-400">Level 4</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-black border border-neon-pink/30 p-6 rounded-2xl">
          <h3 className="text-white font-display text-lg mb-4">Earnings Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">€{MEMBERSHIP_FEE}</p>
              <p className="text-xs text-gray-500">Membership Fee</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-red-400">-€{(MEMBERSHIP_FEE * MAINTENANCE_FEE_PERCENT / 100).toFixed(0)}</p>
              <p className="text-xs text-gray-500">{MAINTENANCE_FEE_PERCENT}% Maintenance</p>
            </div>
            <div className="p-3 bg-neon-pink/10 border border-neon-pink/30 rounded-lg">
              <p className="text-2xl font-bold text-neon-pink">€{NET_PAYOUT}</p>
              <p className="text-xs text-gray-500">To Position 1</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-xs text-gray-500">Levels Deep</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
