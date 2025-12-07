import Link from "next/link";

export default function Home() {
  return (
    <div className="landing-wrapper">
      <header className="main-header">
        <div className="logo-image">
          <Link href="/">
            <img 
              src="/ecowaste_logo.png" 
              alt="EcoWaste Logo" 
              className="logo-img" 
            />
          </Link>
        </div>
      </header>

      <div className="signup-container">
        <div className="left-section">
          <div className="content-container">
            <h1 className="trash-text">
              One man&apos;s <span className="highlight">TRASH</span>
            </h1>
            <h1 className="treasure-text">
              is another man&apos;s <span className="highlight">TREASURE</span>
            </h1>

            <div className="start-section">
              <Link href="/login" className="start-button">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
