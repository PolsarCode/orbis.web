import { create } from "zustand";

const PANEL_KEY = "panel-collapsed";
const DOCK_KEY = "library-dock-open";

function savedFlag(key: string) {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function saveFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

type LayoutState = {
  panelCollapsed: boolean;
  dockOpen: boolean;
  drawerOpen: boolean;
  railOpen: boolean;
  feedbackOpen: boolean;
  panelLabel: string | null;
  togglePanel: (isDesktop: boolean) => void;
  restorePanel: () => void;
  setDockOpen: (open: boolean) => void;
  restoreDock: () => void;
  closeDrawer: () => void;
  setRailOpen: (open: boolean) => void;
  setFeedbackOpen: (open: boolean) => void;
  setPanelLabel: (label: string | null) => void;
};

export const useLayoutStore = create<LayoutState>()((set, get) => ({
  panelCollapsed: false,
  dockOpen: false,
  drawerOpen: false,
  railOpen: false,
  feedbackOpen: false,
  panelLabel: null,
  togglePanel: (isDesktop) => {
    if (!isDesktop) {
      set((state) => ({ drawerOpen: !state.drawerOpen }));
      return;
    }
    const panelCollapsed = !get().panelCollapsed;
    saveFlag(PANEL_KEY, panelCollapsed);
    set({ panelCollapsed });
  },
  restorePanel: () => set({ panelCollapsed: savedFlag(PANEL_KEY) }),
  setDockOpen: (dockOpen) => {
    saveFlag(DOCK_KEY, dockOpen);
    set({ dockOpen });
  },
  restoreDock: () => set({ dockOpen: savedFlag(DOCK_KEY) }),
  closeDrawer: () => set({ drawerOpen: false }),
  setRailOpen: (railOpen) => set({ railOpen }),
  setFeedbackOpen: (feedbackOpen) => set({ feedbackOpen }),
  setPanelLabel: (panelLabel) => set({ panelLabel }),
}));
