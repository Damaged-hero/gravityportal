import { useState, useMemo } from 'react';
import { mockTrainingRecords } from '../mock/trainingData';
import TrainingChart, { GROUP_OPTIONS } from '../components/TrainingChart';
import './TrainingData.css';

const ALL_STATUSES = ['All', 'Completed', 'Failed', 'Pending'];
const ALL_REGIONS  = ['All', 'DRC', 'Ghana', 'Madagascar', 'Malawi', 'Oman', 'Senegal'];

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA');
}

function isExpiringSoon(dateStr) {
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= 180;
}

function TableIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M2 4a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
    </svg>
  );
}

const COLUMNS = [
  { key: 'candidateName', label: 'Candidate' },
  { key: 'region',        label: 'Region' },
  { key: 'course',        label: 'Course' },
  { key: 'company',       label: 'Company' },
  { key: 'trainingDate',  label: 'Start Date' },
  { key: 'endDate',       label: 'End Date' },
  { key: 'status',        label: 'Status' },
  { key: 'venue',         label: 'Venue' },
  { key: 'expiryDate',    label: 'Revalidation' },
];

function SortIcon({ dir }) {
  if (!dir) return <span className="sort-icon sort-icon--none">⇅</span>;
  return <span className="sort-icon">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function TrainingData() {
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('All');
  const [region, setRegion]       = useState('All');
  const [course, setCourse]       = useState('All');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [view, setView]           = useState('table');
  const [groupBy, setGroupBy]     = useState('status');
  const [sortKey, setSortKey]     = useState('trainingDate');
  const [sortDir, setSortDir]     = useState('desc');

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const courses = useMemo(() => {
    const unique = [...new Set(mockTrainingRecords.map(r => r.course))].sort();
    return ['All', ...unique];
  }, []);

  const activeFilterCount = [
    status !== 'All',
    region !== 'All',
    course !== 'All',
    !!dateFrom,
    !!dateTo,
    !!search,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch(''); setStatus('All'); setRegion('All'); setCourse('All');
    setDateFrom(''); setDateTo('');
  }

  const filtered = useMemo(() => {
    const f = mockTrainingRecords.filter(r => {
    if (status !== 'All' && r.status !== status) return false;
    if (region !== 'All' && r.region !== region) return false;
    if (course !== 'All' && r.course !== course) return false;
    if (dateFrom && r.trainingDate < dateFrom) return false;
    if (dateTo   && r.trainingDate > dateTo)   return false;
    const q = search.toLowerCase();
    if (q && !(
      r.candidateName.toLowerCase().includes(q) ||
      r.course.toLowerCase().includes(q) ||
      (r.company && r.company.toLowerCase().includes(q)) ||
      (r.venue && r.venue.toLowerCase().includes(q))
    )) return false;
    return true;
    });
    return [...f].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [search, status, region, course, dateFrom, dateTo, sortKey, sortDir]);

  return (
    <main className="page page--full">
      <div className="td-header">
        <div>
          <h1>Training Data</h1>
          <p>All candidates submitted for training on your account.</p>
        </div>
        <div className="td-view-controls">
          {view === 'chart' && (
            <div className="td-filter-group">
              <label className="td-filter-label">Lines by</label>
              <div className="td-pills">
                {GROUP_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    className={`filter-btn${groupBy === o.value ? ' filter-btn--active' : ''}`}
                    onClick={() => setGroupBy(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="view-toggle">
            <button
              className={`view-btn${view === 'table' ? ' view-btn--active' : ''}`}
              onClick={() => setView('table')}
              title="Table view"
            >
              <TableIcon />
            </button>
            <button
              className={`view-btn${view === 'chart' ? ' view-btn--active' : ''}`}
              onClick={() => setView('chart')}
              title="Chart view"
            >
              <ChartIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="td-filterbar">
        <input
          className="td-search"
          type="search"
          placeholder="Search name, course, company, venue…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="td-filter-group">
          <label className="td-filter-label">Status</label>
          <div className="td-pills">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                className={`filter-btn${status === s ? ' filter-btn--active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="td-filter-group">
          <label className="td-filter-label">Region</label>
          <div className="td-pills">
            {ALL_REGIONS.map(r => (
              <button
                key={r}
                className={`filter-btn${region === r ? ' filter-btn--active' : ''}`}
                onClick={() => setRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="td-filter-group">
          <label className="td-filter-label">Course</label>
          <select
            className="td-select"
            value={course}
            onChange={e => setCourse(e.target.value)}
          >
            {courses.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="td-filter-group">
          <label className="td-filter-label">Training from</label>
          <input
            className="td-date"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>

        <div className="td-filter-group">
          <label className="td-filter-label">To</label>
          <input
            className="td-date"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {activeFilterCount > 0 && (
          <button className="td-clear" onClick={clearFilters}>
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {view === 'table' ? (
        <>
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={`th-sortable${sortKey === col.key ? ' th-sorted' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="th-inner">
                        {col.label}
                        <SortIcon dir={sortKey === col.key ? sortDir : null} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="td-empty">No records match your filters.</td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id}>
                      <td className="td-name">{r.candidateName}</td>
                      <td><span className="region-tag">{r.region}</span></td>
                      <td>{r.course}</td>
                      <td>{r.company ?? '—'}</td>
                      <td>{fmt(r.trainingDate)}</td>
                      <td>{fmt(r.endDate)}</td>
                      <td>
                        <span className={`badge badge--${r.status.replace(' ', '-').toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.venue ?? '—'}</td>
                      <td className={r.expiryDate && isExpiringSoon(r.expiryDate) ? 'td-expiry-warn' : ''}>
                        {fmt(r.expiryDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="td-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </>
      ) : (
        <TrainingChart records={filtered} groupBy={groupBy} />
      )}
    </main>
  );
}
