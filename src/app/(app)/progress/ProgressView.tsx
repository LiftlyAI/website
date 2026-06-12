'use client';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import type { AthleteProfile } from '@/lib/types';

interface E1RMPoint {
  date: string;
  squat?: number;
  bench?: number;
  deadlift?: number;
  total?: number;
}
interface BWPoint {
  date: string;
  bw: number;
  rolling7?: number;
}
interface VolumePoint {
  week: string;
  squat: number;
  bench: number;
  deadlift: number;
}

const ironGrid = '#262626';
const chalk = '#F0EDE8';
const chalkMute = '#737373';

export function ProgressView({
  profile,
  e1rms,
  bw,
  volume,
}: {
  profile: AthleteProfile;
  e1rms: E1RMPoint[];
  bw: BWPoint[];
  volume: VolumePoint[];
}) {
  return (
    <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-6xl">
      <div className="mb-8">
        <div className="page-kicker mb-2">// THE LEDGER</div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">PROGRESS</h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      {e1rms.length === 0 ? (
        <Card>
          <div className="text-chalk-mute text-sm">
            Log a session to start populating these charts. e1RM uses Epley + Brzycki averaged.
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Estimated 1RM" subtitle={`Best per session · ${profile.unit}`} accent />
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={e1rms} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke={ironGrid} strokeDasharray="2 4" />
                  <XAxis
                    dataKey="date"
                    stroke={chalkMute}
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke={chalkMute}
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#141414',
                      border: '1px solid #262626',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: chalk,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="squat" stroke="#E8440A" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="bench" stroke="#FACC15" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="deadlift" stroke="#4ADE80" strokeWidth={2} dot={false} connectNulls />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#F0EDE8"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {volume.length > 0 && (
            <Card>
              <CardHeader title="Weekly Volume" subtitle={`Tonnage per lift · ${profile.unit}`} accent />
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={volume} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                    <CartesianGrid stroke={ironGrid} strokeDasharray="2 4" />
                    <XAxis
                      dataKey="week"
                      stroke={chalkMute}
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke={chalkMute}
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#141414',
                        border: '1px solid #262626',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: chalk,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Bar dataKey="squat" stackId="a" fill="#E8440A" />
                    <Bar dataKey="bench" stackId="a" fill="#FACC15" />
                    <Bar dataKey="deadlift" stackId="a" fill="#4ADE80" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {bw.length > 0 && (
            <Card>
              <CardHeader
                title="Bodyweight"
                subtitle={`Daily + 7-day rolling avg · ${profile.unit}${profile.targetWeightClass ? ` · target class ${profile.targetWeightClass}` : ''}`}
                accent
              />
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={bw} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                    <CartesianGrid stroke={ironGrid} strokeDasharray="2 4" />
                    <XAxis
                      dataKey="date"
                      stroke={chalkMute}
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke={chalkMute}
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      width={40}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#141414',
                        border: '1px solid #262626',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: chalk,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Line
                      type="monotone"
                      dataKey="bw"
                      stroke="#525252"
                      strokeWidth={1}
                      dot={{ fill: '#525252', r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rolling7"
                      stroke="#E8440A"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
