import { useState, useMemo } from 'react';
import { mockClient, mockTrainingRecords } from '../mock/trainingData';
import './Home.css';

const STATUS_COLOURS = {
  Completed: '#16a34a',
  Pending:   '#6b7280',
  Failed:    '#d2232a',
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

// Pure SVG donut — no recharts dependency
function DonutChart({ data, total }) {
  const cx = 110, cy = 110, r = 80, stroke = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const dash = (d.value / total) * circumference;
    const gap  = circumference - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  return (
    <svg viewBox="0 0 220 220" width="220" height="220" style={{ display: 'block', margin: '0 auto' }}>
      {slices.map(s => (
        <circle
          key={s.name}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={STATUS_COLOURS[s.name] || '#94a3b8'}
          strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circumference / 4}
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="#6b7280">learners</text>
    </svg>
  );
}

function StatusPieChart({ records }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const hasRange = dateFrom || dateTo;

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return records;
    return records.filter(r => {
      if (dateFrom && r.trainingDate < dateFrom) return false;
      if (dateTo   && r.trainingDate > dateTo)   return false;
      return true;
    });
  }, [records, dateFrom, dateTo]);

  const pieData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  return (
    <div className="pie-card">
      <div className="pie-card-header">
        <h2>Learners by Status</h2>
        <div className="pie-date-range">
          <input type="date" className="pie-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
          <span className="pie-date-sep">—</span>
          <input type="date" className="pie-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
          {hasRange && <button className="pie-clear" onClick={() => { setDateFrom(''); setDateTo(''); }}>✕</button>}
        </div>
      </div>
      {pieData.length === 0 ? (
        <p className="pie-empty">No records in this range.</p>
      ) : (
        <>
          <DonutChart data={pieData} total={filtered.length} />
          <div className="donut-legend">
            {pieData.map(d => (
              <span key={d.name} className="donut-legend-item">
                <span className="donut-legend-dot" style={{ background: STATUS_COLOURS[d.name] || '#94a3b8' }} />
                {d.name} <strong>{d.value}</strong>
              </span>
            ))}
          </div>
        </>
      )}
      <p className="pie-total">{filtered.length} total{hasRange ? ' in range' : ''}</p>
    </div>
  );
}

function RegionBarChart({ records }) {
  const data = useMemo(() => {
    const counts = {};
    records.forEach(r => { counts[r.region] = (counts[r.region] || 0) + 1; });
    return Object.entries(counts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  const max = data.length ? data[0].count : 1;

  return (
    <div className="pie-card">
      <div className="pie-card-header"><h2>Learners by Region</h2></div>
      <div className="region-bars">
        {data.map(({ region, count }) => (
          <div key={region} className="region-bar-row">
            <span className="region-bar-label">{region}</span>
            <div className="region-bar-track">
              <div
                className="region-bar-fill"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="region-bar-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const records = mockTrainingRecords;

  const completed    = records.filter(r => r.status === 'Completed').length;
  const failed       = records.filter(r => r.status === 'Failed').length;
  const pending      = records.filter(r => r.status === 'Pending').length;
  const expiringSoon = records.filter(r => {
    if (!r.expiryDate) return false;
    const diff = (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length;

  const regions = [...new Set(records.map(r => r.region))].length;

  const recent = [...records]
    .filter(r => r.trainingDate)
    .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate))
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
        {/* Left — charts */}
        <div className="home-left">
          <StatusPieChart records={records} />
          <RegionBarChart records={records} />
        </div>

        {/* Right — stats + recent */}
        <div className="home-right">
          <div className="stat-grid">
            <StatCard label="Total Learners" value={records.length} />
            <StatCard label="Competent" value={completed} />
            <StatCard label="Not Yet Competent" value={failed} accent={failed > 0} />
            <StatCard label="Pending" value={pending} />
            <StatCard label="Regions" value={regions} sub="countries trained" />
            <StatCard label="Revalidation Due" value={expiringSoon} sub="within 6 months" accent={expiringSoon > 0} />
          </div>

          <section className="home-section">
            <h2>Recent Training</h2>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Region</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.candidateName}</td>
                      <td><span className="region-tag">{r.region}</span></td>
                      <td>{r.course}</td>
                      <td>{new Date(r.trainingDate).toLocaleDateString('en-ZA')}</td>
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
