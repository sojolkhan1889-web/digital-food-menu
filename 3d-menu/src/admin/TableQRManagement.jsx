import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Table2,
  QrCode,
  CircleCheck,
  ArrowUpRight,
  Search,
  CalendarDays,
  Pencil,
  Download,
  Power,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  WandSparkles,
  X,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  LoaderCircle
} from 'lucide-react';
import TableQrImage, {
  downloadTableQr,
  formatTable,
  formatTableId,
  getTableMenuUrl
} from './TableQrImage.jsx';
import { supabaseTableRepository } from '../data/supabaseTableRepository.js';
import './tableQrStyles.css';

const PAGE_SIZES = [5, 10, 25];

const readableDate = (iso) => {
  if (!iso) return 'Recent';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka'
    }).format(new Date(iso));
  } catch (e) {
    return 'Recent';
  }
};

function Pagination({ page, total, pageSize, onPage, onPageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const numbers = [];
  for (let n = 1; n <= pages; n += 1) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1 || (page === 1 && n <= 4)) {
      numbers.push(n);
    }
  }
  const steps = [];
  numbers.forEach((n, idx) => {
    if (idx > 0 && n > numbers[idx - 1] + 1) steps.push('dots-' + n);
    steps.push(n);
  });

  return (
    <div className="pagination">
      <div className="pagination-description">
        Showing <strong>{first}–{last}</strong> of <strong>{total}</strong> tables
      </div>
      <div className="pagination-controls">
        <label className="rows-label" htmlFor="rows-per-page">Rows per page:</label>
        <div className="select-shell page-size-shell">
          <select
            id="rows-per-page"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
        <button
          className="page-arrow"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>
        {steps.map((part) =>
          typeof part === 'number' ? (
            <button
              key={part}
              className={`page-number ${page === part ? 'selected' : ''}`}
              onClick={() => onPage(part)}
              aria-current={page === part ? 'page' : undefined}
            >
              {part}
            </button>
          ) : (
            <span className="page-dots" key={part}>…</span>
          )
        )}
        <button
          className="page-arrow"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DiningTableIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 10V6c0-1.1-.9-2-2-2s-2 .9-2 2v4h-2V7c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v3H6V6c0-1.1-.9-2-2-2s-2 .9-2 2v4c0 1.1.9 2 2 2v6c0 .55.45 1 1 1s1-.45 1-1v-6h1.5v6c0 .55.45 1 1 1s1-.45 1-1v-6h5v6c0 .55.45 1 1 1s1-.45 1-1v-6H18v6c0 .55.45 1 1 1s1-.45 1-1v-6c1.1 0 2-.9 2-2zm-4 0V6h2v4h-2zM4 6h2v4H4V6zm6 2h4v2h-4V8z"/>
    </svg>
  );
}

function QrGridIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="5" y="5" width="3" height="3" rx="0.5" fill="#fff" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="16" y="5" width="3" height="3" rx="0.5" fill="#fff" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="5" y="16" width="3" height="3" rx="0.5" fill="#fff" />
      <rect x="14" y="14" width="3" height="3" rx="0.8" />
      <rect x="18" y="14" width="3" height="3" rx="0.8" />
      <rect x="14" y="18" width="3" height="3" rx="0.8" />
      <rect x="18" y="18" width="3" height="3" rx="0.8" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </svg>
  );
}

function StatCard({ label, value, detail, variant, icon: Icon }) {
  return (
    <div className={`stat-card stat-${variant}`}>
      <span className="stat-icon">
        <Icon className="w-7 h-7" />
      </span>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-detail">
          <ArrowUpRight size={15} />
          <span>{detail}</span>
        </div>
      </div>
      <div className="stat-shine" />
    </div>
  );
}

export default function TableQRManagement({
  restaurant = { id: 'resto_001', name: 'Monkey Bhai', slug: '3d-dine' },
  repository = supabaseTableRepository
}) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    const rows = await repository.list({ restaurantId: restaurant.id });
    setTables(rows);
    return rows;
  }, [restaurant.id, repository]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    repository.list({ restaurantId: restaurant.id })
      .then((rows) => {
        if (mounted) setTables(rows);
      })
      .catch((error) => {
        if (mounted) setMessage({ type: 'error', text: error.message || 'Unable to load tables' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [restaurant.id, repository]);

  const toast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage((cur) => (cur?.text === text ? null : cur));
    }, 3200);
  };

  const doAction = async (key, action, success) => {
    if (busy) return;
    setBusy(key);
    try {
      await action();
      await refresh();
      if (success) toast(success);
    } catch (error) {
      toast(error?.message || 'Something went wrong.', 'error');
    } finally {
      setBusy('');
    }
  };

  const stats = useMemo(() => {
    const active = tables.filter((t) => t.active).length;
    return {
      total: tables.length,
      active,
      qrCount: tables.filter((t) => !!t.publicId).length
    };
  }, [tables]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...tables]
      .filter((row) => (status === 'all' || (status === 'active' ? row.active : !row.active)))
      .filter((row) =>
        !needle ||
        [row.id, formatTableId(row.tableNo), formatTable(row.tableNo), String(row.tableNo)].some((s) =>
          String(s).toLowerCase().includes(needle)
        )
      )
      .sort((a, b) => a.tableNo - b.tableNo);
  }, [tables, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const createTable = () =>
    doAction(
      'create',
      async () => {
        const created = await repository.create({ restaurantId: restaurant.id });
        setSearch('');
        setStatus('all');
        setPage(Math.ceil((tables.length + 1) / pageSize));
        return created;
      },
      'New table and unique QR code created.'
    );

  const toggle = (row) =>
    doAction(
      row.id,
      () =>
        repository.setActive({
          restaurantId: restaurant.id,
          tableId: row.id,
          active: !row.active
        }),
      `${formatTable(row.tableNo)} ${row.active ? 'deactivated' : 'activated'}.`
    );

  const remove = (row) => {
    if (
      !window.confirm(
        `Delete ${formatTable(row.tableNo)}? Its existing QR must stop working after the backend revokes it. This cannot be undone.`
      )
    ) {
      return;
    }
    doAction(
      row.id,
      () => repository.remove({ restaurantId: restaurant.id, tableId: row.id }),
      `${formatTable(row.tableNo)} deleted.`
    );
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    doAction(
      editing.id,
      () =>
        repository.rename({
          restaurantId: restaurant.id,
          tableId: editing.id,
          tableNo: editValue
        }),
      'Table number updated. The permanent QR identity remains unchanged.'
    );
    setEditing(null);
  };

  const download = (row) =>
    doAction(
      `download-${row.id}`,
      () => downloadTableQr({ restaurant, table: row }),
      `QR download started for ${formatTable(row.tableNo)}.`
    );

  const copyLink = async (row) => {
    try {
      await navigator.clipboard.writeText(getTableMenuUrl({ restaurant, table: row }));
      toast('Restaurant-specific table link copied.');
    } catch {
      toast('Unable to copy; use the QR preview instead.', 'error');
    }
  };

  return (
    <div className="qr-management-page">
      {/* 1. Header Intro Banner */}
      <section className="intro-banner" aria-labelledby="table-intro-title">
        <div className="hero-left-image" aria-hidden="true">
          <img src="/assets/table-stand-reference.png" alt="3D Table Stand" />
        </div>
        <div className="hero-copy">
          <h2 id="table-intro-title">Create &amp; Manage Table QR Codes</h2>
          <p>
            Create digital table entries for your restaurant. Each table gets its own unique QR code for menu access.
            When a customer scans a specific table QR and places an order, the order received in{' '}
            <strong>ORDER MANAGEMENT</strong> will include the matching table number along with the DGM order ID.
          </p>
          <div className="example-order">
            <span>Example Order:</span>{' '}
            <strong><span style={{ fontSize: '13px', marginRight: '4px' }}>📋</span> DGM-24081 <b>·</b> Table 02</strong>
          </div>
          <div className="tenant-note">
            <ShieldCheck size={16} />
            <span>Each QR is locked to this restaurant only — scanning one restaurant's table QR cannot open another restaurant's menu.</span>
          </div>
        </div>
        <div className="hero-right">
          <button
            type="button"
            className="create-button"
            onClick={createTable}
            disabled={!!busy || loading}
          >
            {busy === 'create' ? <LoaderCircle className="spinning" size={20} /> : <Plus size={22} />}
            <span>Create Table QR</span>
          </button>
          <span>
            <WandSparkles size={15} /> Auto-create next table serial
          </span>
        </div>
        <img className="hero-ambience" src="/assets/restaurant-ambience.png" alt="" aria-hidden="true" />
      </section>

      {/* 2. Three KPI Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Tables"
          value={stats.total}
          variant="orange"
          icon={DiningTableIcon}
          detail="+4 (20.0%) from last 30 days"
        />
        <StatCard
          label="Total QR Codes"
          value={stats.qrCount}
          variant="purple"
          icon={QrGridIcon}
          detail="+4 (20.0%) from last 30 days"
        />
        <StatCard
          label="Total Active QR"
          value={stats.active}
          variant="green"
          icon={CheckCircleIcon}
          detail="+3 (15.8%) from last 30 days"
        />
      </div>

      {/* 3. Search and Status Toolbar */}
      <div className="table-toolbar">
        <div className="search-shell">
          <Search size={19} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Table ID, Table No..."
            aria-label="Search tables"
          />
        </div>
        <div className="select-shell status-select">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown size={17} />
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Table ID</th>
                <th>Created Date</th>
                <th>Table No</th>
                <th>Status</th>
                <th>QR Code</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <LoaderCircle className="spinning" size={26} /> Loading tables…
                    </div>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Search size={24} /> No tables match your filters.
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="table-id-badge">{formatTableId(row.tableNo)}</span>
                    </td>
                    <td>
                      <span className="date-cell">
                        <CalendarDays size={16} />
                        {readableDate(row.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className="table-number-badge">{formatTable(row.tableNo)}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${row.active ? 'status-active' : 'status-inactive'}`}>
                        {row.active ? <CircleCheck size={15} /> : <Power size={14} />} {row.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="qr-table-cell"
                        onClick={() => setPreview(row)}
                        aria-label={`Preview QR code for ${formatTable(row.tableNo)}`}
                      >
                        <TableQrImage restaurant={restaurant} table={row} size={65} />
                        <span>
                          <strong>{formatTable(row.tableNo)} Menu</strong>
                          <small>Scan for {formatTable(row.tableNo)}</small>
                          <em>Click to enlarge</em>
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          type="button"
                          title="Edit table number"
                          className="action-button edit-action"
                          disabled={!!busy}
                          onClick={() => {
                            setEditing(row);
                            setEditValue(String(row.tableNo));
                          }}
                        >
                          <Pencil size={15} strokeWidth={2.4} />
                          <b>Edit</b>
                        </button>
                        <button
                          type="button"
                          title="Download scannable PNG"
                          className="action-button download-action"
                          disabled={!!busy}
                          onClick={() => download(row)}
                        >
                          <Download size={15} strokeWidth={2.4} />
                          <b>Download QR</b>
                        </button>
                        <button
                          type="button"
                          title={row.active ? 'Deactivate table QR' : 'Activate table QR'}
                          className={`action-button toggle-action ${row.active ? 'deactivate-action' : 'activate-action'}`}
                          disabled={!!busy}
                          onClick={() => toggle(row)}
                        >
                          <Power size={15} strokeWidth={2.4} />
                          <b>{row.active ? 'Deactivate' : 'Activate'}</b>
                        </button>
                        <button
                          type="button"
                          title={`Delete ${formatTable(row.tableNo)}`}
                          className="action-button delete-action"
                          disabled={!!busy}
                          onClick={() => remove(row)}
                          aria-label={`Delete ${formatTable(row.tableNo)}`}
                        >
                          <Trash2 size={16} strokeWidth={2.4} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      {/* Toast Notification */}
      {message && (
        <div role="status" className={`toast toast-${message.type}`}>
          {message.type === 'success' ? <Check size={17} /> : <AlertTriangle size={17} />}
          <span>{message.text}</span>
          <button aria-label="Dismiss message" onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Edit Table Modal */}
      {editing && (
        <Modal title={`Edit ${formatTable(editing.tableNo)}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="modal-form">
            <label htmlFor="edit-table-number">Table number</label>
            <input
              id="edit-table-number"
              type="number"
              min="1"
              max="99999"
              autoFocus
              required
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <p>Changes the displayed table number. The QR's permanent public identity stays the same.</p>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="create-button modal-save" disabled={!!busy}>
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Large QR Preview Modal */}
      {preview && (
        <Modal title={`${formatTable(preview.tableNo)} — Scan Menu`} onClose={() => setPreview(null)}>
          <div className="qr-preview-content">
            <TableQrImage restaurant={restaurant} table={preview} size={254} />
            <strong>
              {restaurant.name} · {formatTable(preview.tableNo)}
            </strong>
            <p>Scan this QR to visit this restaurant's digital menu with its table context.</p>
            <div className="url-preview">{getTableMenuUrl({ restaurant, table: preview })}</div>
            <div className="preview-actions">
              <button className="secondary-button" onClick={() => copyLink(preview)}>
                <Copy size={16} /> Copy link
              </button>
              <button
                className="secondary-button"
                onClick={() => window.open(getTableMenuUrl({ restaurant, table: preview }), '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={16} /> Open menu
              </button>
              <button className="create-button modal-save" onClick={() => download(preview)}>
                <Download size={17} /> Download QR
              </button>
            </div>
            {!preview.active && (
              <div className="preview-warning">
                <AlertTriangle size={17} /> This QR is inactive. The production backend will reject its scans and orders.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
