import { useState, useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import { useTrainingRecords } from '../auth/useTrainingRecords';
import { useRowTooltip, RowTooltip } from '../components/RowTooltip';
import RebookModal from '../components/RebookModal';
import './Home.css';

const STATUS_COLOURS = {
  Completed: '#16a34a',
  Pending:   '#6b7280',
  Failed:    '#d2232a',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA');
}

function StatCard({ label, value, sub, accent, active, onClick }) {
  return (
    <div className={`stat-card${onClick ? ' stat-card--clickable' : ''}${active ? ' stat-card--active' : ''}`} onClick={onClick}>
      <span className="stat-value" style={accent ? { color: 'var(--accent)' } : undefined}>{value}</span>
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
        <circle key={s.name} cx={cx} cy={cy} r={r} fill="none"
          stroke={STATUS_COLOURS[s.name] || '#94a3b8'} strokeWidth={stroke}
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
      {pieData.length === 0 ? <p className="pie-empty">No records in this range.</p> : (
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
  const { data, total } = useMemo(() => {
    const counts = {};
    records.forEach(r => {
      if (!r.venue) return;
      counts[r.venue] = (counts[r.venue] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count);
    return { data: sorted, total: records.filter(r => r.venue).length };
  }, [records]);
  const max = data.length ? data[0].count : 1;
  return (
    <div className="pie-card">
      <div className="pie-card-header"><h2>Enrolments by Venue</h2></div>
      {data.length === 0 ? (
        <p className="pie-empty">No venue data available.</p>
      ) : (
        <div className="region-bars">
          {data.map(({ venue, count }) => (
            <div key={venue} className="region-bar-row">
              <span className="region-bar-label">{venue}</span>
              <div className="region-bar-track"><div className="region-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
              <span className="region-bar-count">{count}</span>
            </div>
          ))}
        </div>
      )}
      <p className="pie-total">{total} enrolments with venue data</p>
    </div>
  );
}

const FILTERS = {
  all:        { label: 'Recent Training',         cols: ['candidate','course','venue','date','status'] },
  completed:  { label: 'Competent Learners',       cols: ['candidate','course','venue','date'] },
  failed:     { label: 'Not Yet Competent',        cols: ['candidate','course','venue','date'] },
  pending:    { label: 'Pending Learners',         cols: ['candidate','course','venue','date'] },
  revalidation: { label: 'Revalidation Due',       cols: ['candidate','course','expiry'] },
};

const COL_HEADERS = {
  candidate: 'Candidate', course: 'Course', venue: 'Venue',
  date: 'Date', status: 'Status', expiry: 'Expiry Date',
};

export default function Home() {
  const { accounts } = useMsal();
  const userName = accounts[0]?.name ?? accounts[0]?.username ?? '';
  const { records } = useTrainingRecords();
  const [activeFilter, setActiveFilter] = useState('all');
  const { tooltip, show, hide } = useRowTooltip();
  const [rebookRecord, setRebookRecord] = useState(null);

  const uniqueLearners = useMemo(() => new Set(records.map(r => r.idNumber || r.candidateName)).size, [records]);
  const completed      = useMemo(() => records.filter(r => r.status === 'Completed').length, [records]);
  const failed         = useMemo(() => records.filter(r => r.status === 'Failed').length, [records]);
  const pending        = useMemo(() => records.filter(r => r.status === 'Pending').length, [records]);
  const venues         = useMemo(() => [...new Set(records.map(r => r.venue).filter(Boolean))].length, [records]);
  const expiringSoon   = useMemo(() => records.filter(r => {
    if (!r.expiryDate) return false;
    const diff = (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length, [records]);

  const tableRecords = useMemo(() => {
    switch (activeFilter) {
      case 'completed':
        return [...records].filter(r => r.status === 'Completed')
          .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate)).slice(0, 50);
      case 'failed':
        return [...records].filter(r => r.status === 'Failed')
          .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate)).slice(0, 50);
      case 'pending':
        return [...records].filter(r => r.status === 'Pending')
          .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate)).slice(0, 50);
      case 'revalidation':
        return [...records].filter(r => {
          if (!r.expiryDate) return false;
          const diff = (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
          return diff > 0 && diff <= 180;
        }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).slice(0, 50);
      default:
        return [...records].filter(r => r.trainingDate)
          .sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate)).slice(0, 10);
    }
  }, [records, activeFilter]);

  const cols = FILTERS[activeFilter]?.cols ?? FILTERS.all.cols;

  function toggle(key) {
    setActiveFilter(prev => prev === key ? 'all' : key);
  }

  function expiryClass(d) {
    if (!d) return '';
    const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff <= 90)  return 'td-expiry-red';
    if (diff <= 180) return 'td-expiry-orange';
    return '';
  }

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
            <StatCard label="Total Learners" value={uniqueLearners} sub={`${records.length} enrolments`}
              active={activeFilter === 'all'} onClick={() => toggle('all')} />
            <StatCard label="Competent" value={completed}
              active={activeFilter === 'completed'} onClick={() => toggle('completed')} />
            <StatCard label="Not Yet Competent" value={failed} accent={failed > 0}
              active={activeFilter === 'failed'} onClick={() => toggle('failed')} />
            <StatCard label="Pending" value={pending}
              active={activeFilter === 'pending'} onClick={() => toggle('pending')} />
            <StatCard label="Venues" value={venues} sub="training locations" />
            <StatCard label="Revalidation Due" value={expiringSoon} sub="within 6 months" accent={expiringSoon > 0}
              active={activeFilter === 'revalidation'} onClick={() => toggle('revalidation')} />
          </div>

          <section className="home-section">
            <h2>{FILTERS[activeFilter]?.label ?? 'Recent Training'}</h2>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>{cols.map(c => <th key={c}>{COL_HEADERS[c]}</th>)}</tr>
                </thead>
                <tbody>
                  {tableRecords.map(r => (
                    <tr key={r.id}
                      onClick={() => activeFilter === 'revalidation' && setRebookRecord(r)}
                      style={activeFilter === 'revalidation' ? { cursor: 'pointer' } : undefined}
                      onMouseEnter={e => show(e, [
                        { label: 'Candidate', value: r.candidateName },
                        { label: 'Course',    value: r.course },
                        { label: 'Venue',     value: r.venue },
                        { label: 'Date',      value: fmtDate(r.trainingDate) },
                        { label: 'Status',    value: r.status },
                        { label: 'Expiry',    value: r.expiryDate ? fmtDate(r.expiryDate) : null },
                      ].filter(l => l.value))}
                      onMouseLeave={hide}
                    >
                      {cols.includes('candidate') && <td>{r.candidateName}</td>}
                      {cols.includes('course')    && <td>{r.course}</td>}
                      {cols.includes('venue')     && <td>{r.venue ?? '—'}</td>}
                      {cols.includes('date')      && <td>{fmtDate(r.trainingDate)}</td>}
                      {cols.includes('status')    && (
                        <td><span className={`badge badge--${r.status.replace(' ','-').toLowerCase()}`}>{r.status}</span></td>
                      )}
                      {cols.includes('expiry')    && (
                        <td className={expiryClass(r.expiryDate)}>{fmtDate(r.expiryDate)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableRecords.length === 50 && (
              <p className="home-table-hint">Showing top 50 — go to Training Data for the full list.</p>
            )}
          </section>
        </div>
      </div>
      <RowTooltip tooltip={tooltip} />
      <RebookModal
        record={rebookRecord}
        userName={accounts[0]?.name ?? accounts[0]?.username ?? ''}
        userEmail={accounts[0]?.username ?? ''}
        onClose={() => setRebookRecord(null)}
      />
    </main>
  );
}
