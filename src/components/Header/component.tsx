import React from "react";
import { Link } from "react-router-dom";
import "./style.css";

const Header = () => {
  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-logo">Project Eucalyptus</div>
        <nav className="header-nav">
          <Link to="/app" className="nav-button">Launch App</Link>
          {/* Add more navigation links as needed */}
        </nav>
      </div>
    </header>
  );
};

export default Header; 