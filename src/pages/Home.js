import { useState, useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import { useTrainingRecords } from '../auth/useTrainingRecords';
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
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="#6b7280">enrolments</text>
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
        <h2>Enrolments by Status</h2>
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

function VenueBarChart({ records }) {
  const data = useMemo(() => {
    const counts = {};
    records.forEach(r => {
      const key = r.venue || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [records]);

  const max = data.length ? data[0].count : 1;

  return (
    <div className="pie-card">
      <div className="pie-card-header"><h2>Enrolments by Venue</h2></div>
      <div className="region-bars">
        {data.map(({ venue, count }) => (
          <div key={venue} className="region-bar-row">
            <span className="region-bar-label">{venue}</span>
            <div className="region-bar-track">
              <div className="region-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="region-bar-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { accounts } = useMsal();
  const userName = accounts[0]?.name ?? accounts[0]?.username ?? '';

  const { records, loading, error } = useTrainingRecords();

  if (loading) return <main className="page"><p style={{color:'var(--text-muted)'}}>Loading live data…</p></main>;
  if (error)   return <main className="page"><p style={{color:'#d2232a'}}>Dataverse error: {error}</p></main>;

  const uniqueLearners = new Set(records.map(r => r.idNumber || r.candidateName)).size;
  const completed      = records.filter(r => r.status === 'Completed').length;
  const failed         = records.filter(r => r.status === 'Failed').length;
  const pending        = records.filter(r => r.status === 'Pending').length;
  const expiringSoon   = records.filter(r => {
    if (!r.expiryDate) return false;
    const diff = (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length;
  const venues = [...new Set(records.map(r => r.venue).filter(Boolean))].length;

  const recent = [...records]
    .filter(r => r.trainingDate)
    .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate))
    .slice(0, 5);

  return (
    <main className="page">
      <div className="home-header">
        <div>
          <h1>Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
          <p className="home-client-name">Here's an overview of your training activity.</p>
        </div>
      </div>

      <div className="home-body">
        <div className="home-left">
          <StatusPieChart records={records} />
          <VenueBarChart records={records} />
        </div>

        <div className="home-right">
          <div className="stat-grid">
            <StatCard label="Total Learners" value={uniqueLearners} sub={`${records.length} enrolments`} />
            <StatCard label="Competent" value={completed} />
            <StatCard label="Not Yet Competent" value={failed} accent={failed > 0} />
            <StatCard label="Pending" value={pending} />
            <StatCard label="Venues" value={venues} sub="training locations" />
            <StatCard label="Revalidation Due" value={expiringSoon} sub="within 6 months" accent={expiringSoon > 0} />
          </div>

          <section className="home-section">
            <h2>Recent Training</h2>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Course</th>
                    <th>Venue</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.candidateName}</td>
                      <td>{r.course}</td>
                      <td>{r.venue ?? '—'}</td>
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
