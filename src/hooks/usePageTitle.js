import { useEffect } from "react";

// Sets document.title for the current page, then restores the default site
// title when the component unmounts (i.e. when the user navigates away).
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
