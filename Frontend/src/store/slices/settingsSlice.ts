import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  values: Record<string, string>;
  /** Convenience parsed number; kept undefined until loaded */
  shippingFee?: number;
  freeShippingThreshold?: number;
}

const initialState: SettingsState = {
  values: {},
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Record<string, string>>) => {
      state.values = action.payload;
      state.shippingFee = parsePositive(action.payload.SHIPPING_FEE);
      state.freeShippingThreshold = parsePositive(action.payload.FREE_SHIPPING_THRESHOLD);
    },
  },
});

const parsePositive = (v: string | undefined): number | undefined => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
