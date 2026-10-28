import { create } from "zustand";

const PANEL_KEY = "panel-collapsed";
const DOCK_KEY = "library-dock-open";

function savedPanel() {
  try {
    return localStorage.getItem(PANEL_KEY) === "true";
  } catch {
    return false;
  }
}

function savePanel(collapsed: boolean) {
  try {
    localStorage.setItem(PANEL_KEY, String(collapsed));
  } catch {
    return;
  }
}

function savedDock() {
  try {
    return localStorage.getItem(DOCK_KEY) === "true";
  } catch {
    return false;
  }
}

function saveDock(open: boolean) {
  try {
    localStorage.setItem(DOCK_KEY, String(open));
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
    savePanel(panelCollapsed);
    set({ panelCollapsed });
  },
  restorePanel: () => set({ panelCollapsed: savedPanel() }),
  setDockOpen: (dockOpen) => {
    saveDock(dockOpen);
    set({ dockOpen });
  },
  restoreDock: () => set({ dockOpen: savedDock() }),
  closeDrawer: () => set({ drawerOpen: false }),
  setRailOpen: (railOpen) => set({ railOpen }),
  setFeedbackOpen: (feedbackOpen) => set({ feedbackOpen }),
  setPanelLabel: (panelLabel) => set({ panelLabel }),
}));
