import ReactGA from "react-ga4";
import posthog from "posthog-js";

export const initGA = () => {
  ReactGA.initialize("G-3ZRKF69290");
};

export const trackPage = (path) => {
  ReactGA.send({ hitType: "pageview", page: path, title: document.title });
};

export const trackEvent = (eventName, params = {}) => {
  ReactGA.event(eventName, params);
  posthog.capture(eventName, params);
};
