import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Store,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Save,
  RotateCcw,
  Info,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { formatDhakaDateTime } from './revenueSettlementService';

export const INDIVIDUAL_PREMIUM_FEATURES = [
  {
    key: 'enableDashboard',
    label: 'Live Dashboard',
    description: 'View live restaurant insights and performance summaries.',
    scope: 'Restaurant panel',
    icon: LayoutDashboard
  },
  {
    key: 'enableOrderManagement',
    label: 'Order Management',
    description: 'Receive, manage and track digital menu orders.',
    scope: 'Restaurant panel / applicable digital menu functions',
    icon: ClipboardList
  },
  {
    key: 'enablePayments',
    label: 'Customer Payments',
    description: 'Access customer payment records and transaction management.',
    scope: 'Restaurant panel',
    icon: CreditCard
  }
];

export const resolveRestaurantFeatures = (features = {}) => {
  const f = features && typeof features === 'object' ? features : {};
  const legacyGroup = Boolean(f.enableOrderManagement);
  return {
    enableDashboard: f.enableDashboard !== undefined ? Boolean(f.enableDashboard) : legacyGroup,
    enableOrderManagement: Boolean(f.enableOrderManagement),
    enablePayments: f.enablePayments !== undefined ? Boolean(f.enablePayments) : legacyGroup
  };
};

export default function PremiumFeaturesAccessView({
  restaurants = [],
  onSaveFeatureAccess,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestoId, setSelectedRestoId] = useState(() => restaurants[0]?.id || '');
  const [draftFeatures, setDraftFeatures] = useState({
    enableDashboard: false,
    enableOrderManagement: false,
    enablePayments: false
  });
  const [saving, setSaving] = useState(false);

  // Keep selectedRestoId valid if restaurants list loads asynchronously
  useEffect(() => {
    if ((!selectedRestoId || !restaurants.some(r => r.id === selectedRestoId)) && restaurants.length > 0) {
      setSelectedRestoId(restaurants[0].id);
    }
  }, [restaurants, selectedRestoId]);

  const selectedRestaurant = useMemo(
    () => restaurants.find(r => r.id === selectedRestoId) || restaurants[0] || null,
    [restaurants, selectedRestoId]
  );

  const savedFeatures = useMemo(
    () => resolveRestaurantFeatures(selectedRestaurant?.features),
    [selectedRestaurant]
  );

  // Reset draft whenever selected restaurant or its saved features change
  useEffect(() => {
    if (selectedRestaurant) {
      setDraftFeatures(resolveRestaurantFeatures(selectedRestaurant.features));
    }
  }, [selectedRestaurant]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter(r =>
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.slug || '').toLowerCase().includes(q) ||
      String(r.id || '').toLowerCase().includes(q)
    );
  }, [restaurants, searchQuery]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRestaurant) return false;
    return INDIVIDUAL_PREMIUM_FEATURES.some(
      (feat) => Boolean(draftFeatures[feat.key]) !== Boolean(savedFeatures[feat.key])
    );
  }, [selectedRestaurant, draftFeatures, savedFeatures]);

  const draftEnabledCount = useMemo(
    () => INDIVIDUAL_PREMIUM_FEATURES.filter((feat) => Boolean(draftFeatures[feat.key])).length,
    [draftFeatures]
  );

  const accessHistory = useMemo(() => {
    const hist = selectedRestaurant?.features?._accessHistory;
    return Array.isArray(hist) ? hist : [];
  }, [selectedRestaurant]);

  const handleCancel = () => {
    if (!selectedRestaurant) return;
    setDraftFeatures(savedFeatures);
  };

  const handleSave = async () => {
    if (!selectedRestaurant || !hasUnsavedChanges || saving) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const changedEntries = INDIVIDUAL_PREMIUM_FEATURES
        .filter((feat) => Boolean(draftFeatures[feat.key]) !== Boolean(savedFeatures[feat.key]))
        .map((feat, idx) => ({
          id: `acc_${Date.now()}_${idx}`,
          featureKey: feat.key,
          featureLabel: feat.label,
          previousStatus: savedFeatures[feat.key] ? 'Enabled' : 'Disabled',
          newStatus: draftFeatures[feat.key] ? 'Enabled' : 'Disabled',
          changedBy: 'Super Admin',
          timestamp: nowIso
        }));

      const nextPayload = {
        enableDashboard: Boolean(draftFeatures.enableDashboard),
        enableOrderManagement: Boolean(draftFeatures.enableOrderManagement),
        enablePayments: Boolean(draftFeatures.enablePayments)
      };

      await onSaveFeatureAccess(selectedRestaurant.id, nextPayload, changedEntries);
      if (showToast) {
        showToast(
          `Saved "${selectedRestaurant.name}" Premium Access (${draftEnabledCount} of ${INDIVIDUAL_PREMIUM_FEATURES.length} enabled).`
        );
      }
    } catch (err) {
      console.error('Failed saving premium feature access:', err);
      if (showToast) showToast('Failed to update feature access in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Header Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '18px 22px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Premium Features Access
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              Select a registered restaurant and manage access to its premium features.
            </p>
          </div>
        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          Changes apply only to the selected restaurant.
        </span>
      </div>

      {/* Main Two-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
          gap: '18px',
          alignItems: 'start'
        }}
      >
        {/* Left: Searchable Restaurant List */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Select Restaurant
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Choose a restaurant to manage.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurant..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredRestaurants.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                No restaurants match &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredRestaurants.map((r) => {
                const isSelected = r.id === selectedRestaurant?.id;
                const resolved = resolveRestaurantFeatures(r.features);
                const enabledCount = INDIVIDUAL_PREMIUM_FEATURES.filter((f) => Boolean(resolved[f.key])).length;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRestoId(r.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #f97316' : '1px solid #e2e8f0',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '9px',
                          background: isSelected ? '#ffedd5' : '#f1f5f9',
                          color: isSelected ? '#ea580c' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Store size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {r.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          /{r.slug || 'menu'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: enabledCount > 0 ? '#dcfce7' : '#f1f5f9',
                          color: enabledCount > 0 ? '#15803d' : '#475569'
                        }}
                      >
                        {enabledCount}/{INDIVIDUAL_PREMIUM_FEATURES.length} active
                      </span>
                      <ChevronRight size={15} color={isSelected ? '#ea580c' : '#94a3b8'} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748b', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
            Showing {filteredRestaurants.length} of {restaurants.length} restaurants
          </div>
        </div>

        {/* Right: Selected Restaurant Feature Access Control */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {selectedRestaurant ? (
            <>
              {/* Selected Restaurant Header */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#fff7ed',
                      color: '#ea580c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Store size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedRestaurant.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Selected restaurant · /{selectedRestaurant.slug || 'menu'}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: draftEnabledCount > 0 ? '#dcfce7' : '#f1f5f9',
                    color: draftEnabledCount > 0 ? '#15803d' : '#475569'
                  }}
                >
                  {draftEnabledCount} of {INDIVIDUAL_PREMIUM_FEATURES.length} features enabled
                </span>
              </div>

              {/* Independent Feature Access Control List */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    Premium Feature Access Control
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {INDIVIDUAL_PREMIUM_FEATURES.length} individual features
                  </span>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#ffffff'
                  }}
                >
                  {INDIVIDUAL_PREMIUM_FEATURES.map((feat, index) => {
                    const enabled = Boolean(draftFeatures[feat.key]);
                    const IconComp = feat.icon;
                    return (
                      <div
                        key={feat.key}
                        style={{
                          padding: '15px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                          background: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: '#fff7ed',
                              border: '1px solid #ffedd5',
                              color: '#ea580c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}
                          >
                            <IconComp size={17} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              {feat.label}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                              {feat.description}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              {feat.scope}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDraftFeatures((prev) => ({
                              ...prev,
                              [feat.key]: !prev[feat.key]
                            }))
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 6px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: enabled ? '#15803d' : '#64748b',
                            flexShrink: 0
                          }}
                        >
                          {enabled ? (
                            <ToggleRight size={34} color="#059669" />
                          ) : (
                            <ToggleLeft size={34} color="#94a3b8" />
                          )}
                          <span>{enabled ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#64748b'
                }}
              >
                <Info size={15} style={{ flexShrink: 0 }} />
                <span>
                  Each feature is controlled independently. Changes take effect after saving.
                </span>
              </div>

              {/* Save / Cancel Footer */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: hasUnsavedChanges ? '#ea580c' : '#64748b' }}>
                  {hasUnsavedChanges ? 'Unsaved changes ready to apply' : 'No unsaved changes'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={!hasUnsavedChanges || saving}
                    onClick={handleCancel}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: !hasUnsavedChanges || saving ? 'not-allowed' : 'pointer',
                      opacity: !hasUnsavedChanges || saving ? 0.5 : 1
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasUnsavedChanges || saving}
                    onClick={handleSave}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: hasUnsavedChanges ? '#ea580c' : '#fdba74',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: !hasUnsavedChanges || saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Select a restaurant from the left list to manage its premium features.
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Access Change History */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '18px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Access Change History
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Permission change history for the selected restaurant.
            </p>
          </div>
          {selectedRestaurant && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              {selectedRestaurant.name}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Date &amp; Time</th>
                <th style={{ padding: '10px 12px' }}>Feature</th>
                <th style={{ padding: '10px 12px' }}>Previous Status</th>
                <th style={{ padding: '10px 12px' }}>New Status</th>
                <th style={{ padding: '10px 12px' }}>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {accessHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
                    No permission changes recorded for {selectedRestaurant?.name || 'this restaurant'} yet.
                  </td>
                </tr>
              ) : (
                accessHistory.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="#64748b" />
                        {formatDhakaDateTime(h.timestamp)}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', fontWeight: 700, color: '#0f172a' }}>
                      {h.featureLabel}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: h.previousStatus === 'Enabled' ? '#dcfce7' : '#f1f5f9',
                          color: h.previousStatus === 'Enabled' ? '#15803d' : '#475569'
                        }}
                      >
                        {h.previousStatus}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: h.newStatus === 'Enabled' ? '#dcfce7' : '#fee2e2',
                          color: h.newStatus === 'Enabled' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        <CheckCircle2 size={11} />
                        {h.newStatus}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', color: '#475569', fontWeight: 600 }}>
                      {h.changedBy || 'Super Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
