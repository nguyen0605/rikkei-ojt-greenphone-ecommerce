/**
 * Antd theme tokens - GreenPhone Brand
 */
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#16a34a',
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#dc2626',
    colorInfo: '#0ea5e9',

    colorLink: '#16a34a',
    colorLinkHover: '#15803d',
    colorLinkActive: '#15803d',

    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',

    colorBgBase: '#ffffff',
    colorBgLayout: '#f9fafb',

    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    fontFamily:
      "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,

    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,

    boxShadow:
      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    boxShadowSecondary:
      '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  },
  components: {
    Button: {
      primaryShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
      fontWeight: 500,
    },
    Select: {},
    Card: {
      paddingLG: 24,
      borderRadiusLG: 12,
    },
    Menu: {
      itemHoverBg: '#f0fdf4',
      itemSelectedBg: '#dcfce7',
      itemSelectedColor: '#16a34a',
    },
    Steps: {
      colorPrimary: '#16a34a',
    },
    Tabs: {
      itemSelectedColor: '#16a34a',
      itemHoverColor: '#15803d',
      inkBarColor: '#16a34a',
    },
    Checkbox: {
      colorPrimary: '#16a34a',
    },
    Radio: {
      colorPrimary: '#16a34a',
    },
    Tag: {
      defaultBg: '#f0fdf4',
      defaultColor: '#16a34a',
    },
  },
};
