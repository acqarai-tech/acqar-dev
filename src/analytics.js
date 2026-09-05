import ReactGA from "react-ga4";
import posthog from "posthog-js";

// ✅ Handle Vite/esbuild's double-default-wrapping of react-ga4
const ga = ReactGA?.default ?? ReactGA;

export const initGA = () => {
  ga.initialize("G-3ZRKF69290");
};

export const trackPage = (path) => {
  ga.send({ hitType: "pageview", page: path, title: document.title });
};

export const trackEvent = (eventName, params = {}) => {
  ga.event(eventName, params);
  posthog.capture(eventName, params);
};
