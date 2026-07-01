"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface NavigationLoadingContextType {
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {},
});

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const showLoader = useCallback(() => setIsLoading(true), []);
  const hideLoader = useCallback(() => setIsLoading(false), []);

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function usePageLoader() {
  return useContext(NavigationLoadingContext);
}
