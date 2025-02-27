import React from "react";
import { Link } from "react-router-dom";
import "./style.css";
// Use a placeholder image until you have the actual logo
const logo = require("../../assets/eucalytpusLogo.png");

const HomePage = () => {
  return (
    <div>
      <header className="homepage-header">
        {/* You'll need to create a Header component or replace this */}
        <nav>
          <div className="logo-small">Project Eucalyptus</div>
          <div className="nav-links">
            <Link to="/app">Launch App</Link>
          </div>
        </nav>
      </header>

      <div className="flex-col-center full-height">
        <h1 className="text-4xl-bold text-center">
          <span className="logo-container">
            <span className="logo">
              <picture>
                <source srcSet={logo} type="image/png" />
                <img src={logo} alt="Project Eucalyptus Logo" />
              </picture>
            </span>
          </span>
          Project Eucalyptus
        </h1>
      </div>
    </div>
  );
};

export default HomePage; 