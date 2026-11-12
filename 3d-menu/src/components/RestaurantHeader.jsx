import { useState } from "react";
import { Utensils } from "lucide-react";
import "./RestaurantHeader.css";

function FollowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M3 20v-2a6 6 0 0 1 12 0" />
      <path d="M15 12h7M18.5 8.5v7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

/**
 * Top restaurant brand header displaying logo, 24 DIGITAL badge, full restaurant
 * script title with inline follow / verified tick state, welcome subtitle, and MENU action.
 */
export default function RestaurantHeader({
  name = "Moneky Bhai",
  logoUrl,
  brand = "24 DIGITAL",
  welcomeText = "Welcome, Our Dear Guest",
  isFollowing = false,
  onFollow,
  onMenuClick,
  onLogoClick,
  rightExtra = null,
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleFollow(e) {
    e.stopPropagation();
    if (pending || isFollowing || !onFollow) return;

    setPending(true);
    setError("");

    try {
      // Parent updates isFollowing after the API confirms success.
      await onFollow();
    } catch {
      setError("Could not follow. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="restaurant-header-container">
      <header className="restaurant-header">
        <button
          type="button"
          className={`restaurant-logo-btn ${logoUrl ? "has-image" : "no-image"}`}
          onClick={onLogoClick}
          title="Open Restaurant Panel"
          aria-label="Open Restaurant Panel"
        >
          {logoUrl ? (
            <img
              className="restaurant-logo"
              src={logoUrl}
              alt={`${name} logo`}
              width="64"
              height="64"
            />
          ) : (
            <Utensils className="restaurant-logo-fallback" />
          )}
        </button>

        <div className="restaurant-info">
          <div className="restaurant-brand">
            <span>{brand}</span>
            <span className="brand-dot" aria-hidden="true" />
          </div>

          <div className="restaurant-name-row">
            <h1 className="restaurant-name">{name}</h1>

            {isFollowing ? (
              <span
                className="restaurant-following"
                role="img"
                aria-label={`You are following ${name}`}
                title={`You are following ${name}`}
              >
                <CheckIcon />
              </span>
            ) : (
              <button
                className="restaurant-follow"
                type="button"
                onClick={handleFollow}
                disabled={pending || !onFollow}
                aria-label={`Follow ${name}`}
                aria-busy={pending}
                title={`Follow ${name}`}
              >
                <span className="restaurant-follow-circle">
                  {pending ? (
                    <span className="follow-spinner" />
                  ) : (
                    <FollowIcon />
                  )}
                </span>
              </button>
            )}
          </div>

          <p className="restaurant-welcome">{welcomeText}</p>
        </div>

        <div className="restaurant-actions">
          <button
            className="restaurant-menu"
            type="button"
            onClick={onMenuClick}
            aria-label="Open Food Menu"
          >
            <span className="restaurant-menu-pill">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>MENU</span>
            </span>
          </button>
          {rightExtra}
        </div>
      </header>

      {error && (
        <p className="restaurant-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

