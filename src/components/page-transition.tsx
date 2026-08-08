import { ViewTransition } from "react";

/**
 * Route transition wrapper. Navigations tagged `nav-forward` (going deeper:
 * opening a post, entering a section) slide the old page left and the new
 * page in from the right; `nav-back` (returning links) reverses it. Untagged
 * navigations (browser back/forward, form submits) snap without animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
