import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { mockClient, mockTrainingRecords } from '../mock/trainingData';
import { useTheme } from '../context/ThemeContext';
import './Home.css';

const STATUS_COLOURS = {
  Completed:    '#16a34a',
  'In Progress':'#d97706',
  Pending:      '#6b7280',
  Failed:       '#d2232a',
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <span className="stat-value" style={accent ? { color: 'var(--accent)' } : undefined}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function StatusPieChart({ records }) {
  const { isDark } = useTheme();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return records;
    return records.filter(r => {
      if (dateFrom && r.submittedDate < dateFrom) return false;
      if (dateTo   && r.submittedDate > dateTo)   return false;
      return true;
    });
  }, [records, dateFrom, dateTo]);

  const pieData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const tooltipBg     = isDark ? '#27272a' : '#ffffff';
  const tooltipBorder = isDark ? '#3f3f46' : '#e5e7eb';
  const textColor     = isDark ? '#a1a1aa' : '#6b7280';
  const hasRange      = dateFrom || dateTo;

  return (
    <div className="pie-card">
      <div className="pie-card-header">
        <h2>Submissions by Status</h2>
        <div className="pie-date-range">
          <input
            type="date"
            className="pie-date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="From date"
          />
          <span className="pie-date-sep">—</span>
          <input
            type="date"
            className="pie-date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="To date"
          />
          {hasRange && (
            <button className="pie-clear" onClick={() => { setDateFrom(''); setDateTo(''); }} title="Clear dates">
              ✕
            </button>
          )}
        </div>
      </div>

      {pieData.length === 0 ? (
        <p className="pie-empty">No records in this range.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLOURS[entry.name] || '#94a3b8'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value, name) => [`${value} records`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
              formatter={val => <span style={{ color: textColor }}>{val}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      <p className="pie-total">
        {filtered.length} total{hasRange ? ' in range' : ''}
      </p>
    </div>
  );
}

export default function Home() {
  const records = mockTrainingRecords;

  const completed   = records.filter(r => r.status === 'Completed').length;
  const inProgress  = records.filter(r => r.status === 'In Progress' || r.status === 'Pending').length;
  const failed      = records.filter(r => r.status === 'Failed').length;
  const expiringSoon = records.filter(r => {
    if (!r.expiryDate) return false;
    const diff = (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length;

  const recent = [...records]
    .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
    .slice(0, 5);

  return (
    <main className="page">
      <div className="home-header">
        <div>
          <h1>Welcome back</h1>
          <p className="home-client-name">{mockClient.name}</p>
        </div>
      </div>

      <div className="home-body">
        {/* Left — pie chart */}
        <StatusPieChart records={records} />

        {/* Right — stats + recent */}
        <div className="home-right">
          <div className="stat-grid">
            <StatCard label="Total Submissions" value={records.length} />
            <StatCard label="Completed" value={completed} />
            <StatCard label="In Progress / Pending" value={inProgress} />
            <StatCard label="Failed" value={failed} accent />
            <StatCard label="Expiring Soon" value={expiringSoon} sub="within 6 months" accent={expiringSoon > 0} />
          </div>

          <section className="home-section">
            <h2>Recent Submissions</h2>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Course</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.candidateName}</td>
                      <td>{r.course}</td>
                      <td>{new Date(r.submittedDate).toLocaleDateString('en-ZA')}</td>
                      <td>
                        <span className={`badge badge--${r.status.replace(' ', '-').toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
