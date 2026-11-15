import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Menu,
  Moon,
  Sun,
  Bell,
  Plus,
  MapPin,
  Store,
  UtensilsCrossed,
  Globe,
  Search,
  Check,
  X,
  ChevronDown,
  Clock
} from "lucide-react";
import "./RestaurantTopBar.css";

const POPULAR_TIMEZONES = [
  { id: "Asia/Dhaka", city: "Dhaka", country: "Bangladesh", offset: "GMT+6" },
  { id: "Asia/Kolkata", city: "Kolkata / Mumbai", country: "India", offset: "GMT+5:30" },
  { id: "Asia/Dubai", city: "Dubai", country: "UAE", offset: "GMT+4" },
  { id: "Asia/Riyadh", city: "Riyadh", country: "Saudi Arabia", offset: "GMT+3" },
  { id: "Asia/Qatar", city: "Doha", country: "Qatar", offset: "GMT+3" },
  { id: "Asia/Singapore", city: "Singapore", country: "Singapore", offset: "GMT+8" },
  { id: "Asia/Kuala_Lumpur", city: "Kuala Lumpur", country: "Malaysia", offset: "GMT+8" },
  { id: "Asia/Bangkok", city: "Bangkok", country: "Thailand", offset: "GMT+7" },
  { id: "Asia/Tokyo", city: "Tokyo", country: "Japan", offset: "GMT+9" },
  { id: "Asia/Karachi", city: "Karachi / Islamabad", country: "Pakistan", offset: "GMT+5" },
  { id: "Europe/London", city: "London", country: "United Kingdom", offset: "GMT+0/+1" },
  { id: "Europe/Paris", city: "Paris", country: "France", offset: "GMT+1/+2" },
  { id: "Europe/Berlin", city: "Berlin / Frankfurt", country: "Germany", offset: "GMT+1/+2" },
  { id: "Europe/Rome", city: "Rome", country: "Italy", offset: "GMT+1/+2" },
  { id: "America/New_York", city: "New York", country: "United States (EST)", offset: "GMT-5/-4" },
  { id: "America/Chicago", city: "Chicago", country: "United States (CST)", offset: "GMT-6/-5" },
  { id: "America/Los_Angeles", city: "Los Angeles", country: "United States (PST)", offset: "GMT-8/-7" },
  { id: "America/Toronto", city: "Toronto", country: "Canada", offset: "GMT-5/-4" },
  { id: "Australia/Sydney", city: "Sydney", country: "Australia", offset: "GMT+10/+11" },
  { id: "UTC", city: "UTC", country: "Universal Coordinated Time", offset: "GMT+0" },
];

export default function RestaurantTopBar({
  restaurantName = "Hungry Bite Café",
  restaurantLogo = "",
  planName = "Standard Menu",
  section = "FOODS",
  pageTitle = "Food Items & Universal Menu Engine",
  pageSubtitle = "Manage food items, categories, and your digital menu",
  notificationCount = 22,
  sidebarCollapsed = false,
  showIdentity = false,
  actionLabel = "Add New Food",

  darkMode = false,
  onToggleDarkMode,
  onToggleSidebar,
  onOpenNotifications,
  onAddNewFood,
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Timezone state with persistent localStorage support
  const [currentTimeZone, setCurrentTimeZone] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("restaurant_selected_timezone");
        if (saved) return saved;
      } catch (e) {}
    }
    return "Asia/Dhaka";
  });

  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const modalRef = useRef(null);

  // Device resolved timezone
  const deviceTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
    } catch (e) {
      return "Asia/Dhaka";
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time and date dynamically according to selected timezone
  const time = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: currentTimeZone,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(currentTime);
    } catch (e) {
      return currentTime.toLocaleTimeString();
    }
  }, [currentTime, currentTimeZone]);

  const date = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: currentTimeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(currentTime);
    } catch (e) {
      return currentTime.toLocaleDateString();
    }
  }, [currentTime, currentTimeZone]);

  // Handle timezone select
  const handleSelectTimezone = (tzId) => {
    setCurrentTimeZone(tzId);
    try {
      localStorage.setItem("restaurant_selected_timezone", tzId);
    } catch (e) {}
    setIsTimezoneModalOpen(false);
    setTimezoneSearch("");
  };

  // Filtered timezone list
  const filteredTimezones = useMemo(() => {
    const q = timezoneSearch.trim().toLowerCase();
    if (!q) return POPULAR_TIMEZONES;
    return POPULAR_TIMEZONES.filter(
      (tz) =>
        tz.city.toLowerCase().includes(q) ||
        tz.country.toLowerCase().includes(q) ||
        tz.id.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q)
    );
  }, [timezoneSearch]);

  // Click outside listener to close timezone modal
  useEffect(() => {
    if (!isTimezoneModalOpen) return;
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsTimezoneModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isTimezoneModalOpen]);

  return (
    <>
      <header
        className={`dfm-topbar ${
          darkMode ? "dfm-topbar--dark" : ""
        } ${!showIdentity ? "dfm-topbar--no-identity" : ""} ${
          !sidebarCollapsed ? "dfm-topbar--sidebar-expanded" : "dfm-topbar--sidebar-collapsed"
        }`}
      >
        {/* Restaurant Identity */}
        {showIdentity && (
          <>
            <div className="dfm-topbar__identity">
              <div className="dfm-topbar__logo">
                {restaurantLogo ? (
                  <img
                    src={restaurantLogo}
                    alt={`${restaurantName} logo`}
                  />
                ) : (
                  <UtensilsCrossed size={27} />
                )}
              </div>

              <div className="dfm-topbar__restaurant">
                <h2 title={restaurantName}>
                  {restaurantName}
                </h2>

                <span className="dfm-topbar__plan">
                  <span className="dfm-topbar__blue-dot" />
                  {planName}
                </span>
              </div>
            </div>

            <div className="dfm-topbar__divider" />
          </>
        )}

        {/* Sidebar Toggle */}
        <button
          type="button"
          className="dfm-topbar__menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <Menu size={24} strokeWidth={2.5} />
        </button>

        {/* Page Information */}
        <div className="dfm-topbar__page">
          <div className="dfm-topbar__breadcrumb">
            <span className="dfm-topbar__portal">
              <Store size={14} />
              RESTAURANT PORTAL
            </span>

            <span className="dfm-topbar__slash">/</span>

            <span className="dfm-topbar__section">
              {section}
            </span>
          </div>

          <h1>{pageTitle}</h1>

          <p>{pageSubtitle}</p>
        </div>

        {/* Live Interactive Clock with Timezone Selector Trigger (Desktop & Mobile) */}
        <div
          className="dfm-topbar__clock dfm-topbar__clock--clickable"
          onClick={() => setIsTimezoneModalOpen((prev) => !prev)}
          title="Click to select or change timezone"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsTimezoneModalOpen((prev) => !prev);
            }
          }}
        >
          <span className="dfm-topbar__online-dot" />

          <div className="dfm-topbar__clock-content">
            <div className="dfm-topbar__clock-main">
              <strong>{time}</strong>
              <span className="dfm-topbar__clock-divider">|</span>
              <span>{date}</span>
            </div>

            <div className="dfm-topbar__timezone">
              <MapPin size={13} className="text-orange-500 shrink-0" />
              <span className="truncate max-w-[120px]">{currentTimeZone}</span>
              <ChevronDown size={12} className="opacity-70 shrink-0 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Right-side Controls */}
        <div className="dfm-topbar__actions">
          {/* Theme Toggle */}
          <button
            type="button"
            className="dfm-topbar__theme-btn"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun size={20} />
            ) : (
              <Moon size={20} />
            )}

            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="dfm-topbar__notification-btn"
            onClick={onOpenNotifications}
            aria-label={`Notifications: ${notificationCount}`}
            title="Notifications & Support"
          >
            <Bell size={22} />

            {notificationCount > 0 && (
              <span className="dfm-topbar__notification-count">
                {notificationCount > 99
                  ? "99+"
                  : notificationCount}
              </span>
            )}
          </button>

          {/* Primary Action */}
          {onAddNewFood && (
            <button
              type="button"
              className="dfm-topbar__add-btn"
              onClick={onAddNewFood}
              title={actionLabel}
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      </header>

      {/* Interactive Timezone Selector Modal */}
      {isTimezoneModalOpen && (
        <div className="dfm-tz-overlay" onClick={() => setIsTimezoneModalOpen(false)}>
          <div
            className={`dfm-tz-modal ${darkMode ? "dfm-tz-modal--dark" : ""}`}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="dfm-tz-header">
              <div className="dfm-tz-header-title">
                <Globe size={18} className="text-orange-500" />
                <span>Select Restaurant Timezone</span>
              </div>
              <button
                type="button"
                className="dfm-tz-close"
                onClick={() => setIsTimezoneModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Auto-Detect Button */}
            <div className="dfm-tz-auto">
              <button
                type="button"
                className="dfm-tz-auto-btn"
                onClick={() => handleSelectTimezone(deviceTimezone)}
              >
                <Clock size={15} className="text-emerald-500" />
                <div className="text-left flex-1 min-w-0">
                  <div className="dfm-tz-auto-label">Auto-Detect My Device Location</div>
                  <div className="dfm-tz-auto-val truncate">{deviceTimezone}</div>
                </div>
                {currentTimeZone === deviceTimezone && (
                  <Check size={16} className="text-emerald-500 shrink-0" />
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="dfm-tz-search-wrap">
              <Search size={15} className="dfm-tz-search-icon" />
              <input
                type="text"
                placeholder="Search city, country or timezone..."
                value={timezoneSearch}
                onChange={(e) => setTimezoneSearch(e.target.value)}
                autoFocus
                className="dfm-tz-search-input"
              />
              {timezoneSearch && (
                <button
                  type="button"
                  className="dfm-tz-search-clear"
                  onClick={() => setTimezoneSearch("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Timezone List */}
            <div className="dfm-tz-list">
              {filteredTimezones.length === 0 ? (
                <div className="dfm-tz-empty">No timezone found matching "{timezoneSearch}"</div>
              ) : (
                filteredTimezones.map((tz) => {
                  const isSelected = currentTimeZone === tz.id;
                  let liveTzTime = "";
                  try {
                    liveTzTime = new Intl.DateTimeFormat("en-US", {
                      timeZone: tz.id,
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }).format(currentTime);
                  } catch (e) {
                    liveTzTime = "";
                  }

                  return (
                    <button
                      key={tz.id}
                      type="button"
                      className={`dfm-tz-item ${isSelected ? "dfm-tz-item--selected" : ""}`}
                      onClick={() => handleSelectTimezone(tz.id)}
                    >
                      <div className="dfm-tz-item-left">
                        <div className="dfm-tz-item-city">
                          {tz.city}
                          <span className="dfm-tz-item-country">({tz.country})</span>
                        </div>
                        <div className="dfm-tz-item-id">
                          {tz.id} · <span className="dfm-tz-item-offset">{tz.offset}</span>
                        </div>
                      </div>

                      <div className="dfm-tz-item-right">
                        {liveTzTime && <span className="dfm-tz-item-time">{liveTzTime}</span>}
                        {isSelected && <Check size={16} className="dfm-tz-item-check" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
