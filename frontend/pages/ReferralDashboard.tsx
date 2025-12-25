import { Check, ChevronRight, Copy, Crown, Gift, LogOut, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import React, { useState } from 'react';
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

interface ReferralDashboardProps {
  username?: string;
  referralCode?: string;
  listlineStats?: ListlineStats;
  upline?: string[];
  referrals?: Referral[];
  payments?: Payment[];
}

const MEMBERSHIP_FEE = 100;
const MAINTENANCE_FEE_PERCENT = 10;
const NET_PAYOUT = MEMBERSHIP_FEE * (1 - MAINTENANCE_FEE_PERCENT / 100);
const SUCCESSOR_THRESHOLD = 10;

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({
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
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'listline' | 'referrals'>('overview');

  const referralLink = `richlist.biz/?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildOwnListline = () => {
    const positions = [
      { position: 1, label: "Received Payment", user: upline[2] || null, isSystem: !upline[2] },
      { position: 2, label: "2nd Ancestor", user: upline[1] || null, isSystem: !upline[1] },
      { position: 3, label: "Direct Referrer", user: upline[0] || null, isSystem: !upline[0] },
      { position: 4, label: "You", user: username, isSystem: false },
    ];
    return positions;
  };

  const ownListline = buildOwnListline();

  const totalReferrals = referrals.length;
  const paidReferrals = referrals.filter(r => r.paid).length;
  const totalEarnings = payments.reduce((sum, p) => sum + p.netAmount, 0);
  const successorEligible = paidReferrals >= SUCCESSOR_THRESHOLD;
  const additionalAfterThreshold = Math.max(0, paidReferrals - SUCCESSOR_THRESHOLD);

  const positionStats = [
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
  ];

  const stats = [
    { icon: Users, label: "Direct Referrals", value: totalReferrals.toString(), color: "text-neon-blue", subtext: `${paidReferrals} deposited` },
    { icon: Wallet, label: "Total Earnings", value: `€${totalEarnings.toFixed(2)}`, color: "text-neon-pink", subtext: `${MAINTENANCE_FEE_PERCENT}% maintenance deducted` },
    { icon: Trophy, label: "Global Rank", value: "#---", color: "text-yellow-400", subtext: "Based on earnings" },
    { icon: Gift, label: "Successors Available", value: additionalAfterThreshold.toString(), color: "text-emerald-400", subtext: successorEligible ? "Ready to nominate!" : `${SUCCESSOR_THRESHOLD - paidReferrals} more needed` },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-8 md:pt-4 pb-8">

      <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="font-display text-3xl text-white mb-1">
            Welcome, <span className="text-neon-pink">{username}</span>
          </h2>
          <p className="font-sans text-gray-400 text-sm">Your listline is active. Start building your network.</p>
        </div>
        <button
          onClick={() => logout()}
          className="mt-4 md:mt-0 px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Sign Out
        </button>
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

      <div className="flex gap-2 mb-6 bg-black/30 p-1 rounded-lg w-fit">
        {(['overview', 'listline', 'referrals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === tab
                ? 'bg-neon-purple text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
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
      )}

      {activeTab === 'listline' && (
        <div className="space-y-6">
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

            <div className="bg-white/5 rounded-xl p-4 mb-6">
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
      )}

      {activeTab === 'referrals' && (
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
      )}
    </div>
  );
};
