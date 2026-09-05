import React from "react";
import { Link, useLocation } from "react-router-dom";

// ACQAR-style top header (matches your uploaded screenshot)
// - white bar
// - logo left
// - menu: Products / How It Works / Roadmap
// - right: (small icon) + Log In + Request Access button

const styles = `
  .nb-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
  }

  .nb-container {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 24px;
  }

  .nb-row {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nb-logo-link {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
  }

  .nb-logo-badge {
    width: 36px; height: 36px;
    border-radius: 999px;
    background: #2563eb;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    font-weight: 800;
  }

  .nb-logo-text {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #0f172a;
  }

  .nb-nav {
    display: none;
    align-items: center;
    gap: 24px;
  }
  @media (min-width: 768px) {
    .nb-nav { display: flex; }
  }

  .nb-nav-item {
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    color: #64748b;
    transition: color 0.15s;
  }
  .nb-nav-item:hover { color: #0f172a; }
  .nb-nav-item.is-active { color: #0f172a; }

  .nb-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nb-icon-btn {
    width: 36px; height: 36px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    color: #334155;
    cursor: pointer;
    transition: background 0.15s;
  }
  .nb-icon-btn:hover { background: #f8fafc; }
  .nb-icon-btn span { font-size: 14px; }

  .nb-login-link {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    text-decoration: none;
    transition: color 0.15s;
  }
  .nb-login-link:hover { color: #0f172a; }

  .nb-cta {
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    background: #2563eb;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: background 0.15s;
  }
  .nb-cta:hover { background: #1d4ed8; }
`;

export default function NavBar() {
  const { pathname } = useLocation();

  const isActive = (path) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(path + "/");
  };

  const NavItem = ({ to, children }) => (
    <Link
      to={to}
      className={`nb-nav-item${isActive(to) ? " is-active" : ""}`}
    >
      {children}
    </Link>
  );

  return (
    <header className="nb-header">
      <style>{styles}</style>

      <div className="nb-container">
        <div className="nb-row">
          {/* Left: Logo */}
          <Link to="/home" className="nb-logo-link">
            <div className="nb-logo-badge">A</div>
            <div className="nb-logo-text">ACQAR</div>
          </Link>

          {/* Middle: Menu */}
          <nav className="nb-nav">
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/how-it-works">How It Works</NavItem>
            <NavItem to="/roadmap">Roadmap</NavItem>
            <a href="https://www.acqar.com/blogs" className="nb-nav-item">
              Resources
            </a>
          </nav>

          {/* Right: icon + Log in + Request Access */}
          <div className="nb-right">
            <button type="button" className="nb-icon-btn" aria-label="Theme / Profile">
              <span>◐</span>
            </button>
            <Link to="/login" className="nb-login-link">
              Log In
            </Link>
            <a href="https://acqar-mvp.onrender.com/valuation" className="nb-cta">
              Request Access
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
