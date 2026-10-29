import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import filterReducer from './slices/filterSlice';
import checkoutReducer from './slices/checkoutSlice';
import wishlistReducer from './slices/wishlistSlice';
import uiReducer from './slices/uiSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  filter: filterReducer,
  checkout: checkoutReducer,
  wishlist: wishlistReducer,
  ui: uiReducer,
  settings: settingsReducer,
});

export default rootReducer;

export type RootState = ReturnType<typeof rootReducer>;
