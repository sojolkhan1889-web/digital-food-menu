import React, { useState, useMemo, useEffect } from 'react';
import {
  Store, PauseCircle, CheckCircle2, ConciergeBell, Utensils,
  ArrowUpRight, CircleCheck, Clock3, CircleAlert, PieChart,
  MapPin, UserRound, Phone, ExternalLink, Eye, Pencil, Pause, Play,
  Trash2, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, X,
  CalendarDays, ShieldCheck
} from 'lucide-react';
import './allRestaurantsStyles.css';

const fmtDate = (value) => {
  if (!value) return '—';
  const str = String(value).slice(0, 10);
  const d = new Date(`${str}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
};

const displayText = (x) => x || '—';

function Badge({ kind, value }) {
  let icon = null;
  let label = value;

  if (kind === 'type') {
    const isFine = value === 'fine' || value === 'Fine-Dine' || value === 'fine-dine';
    label = isFine ? 'Fine-Dine' : 'Non-Fine Dine';
    icon = isFine ? <ConciergeBell size={14} /> : <Utensils size={14} />;
    return <span className={`badge badge-type ${isFine ? 'badge-fine' : 'badge-non-fine'}`}>{icon}{label}</span>;
  }

  if (kind === 'settlement') {
    const s = String(value || 'settled').toLowerCase();
    label = { settled: 'Settled', pending: 'Pending', partial: 'Partial', due: 'Due' }[s] || 'Settled';
    icon = {
      settled: <CircleCheck size={14} />,
      pending: <Clock3 size={14} />,
      partial: <PieChart size={14} />,
      due: <CircleAlert size={14} />
    }[s] || <CircleCheck size={14} />;
    return <span className={`badge badge-settlement badge-${s}`}>{icon}{label}</span>;
  }

  if (kind === 'status') {
    const isActive = value === 'active';
    label = isActive ? 'Active' : 'Suspended';
    return <span className={`badge badge-status ${isActive ? 'badge-active' : 'badge-suspended'}`}>{label}</span>;
  }

  return <span className="badge">{label}</span>;
}

function KpiCards({ overview }) {
  const kpiDefs = [
    { key: 'total', label: 'Total Restaurants', icon: Store, tone: 'orange' },
    { key: 'suspended', label: 'Suspended Restaurants', icon: PauseCircle, tone: 'red' },
    { key: 'active', label: 'Active Restaurants', icon: CheckCircle2, tone: 'green' },
    { key: 'fineDine', label: 'Fine-Dine Restaurants', icon: ConciergeBell, tone: 'purple' },
    { key: 'nonFineDine', label: 'Non-Fine Dine Restaurants', icon: Utensils, tone: 'blue' }
  ];

  return (
    <section className="kpi-grid" aria-label="Restaurant summary">
      {kpiDefs.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className={`kpi-card kpi-${tone}`}>
          <div className="kpi-icon">
            <Icon size={26} strokeWidth={1.9} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{Number(overview?.[key] ?? 0).toLocaleString('en-US')}</div>
            <div className={`kpi-trend ${key === 'suspended' ? 'trend-red' : 'trend-green'}`}>
              <ArrowUpRight size={15} />
              <b>{overview?.delta?.[key] || '—'}</b>
              <span>from last 30 days</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function Pagination({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1, 2, 3, 4, 5];
    if (page > 3 && page < totalPages - 2) {
      pages.push(page - 1, page, page + 1);
    }
    pages.push(totalPages);
    return [...new Set(pages)].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  const display = useMemo(() => {
    const res = [];
    pageButtons.forEach((p, i) => {
      if (i > 0 && p - pageButtons[i - 1] > 1) {
        res.push('…' + i);
      }
      res.push(p);
    });
    return res;
  }, [pageButtons]);

  return (
    <div className="table-pagination">
      <div className="pagination-description">
        Showing <b>{total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</b> of <b>{total.toLocaleString()}</b> restaurants
      </div>
      <div className="pagination-actions">
        <span>Rows per page:</span>
        <span className="per-page">
          {pageSize} <ChevronDown size={14} />
        </span>
        <div className="page-buttons">
          <button
            className="page-arrow"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          {display.map(p =>
            typeof p === 'string' ? (
              <span key={p} className="page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`page-number ${p === page ? 'current' : ''}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="page-arrow"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ restaurant, onClose, onEdit }) {
  if (!restaurant) return null;
  return (
    <div className="superadmin-modal-backdrop" onClick={onClose}>
      <div className="superadmin-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-heading">
          <h2>{restaurant.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="modal-sub">Live database record details in PostgreSQL</p>
        <dl>
          {[
            ['ID', restaurant.displayId || restaurant.display_id || restaurant.id],
            ['Owner', restaurant.ownerName || restaurant.owner_name],
            ['Phone', restaurant.ownerPhone || restaurant.owner_phone || restaurant.phone],
            ['Type', (restaurant.type === 'fine' || restaurant.restaurant_type === 'fine') ? 'Fine-Dine' : 'Non-Fine Dine'],
            ['Menu Slug', `/${restaurant.menuSlug || restaurant.slug}`],
            ['Location', restaurant.location || restaurant.address],
            ['Plan', restaurant.plan],
            ['Tables', `${restaurant.tableCount || restaurant.table_count || 12} Tables`],
            ['Settlement', restaurant.settlementStatus || restaurant.settlement_status],
            ['Joined', fmtDate(restaurant.joinedAt || restaurant.created_at)],
            ['Status', restaurant.status]
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd>{displayText(v)}</dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Close</button>
          <button
            className="orange-btn"
            onClick={() => {
              onClose();
              onEdit(restaurant);
            }}
          >
            <Pencil size={15} /> Edit Restaurant
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ restaurant, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    slug: restaurant?.slug || restaurant?.menuSlug || '',
    ownerName: restaurant?.ownerName || restaurant?.owner_name || '',
    ownerPhone: restaurant?.ownerPhone || restaurant?.owner_phone || restaurant?.phone || '',
    type: restaurant?.type || restaurant?.restaurant_type || 'fine',
    settlementStatus: restaurant?.settlementStatus || restaurant?.settlement_status || 'settled',
    status: restaurant?.status || 'active',
    location: restaurant?.location || restaurant?.address || '',
    plan: restaurant?.plan || 'Starter',
    tableCount: restaurant?.tableCount || restaurant?.table_count || 12
  });
  const [saving, setSaving] = useState(false);

  if (!restaurant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(restaurant.id, formData);
      onClose();
    } catch (err) {
      console.error('Failed to update restaurant:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="superadmin-modal-backdrop" onClick={onClose}>
      <div className="superadmin-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-heading">
          <h2>Edit Restaurant</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="modal-sub">Update live restaurant metadata in Supabase PostgreSQL</p>
        <form onSubmit={handleSubmit}>
          <div className="superadmin-form-group">
            <label>Restaurant Name</label>
            <input
              className="superadmin-form-input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Owner Name</label>
              <input
                className="superadmin-form-input"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                required
              />
            </div>
            <div className="superadmin-form-group">
              <label>Owner Phone</label>
              <input
                className="superadmin-form-input"
                value={formData.ownerPhone}
                onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Restaurant Type</label>
              <select
                className="superadmin-form-select"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="fine">Fine-Dine</option>
                <option value="non-fine">Non-Fine Dine</option>
              </select>
            </div>
            <div className="superadmin-form-group">
              <label>Settlement Status</label>
              <select
                className="superadmin-form-select"
                value={formData.settlementStatus}
                onChange={e => setFormData({ ...formData, settlementStatus: e.target.value })}
              >
                <option value="settled">Settled</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="due">Due</option>
              </select>
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Subscription Plan</label>
              <select
                className="superadmin-form-select"
                value={formData.plan}
                onChange={e => setFormData({ ...formData, plan: e.target.value })}
              >
                <option value="Starter">Starter</option>
                <option value="Business">Business</option>
                <option value="Pro">Pro</option>
                <option value="Pro Holographic">Pro Holographic</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div className="superadmin-form-group">
              <label>Table Count</label>
              <input
                type="number"
                min="1"
                max="500"
                className="superadmin-form-input"
                value={formData.tableCount}
                onChange={e => setFormData({ ...formData, tableCount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Location / City</label>
              <input
                className="superadmin-form-input"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="superadmin-form-group">
              <label>Status</label>
              <select
                className="superadmin-form-select"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="orange-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerPhone: '+8801',
    type: 'fine',
    settlementStatus: 'settled',
    plan: 'Pro Holographic',
    tableCount: 12,
    location: 'Dhaka, Bangladesh',
    login_id: '',
    password: 'password123'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const generatedSlug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const uniqueId = `resto_${Date.now()}`;
      await onAdd({
        id: uniqueId,
        name: formData.name,
        slug: generatedSlug,
        owner_name: formData.ownerName,
        ownerName: formData.ownerName,
        owner_phone: formData.ownerPhone,
        ownerPhone: formData.ownerPhone,
        phone: formData.ownerPhone,
        restaurant_type: formData.type,
        type: formData.type,
        settlement_status: formData.settlementStatus,
        settlementStatus: formData.settlementStatus,
        plan: formData.plan,
        table_count: formData.tableCount,
        tableCount: formData.tableCount,
        address: formData.location,
        location: formData.location,
        status: 'active',
        login_id: formData.login_id || `admin_${generatedSlug}`,
        password: formData.password || 'password123',
        avatar: formData.name.slice(0, 2).toUpperCase()
      });
      onClose();
    } catch (err) {
      console.error('Failed to add restaurant:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="superadmin-modal-backdrop" onClick={onClose}>
      <div className="superadmin-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-heading">
          <h2>Add New Restaurant</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="modal-sub">Register a new restaurant tenant into Supabase PostgreSQL</p>
        <form onSubmit={handleSubmit}>
          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Restaurant Name</label>
              <input
                className="superadmin-form-input"
                placeholder="e.g. Sultan's Dine"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="superadmin-form-group">
              <label>Menu URL Slug</label>
              <input
                className="superadmin-form-input"
                placeholder="e.g. sultans-dine"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Owner Name</label>
              <input
                className="superadmin-form-input"
                placeholder="e.g. Md. Hossain"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                required
              />
            </div>
            <div className="superadmin-form-group">
              <label>Owner Phone</label>
              <input
                className="superadmin-form-input"
                placeholder="+8801700000000"
                value={formData.ownerPhone}
                onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Restaurant Type</label>
              <select
                className="superadmin-form-select"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="fine">Fine-Dine</option>
                <option value="non-fine">Non-Fine Dine</option>
              </select>
            </div>
            <div className="superadmin-form-group">
              <label>Settlement Status</label>
              <select
                className="superadmin-form-select"
                value={formData.settlementStatus}
                onChange={e => setFormData({ ...formData, settlementStatus: e.target.value })}
              >
                <option value="settled">Settled</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="due">Due</option>
              </select>
            </div>
          </div>

          <div className="superadmin-form-row">
            <div className="superadmin-form-group">
              <label>Subscription Plan</label>
              <select
                className="superadmin-form-select"
                value={formData.plan}
                onChange={e => setFormData({ ...formData, plan: e.target.value })}
              >
                <option value="Starter">Starter</option>
                <option value="Business">Business</option>
                <option value="Pro">Pro</option>
                <option value="Pro Holographic">Pro Holographic</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div className="superadmin-form-group">
              <label>Table Count</label>
              <input
                type="number"
                min="1"
                max="500"
                className="superadmin-form-input"
                value={formData.tableCount}
                onChange={e => setFormData({ ...formData, tableCount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="superadmin-form-group">
            <label>Location / City</label>
            <input
              className="superadmin-form-input"
              placeholder="e.g. Dhaka, Gulshan-2"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="orange-btn" disabled={saving}>
              {saving ? 'Creating...' : '+ Register Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AllRestaurantsView({
  restaurants = [],
  onOpenAddModal,
  onToggleStatus,
  onDeleteRestaurant,
  onUpdateRestaurant,
  onAddRestaurant,
  onOpenRestaurantPanel,
  showToast
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const pageSize = 25;

  // Live KPI Overview calculations directly from PostgreSQL data
  const overview = useMemo(() => {
    const total = restaurants.length;
    const suspended = restaurants.filter(r => r.status === 'suspended').length;
    const active = restaurants.filter(r => r.status === 'active').length;
    const fineDine = restaurants.filter(r => r.type === 'fine' || r.restaurant_type === 'fine').length;
    const nonFineDine = restaurants.filter(r => r.type === 'non-fine' || r.restaurant_type === 'non-fine').length;

    return {
      total,
      suspended,
      active,
      fineDine,
      nonFineDine,
      delta: {
        total: `+${total} (Live)`,
        suspended: `${suspended} (0.0%)`,
        active: `+${active} (100%)`,
        fineDine: `${fineDine} (${total > 0 ? Math.round((fineDine / total) * 100) : 0}%)`,
        nonFineDine: `${nonFineDine} (${total > 0 ? Math.round((nonFineDine / total) * 100) : 0}%)`
      }
    };
  }, [restaurants]);

  // Client-side filtering across fields
  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      const statusMatch = filter === 'all' || r.status === filter;
      const q = query.trim().toLowerCase();
      if (!q) return statusMatch;

      const searchable = [
        r.name,
        r.ownerName,
        r.owner_name,
        r.ownerPhone,
        r.owner_phone,
        r.phone,
        r.menuSlug,
        r.slug,
        r.location,
        r.address,
        r.displayId,
        r.display_id,
        r.id
      ];

      const textMatch = searchable.some(field =>
        String(field || '').toLowerCase().includes(q)
      );

      return statusMatch && textMatch;
    });
  }, [restaurants, query, filter]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  // Sliced page data (25 per page)
  const currentRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Handle Status Toggle with prompt
  const handleToggle = async (r) => {
    const nextStatus = r.status === 'active' ? 'suspended' : 'active';
    const actionWord = nextStatus === 'suspended' ? 'Suspend' : 'Activate';
    if (!window.confirm(`Are you sure you want to ${actionWord.toLowerCase()} "${r.name}"?`)) return;

    if (onToggleStatus) {
      await onToggleStatus(r.id, nextStatus);
      showToast?.(`${r.name} is now ${nextStatus}.`);
    }
  };

  // Handle Delete with confirmation
  const handleDelete = async (r) => {
    if (!window.confirm(`Permanently delete "${r.name}" and associated database settings from Supabase?`)) return;

    if (onDeleteRestaurant) {
      await onDeleteRestaurant(r.id, r.name);
      showToast?.(`Deleted ${r.name} successfully.`);
    }
  };

  // Handle Edit Save
  const handleSaveEdit = async (id, data) => {
    if (onUpdateRestaurant) {
      await onUpdateRestaurant(id, data);
      showToast?.(`Updated ${data.name} details in PostgreSQL.`);
    }
  };

  // Handle Add
  const handleCreateRestaurant = async (data) => {
    if (onAddRestaurant) {
      await onAddRestaurant(data);
      showToast?.(`Created ${data.name} in PostgreSQL.`);
    }
  };

  return (
    <div className="all-restaurants-wrapper">
      {/* 1. All Registered Restaurants Banner (20px below topbar) */}
      <section className="section-banner">
        <div className="banner-illustration" aria-hidden="true">
          <span>☀</span>
          <span>▤</span>
        </div>
        <div className="section-icon">
          <Store size={30} />
        </div>
        <div className="banner-copy">
          <h2>All Registered Restaurants</h2>
          <p>
            Live Supabase database connection <span>•</span> Total {overview.total.toLocaleString()} restaurant(s) in PostgreSQL
          </p>
        </div>
        <button
          className="orange-btn banner-add"
          onClick={() => {
            if (onOpenAddModal) onOpenAddModal();
            else setIsAddOpen(true);
          }}
        >
          <Plus size={16} /> Add Restaurant
        </button>
      </section>

      {/* 2. Five Live KPI Cards */}
      <KpiCards overview={overview} />

      {/* 3. Spacing: 30px below KPI cards & Table Area */}
      <section className="restaurants-area" aria-label="Restaurant directory">
        {/* Search & Status Filter */}
        <div className="filter-row">
          <label className="search-wrap">
            <Search size={18} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search restaurant by name, owner, slug or location..."
              aria-label="Search restaurants"
            />
          </label>
          <div className="filter-select">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              aria-label="Filter by restaurant status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <ChevronDown size={16} />
          </div>
        </div>

        {/* 10-Column Semantic Table Card */}
        <div className="table-card">
          <div className="table-scroll">
            <table className="restaurant-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Restaurant Info</th>
                  <th>Restaurant Type</th>
                  <th>Menu Slug</th>
                  <th>Location</th>
                  <th>Plans & Tables</th>
                  <th>Settlement Status</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th className="actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map(r => (
                  <tr key={r.id}>
                    {/* 1. ID */}
                    <td>
                      <strong className="restaurant-id">
                        {r.displayId || r.display_id || String(r.id).slice(0, 8)}
                      </strong>
                    </td>

                    {/* 2. Restaurant Info: Avatar + 3 lines stacked */}
                    <td>
                      <div className="restaurant-info">
                        <div className="restaurant-avatar">
                          {r.avatar || r.name?.slice(0, 2)?.toUpperCase()}
                        </div>
                        <div className="restaurant-description">
                          <strong title={r.name}>{displayText(r.name)}</strong>
                          <small>
                            <UserRound size={12} />
                            {displayText(r.ownerName || r.owner_name)}
                          </small>
                          <small>
                            <Phone size={12} />
                            {displayText(r.ownerPhone || r.owner_phone || r.phone)}
                          </small>
                        </div>
                      </div>
                    </td>

                    {/* 3. Restaurant Type */}
                    <td>
                      <Badge kind="type" value={r.type || r.restaurant_type} />
                    </td>

                    {/* 4. Menu Slug */}
                    <td>
                      <span className="slug" title={`/${r.menuSlug || r.slug}`}>
                        /{displayText(r.menuSlug || r.slug)}
                      </span>
                    </td>

                    {/* 5. Location */}
                    <td>
                      <span className="location">
                        <MapPin size={15} />
                        {displayText(r.location || r.address)}
                      </span>
                    </td>

                    {/* 6. Plans & Tables */}
                    <td>
                      <div className="plans">
                        <strong>{displayText(r.plan || 'Starter')}</strong>
                        <small>
                          <Store size={13} />
                          {Number(r.tableCount || r.table_count || 12)} Tables
                        </small>
                      </div>
                    </td>

                    {/* 7. Settlement Status */}
                    <td>
                      <Badge kind="settlement" value={r.settlementStatus || r.settlement_status} />
                    </td>

                    {/* 8. Joining Date */}
                    <td>
                      <span className="join-date">
                        <CalendarDays size={15} />
                        {fmtDate(r.joinedAt || r.created_at)}
                      </span>
                    </td>

                    {/* 9. Status */}
                    <td>
                      <Badge kind="status" value={r.status} />
                    </td>

                    {/* 10. Actions */}
                    <td>
                      <div className="row-actions">
                        <button
                          className="rs-panel"
                          onClick={() => onOpenRestaurantPanel?.(r)}
                          title="Open this restaurant panel with authorized Super Admin access"
                        >
                          <ExternalLink size={14} />
                          Rs Panel
                        </button>
                        <button
                          className="action-square"
                          onClick={() => setDetailModal(r)}
                          title="View restaurant details"
                          aria-label={`View ${r.name}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-square"
                          onClick={() => setEditModal(r)}
                          title="Edit restaurant"
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className={`action-square action-state ${r.status === 'active' ? 'suspend' : 'activate'}`}
                          onClick={() => handleToggle(r)}
                          title={r.status === 'active' ? 'Suspend restaurant' : 'Activate restaurant'}
                          aria-label={`${r.status === 'active' ? 'Suspend' : 'Activate'} ${r.name}`}
                        >
                          {r.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button
                          className="action-square action-delete"
                          onClick={() => handleDelete(r)}
                          title="Delete restaurant from Supabase"
                          aria-label={`Delete ${r.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="empty-state">
                <Search size={26} />
                <b>No restaurants found</b>
                <span>Try a different search query or status filter.</span>
              </div>
            )}
          </div>

          {/* Pagination: Exactly 25 per page */}
          <Pagination
            page={page}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </section>

      {/* Modals */}
      <DetailModal
        restaurant={detailModal}
        onClose={() => setDetailModal(null)}
        onEdit={(r) => setEditModal(r)}
      />

      <EditModal
        restaurant={editModal}
        onClose={() => setEditModal(null)}
        onSave={handleSaveEdit}
      />

      {isAddOpen && (
        <AddModal
          onClose={() => setIsAddOpen(false)}
          onAdd={handleCreateRestaurant}
        />
      )}
    </div>
  );
}

