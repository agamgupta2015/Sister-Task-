import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Task, DashboardStats, SISTERS } from '../types';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = {
  Anna: '#f472b6', // Pink
  Bella: '#a78bfa', // Purple
  Chloe: '#34d399', // Green
};

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  
  const stats: DashboardStats[] = SISTERS.map(sister => {
    const sisterTasks = tasks.filter(t => t.assignee === sister);
    return {
      name: sister,
      completed: sisterTasks.filter(t => t.isCompleted).length,
      pending: sisterTasks.filter(t => !t.isCompleted).length,
      total: sisterTasks.length
    };
  });

  const totalCompleted = tasks.filter(t => t.isCompleted).length;
  const totalPending = tasks.filter(t => !t.isCompleted).length;

  const pieData = [
    { name: 'Completed', value: totalCompleted, color: '#10b981' },
    { name: 'Pending', value: totalPending, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress by Sister */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Task Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#475569', fontSize: 14, fontWeight: 600 }} 
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                <Bar dataKey="completed" name="Done" stackId="a" fill="#34d399" radius={[0, 4, 4, 0]} barSize={30} />
                <Bar dataKey="pending" name="To Do" stackId="a" fill="#cbd5e1" radius={[0, 0, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Overall Progress</h3>
          <div className="h-64 w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="text-center mt-[-20px] relative z-10">
            <span className="text-3xl font-bold text-slate-700">
              {totalCompleted + totalPending > 0 
                ? Math.round((totalCompleted / (totalCompleted + totalPending)) * 100) 
                : 0}%
            </span>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Complete</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.name} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-2"
              style={{ backgroundColor: COLORS[s.name as keyof typeof COLORS] }}
            >
              {s.name[0]}
            </div>
            <div className="text-sm font-bold text-slate-700">{s.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-green-500 font-bold">{s.completed}</span> done / {s.total} total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;