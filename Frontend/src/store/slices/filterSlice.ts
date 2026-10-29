import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface FilterState {
  brandIds: number[];
  priceRange: [number, number];
  rams: string[];
  storages: string[];
  colors: string[];
  features: string[];
  search: string;
  sortBy: 'newest' | 'discount' | 'price-asc' | 'price-desc' | 'name';
}

const initialState: FilterState = {
  brandIds: [],
  priceRange: [0, 50_000_000],
  rams: [],
  storages: [],
  colors: [],
  features: [],
  search: '',
  sortBy: 'newest',
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setBrands: (state, action: PayloadAction<number[]>) => {
      state.brandIds = action.payload;
    },
    setBrandId: (state, action: PayloadAction<number>) => {
      state.brandIds = [action.payload];
    },
    toggleBrand: (state, action: PayloadAction<number>) => {
      const idx = state.brandIds.indexOf(action.payload);
      if (idx >= 0) state.brandIds.splice(idx, 1);
      else state.brandIds.push(action.payload);
    },
    setPriceRange: (state, action: PayloadAction<[number, number]>) => {
      state.priceRange = action.payload;
    },
    toggleRam: (state, action: PayloadAction<string>) => {
      const idx = state.rams.indexOf(action.payload);
      if (idx >= 0) state.rams.splice(idx, 1);
      else state.rams.push(action.payload);
    },
    toggleStorage: (state, action: PayloadAction<string>) => {
      const idx = state.storages.indexOf(action.payload);
      if (idx >= 0) state.storages.splice(idx, 1);
      else state.storages.push(action.payload);
    },
    toggleColor: (state, action: PayloadAction<string>) => {
      const idx = state.colors.indexOf(action.payload);
      if (idx >= 0) state.colors.splice(idx, 1);
      else state.colors.push(action.payload);
    },
    toggleFeature: (state, action: PayloadAction<string>) => {
      const idx = state.features.indexOf(action.payload);
      if (idx >= 0) state.features.splice(idx, 1);
      else state.features.push(action.payload);
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    setSortBy: (state, action: PayloadAction<FilterState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    clearAllFilters: () => initialState,
  },
});

export const {
  setBrands, toggleBrand, setBrandId,
  setPriceRange, toggleRam, toggleStorage, toggleColor, toggleFeature,
  setSearch, setSortBy, clearAllFilters,
} = filterSlice.actions;
export default filterSlice.reducer;
