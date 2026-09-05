import React, { useEffect, useState } from "react";

const TruvaluFooter = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const styles = {
    footer: {
      background: "#111111",
      color: "#ffffff",
      padding: isMobile ? "40px 20px 24px" : "60px 40px 30px",
      width: "100%",
    },

    container: {
      maxWidth: "1200px",
      margin: "0 auto",
    },

    grid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "2fr 1fr 1fr 1fr",
      gap: isMobile ? "35px" : "50px",
    },

    brand: {
      maxWidth: "350px",
    },

    logo: {
      width: "150px",
      height: "auto",
      marginBottom: "18px",
    },

    description: {
      color: "#b5b5b5",
      fontSize: "14px",
      lineHeight: "1.7",
      margin: 0,
    },

    heading: {
      fontSize: "14px",
      fontWeight: "700",
      marginBottom: "18px",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },

    link: {
      display: "block",
      color: "#b5b5b5",
      textDecoration: "none",
      fontSize: "14px",
      marginBottom: "12px",
    },

    bottom: {
      marginTop: isMobile ? "35px" : "55px",
      paddingTop: "20px",
      borderTop: "1px solid #333333",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: "15px",
    },

    copyright: {
      color: "#888888",
      fontSize: "13px",
    },

    social: {
      display: "flex",
      gap: "15px",
    },

    socialLink: {
      color: "#b5b5b5",
      textDecoration: "none",
      fontSize: "13px",
    },
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>

        <div style={styles.grid}>

          {/* Brand */}
          <div style={styles.brand}>
            <img
              src="/logo.png"
              alt="Acqar"
              style={styles.logo}
            />

            <p style={styles.description}>
              AI-powered real estate valuation and property intelligence
              platform helping users make smarter property decisions.
            </p>
          </div>

          {/* Company */}
          <div>
            <h3 style={styles.heading}>Company</h3>

            <a href="/" style={styles.link}>
              Home
            </a>

            <a href="/about" style={styles.link}>
              About
            </a>

            <a href="/pricing" style={styles.link}>
              Pricing
            </a>

            <a href="/contact" style={styles.link}>
              Contact
            </a>
          </div>

          {/* Resources */}
          <div>
            <h3 style={styles.heading}>Resources</h3>

            <a href="/blogs" style={styles.link}>
              Blogs
            </a>

            <a href="/valuation" style={styles.link}>
              Property Valuation
            </a>

            <a href="/faq" style={styles.link}>
              FAQ
            </a>
          </div>

          {/* Legal */}
          <div>
            <h3 style={styles.heading}>Legal</h3>

            <a href="/privacy-policy" style={styles.link}>
              Privacy Policy
            </a>

            <a href="/terms" style={styles.link}>
              Terms & Conditions
            </a>
          </div>

        </div>

        <div style={styles.bottom}>
          <div style={styles.copyright}>
            © {new Date().getFullYear()} Acqar. All rights reserved.
          </div>

          <div style={styles.social}>
            <a href="#" style={styles.socialLink}>
              LinkedIn
            </a>

            <a href="#" style={styles.socialLink}>
              Instagram
            </a>

            <a href="#" style={styles.socialLink}>
              Facebook
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default TruvaluFooter;
