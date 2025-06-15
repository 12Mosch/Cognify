import { memo } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ChartWidget from "./ChartWidget";

interface StudyActivityChartProps {
  dateRange: '7d' | '30d' | '90d' | 'all';
}

/**
 * Study Activity Chart Component
 * 
 * Displays study activity over time with:
 * - Beautiful gradient area chart
 * - Glowing blue accent colors
 * - Responsive design
 * - Dark theme support
 * - Interactive tooltips
 * - Multiple metrics (cards studied, sessions, time spent)
 */
const StudyActivityChart = memo(function StudyActivityChart({ dateRange }: StudyActivityChartProps) {
  // Fetch real study activity data from Convex
  const data = useQuery(api.statistics.getStudyActivityData, { dateRange });

  // Show loading state while data is being fetched
  if (data === undefined) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Study Activity
          </h3>
          <div className="animate-pulse bg-slate-300 dark:bg-slate-600 h-4 w-20 rounded"></div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-slate-500 dark:text-slate-400">
            Loading activity data...
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 dark:bg-slate-900 p-4 rounded-lg border border-slate-600 shadow-lg">
          <p className="text-slate-200 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-slate-300">
                {entry.name}: <span className="font-semibold text-white">{entry.value}</span>
                {entry.dataKey === 'timeSpent' && ' min'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare footer content
  const footerContent = (
    <>
      {/* Chart Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
            {data.reduce((sum, day) => sum + day.cardsStudied, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Cards</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-500 dark:text-cyan-400">
            {data.reduce((sum, day) => sum + day.sessions, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500 dark:text-green-400">
            {Math.round(data.reduce((sum, day) => sum + day.timeSpent, 0) / 60)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Minutes</div>
        </div>
      </div>
    </>
  );

  return (
    <ChartWidget
      title="Study Activity Over Time"
      subtitle="Track your learning consistency and progress patterns"
      chartHeight="h-80"
      footer={footerContent}
    >
      {/* Chart Legend */}
      <div className="flex items-center gap-4 text-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-slate-600 dark:text-slate-400">Cards Studied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
          <span className="text-slate-600 dark:text-slate-400">Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="text-slate-600 dark:text-slate-400">Time (min)</span>
        </div>
      </div>

      {/* Chart Content */}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cardsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e2e8f0" 
              className="dark:stroke-slate-700"
            />
            
            <XAxis 
              dataKey="displayDate"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Areas */}
            <Area
              type="monotone"
              dataKey="cardsStudied"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#cardsGradient)"
              name="Cards Studied"
            />
            
            {/* Lines for additional metrics */}
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#22d3ee', strokeWidth: 2, fill: '#ffffff' }}
              name="Sessions"
            />
            
            <Line
              type="monotone"
              dataKey="timeSpent"
              stroke="#4ade80"
              strokeWidth={2}
              dot={{ fill: '#4ade80', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2, fill: '#ffffff' }}
              name="Time Spent"
            />
          </AreaChart>
        </ResponsiveContainer>
    </ChartWidget>
  );
});

export default StudyActivityChart;
