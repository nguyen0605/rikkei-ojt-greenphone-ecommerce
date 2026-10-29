import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isMobileMenuOpen: boolean;
  isCartDrawerOpen: boolean;
  isSearchModalOpen: boolean;
  recentlyViewed: string[];
}

const initialState: UiState = {
  isMobileMenuOpen: false,
  isCartDrawerOpen: false,
  isSearchModalOpen: false,
  recentlyViewed: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    toggleCartDrawer: (state) => {
      state.isCartDrawerOpen = !state.isCartDrawerOpen;
    },
    closeCartDrawer: (state) => {
      state.isCartDrawerOpen = false;
    },
    toggleSearchModal: (state) => {
      state.isSearchModalOpen = !state.isSearchModalOpen;
    },
    addRecentlyViewed: (state, action: PayloadAction<string>) => {
      state.recentlyViewed = [
        action.payload,
        ...state.recentlyViewed.filter((id) => id !== action.payload),
      ].slice(0, 10);
    },
  },
});

export const {
  toggleMobileMenu,
  closeMobileMenu,
  toggleCartDrawer,
  closeCartDrawer,
  toggleSearchModal,
  addRecentlyViewed,
} = uiSlice.actions;

export default uiSlice.reducer;
