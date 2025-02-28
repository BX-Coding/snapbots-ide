import React from "react";
import { Link } from "react-router-dom";
import "./style.css";
// Use a placeholder image until you have the actual logo
const logo = require("../../assets/eucalyptusLogo.png");

const HomePage = () => {
  return (
    <div>
      <header className="homepage-header">
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
      
    
            <section>
                <p>This is a Tufts capstone project for the 2024-25 year.</p>
            </section>

            <section>
                <h2>Team</h2>
                <ul>
                    <li>Dan Patterson</li>
                    <li>Duncan Johnson</li>
                    <li>Eddy Abban</li>
                    <li>Jahnea Potts</li>
                    <li>Nasir Wynruit</li>
                    <li>Dr. Ethan Danahy</li>
                </ul>
            </section>
        </div>
    </div>
  );
};

export default HomePage; 