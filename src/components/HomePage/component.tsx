import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./style.css";
// @ts-ignore
import puppyDiagram from "../../assets/puppy_diagram.jpg";
// @ts-ignore
import uiScreenshot from "../../assets/snapbots_ui.png";
// @ts-ignore
import snapBotsRobot from "../../assets/snapbot_robot.png";

const HomePage = () => {
  const navigate = useNavigate();

  const handleLaunchSoccer = () => {
    localStorage.setItem('snapbotMode', 'soccer');
    // useLocalStorage expects JSON-encoded values
    localStorage.setItem('patchProjectId', JSON.stringify('soccer'));
    navigate('/app');
  };

  return (
    <div className="homepage">
      <main>
        <section className="hero">
          <h1>SNAPBOTS: BRINGING DIAGRAMS TO LIFE</h1>
          <p className="subtitle">A Tufts Senior Capstone Project</p>
          <div className="hero-buttons">
            <Link to="/app" className="cta-button">Launch App</Link>
            <button onClick={handleLaunchSoccer} className="cta-button soccer-button">Launch Soccer Game</button>
          </div>
        </section>

        <section className="features">
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Easy to Use</h3>
              <div className="feature-image">
                <img src={puppyDiagram} alt="State diagram drawing example" />
              </div>
              <p>Draw simple programs as state diagrams on paper and watch them come to life</p>
            </div>
            <div className="feature-card">
              <h3>Simulate Virtually</h3>
              <div className="feature-image">
                <img src={uiScreenshot} alt="Scratch-based simulation interface" />
              </div>
              <p>Create and test robot behaviors using our Scratch-based, collaborative web simulation platform</p>
            </div>
            <div className="feature-card">
              <h3>Deploy Physically</h3>
              <div className="feature-image">
                <img src={snapBotsRobot} alt="ESP32 robot with motors and sensors" />
              </div>
              <p>Run your programs on low-cost ESP32 robots with motors and sensors</p>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <h3>1. Draw</h3>
              <p>Students create state diagrams on paper</p>
            </div>
            <div className="step">
              <h3>2. Scan</h3>
              <p>Our computer vision system processes the diagrams</p>
            </div>
            <div className="step">
              <h3>3. Generate</h3>
              <p>AI converts diagrams into executable code</p>
            </div>
            <div className="step">
              <h3>4. Run</h3>
              <p>Test in our simulator or deploy to physical robots</p>
            </div>
          </div>
        </section>

        <section className="team">
          <h2>Our Team</h2>
          <div className="team-members">
            <p>Eddy Abban • Duncan Johnson • Jahnea Potts • Danesia Patterson • Nasir Wynruit</p>
            <p className="advisor">Faculty Advisor: Dr. Ethan Danahy</p>
          </div>
        </section>

        <section className="cta">
          <h2>Try It Out Yourself!</h2>
          <div className="hero-buttons">
            <Link to="/app" className="cta-button">Launch App</Link>
            <button onClick={handleLaunchSoccer} className="cta-button soccer-button">Launch Soccer Game</button>
          </div>
        </section>
      </main>

      <footer>
        <p>A Tufts University School of Engineering Capstone Project</p>
      </footer>
    </div>
  );
};

export default HomePage; 