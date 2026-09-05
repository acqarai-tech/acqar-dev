import React from "react";
import { Link, useLocation } from "react-router-dom";

// ACQAR-style top header (matches your uploaded screenshot)
// - white bar
// - logo left
// - menu: Products / How It Works / Roadmap
// - right: (small icon) + Log In + Request Access button
export default function NavBar() {
  const { pathname } = useLocation();

  const isActive = (path) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(path + "/");
  };

  const NavItem = ({ to, children }) => (
    <Link
      to={to}
      className={[
        "text-[13px] font-semibold transition-colors",
        isActive(to) ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
      ].join(" ")}
    >
      {children}
    </Link>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-[64px] flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/home" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold">
              A
            </div>
            <div className="text-[14px] font-extrabold tracking-wide text-slate-900">
              ACQAR
            </div>
          </Link>

         {/* Middle: Menu */}
          <nav className="hidden md:flex items-center gap-6">
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/how-it-works">How It Works</NavItem>
            <NavItem to="/roadmap">Roadmap</NavItem>
            <a
              href="https://www.acqar.com/blogs"
              className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Resources
            </a>
          </nav>

          {/* Right: icon + Log in + Request Access */}
          <div className="flex items-center gap-4">
            {/* small circle icon like your screenshot */}
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50"
              aria-label="Theme / Profile"
            >
              {/* simple moon-ish icon */}
              <span className="text-[14px]">◐</span>
            </button>

            <Link
              to="/login"
              className="text-[13px] font-semibold text-slate-700 hover:text-slate-900"
            >
              Log In
            </Link>

            <a
              href="https://acqar-mvp.onrender.com/valuation"
              className="h-9 px-4 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
            >
              Request Access
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
