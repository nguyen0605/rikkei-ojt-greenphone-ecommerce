import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutDeliveryMap from '../CheckoutDeliveryMap';

// Mock Leaflet
const mockMapInstance = {
  remove: vi.fn(),
  flyTo: vi.fn(),
  getZoom: vi.fn(() => 12),
  invalidateSize: vi.fn(),
  on: vi.fn(),
};

const mockTileLayerInstance = {
  addTo: vi.fn().mockReturnThis(),
  on: vi.fn(),
};

const mockMarkerInstance = {
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  setLatLng: vi.fn().mockReturnThis(),
  setPopupContent: vi.fn().mockReturnThis(),
  openPopup: vi.fn().mockReturnThis(),
  on: vi.fn(),
  remove: vi.fn(),
};

vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn(() => mockMapInstance),
      tileLayer: vi.fn(() => mockTileLayerInstance),
      marker: vi.fn(() => mockMarkerInstance),
      divIcon: vi.fn(() => ({})),
      control: {
        zoom: vi.fn(() => ({ addTo: vi.fn() })),
      },
    },
  };
});

describe('CheckoutDeliveryMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container, action buttons, and Leaflet element', async () => {
    const onLocationSelect = vi.fn();
    render(<CheckoutDeliveryMap selectedLocation={null} onLocationSelect={onLocationSelect} />);

    expect(screen.getByTestId('checkout-delivery-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-leaflet-map-element')).toBeInTheDocument();
    expect(screen.getByTitle('Đưa tâm bản đồ về điểm nhận hàng')).toBeInTheDocument();
    expect(screen.getByTitle('Lấy vị trí hiện tại của thiết bị')).toBeInTheDocument();
  });

  it('shows loading skeleton while map initializes and hides after delay', async () => {
    render(<CheckoutDeliveryMap selectedLocation={null} onLocationSelect={vi.fn()} />);

    // Ban đầu có loading skeleton
    expect(screen.getByTestId('checkout-map-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Đang tải bản đồ OpenStreetMap...')).toBeInTheDocument();

    // Sau khi timer hoàn thành
    await waitFor(() => {
      expect(screen.queryByTestId('checkout-map-skeleton')).not.toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('creates and updates marker when selectedLocation changes', () => {
    const { rerender } = render(
      <CheckoutDeliveryMap selectedLocation={null} onLocationSelect={vi.fn()} />
    );

    // Chưa có location -> marker không được khởi tạo
    expect(mockMarkerInstance.addTo).not.toHaveBeenCalled();

    // Rerender có selectedLocation
    rerender(
      <CheckoutDeliveryMap
        selectedLocation={{ lat: 21.0362, lng: 105.7906, displayName: 'Quận Cầu Giấy' }}
        onLocationSelect={vi.fn()}
      />
    );

    expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
    expect(mockMapInstance.flyTo).toHaveBeenCalled();
  });

  it('triggers onLocationSelect when map click event fires', () => {
    const onLocationSelect = vi.fn();
    render(<CheckoutDeliveryMap selectedLocation={null} onLocationSelect={onLocationSelect} />);

    // Tìm callback click được đăng ký trên map
    const clickHandler = mockMapInstance.on.mock.calls.find((call) => call[0] === 'click')?.[1];
    expect(clickHandler).toBeDefined();

    // Giả lập click bản đồ
    clickHandler({
      latlng: { lat: 21.0285, lng: 105.8542 },
    });

    expect(onLocationSelect).toHaveBeenCalledWith({
      lat: 21.0285,
      lng: 105.8542,
    });
  });

  it('handles re-center button click', () => {
    render(
      <CheckoutDeliveryMap
        selectedLocation={{ lat: 10.7769, lng: 106.7009, displayName: 'Quận 1, TP.HCM' }}
        onLocationSelect={vi.fn()}
      />
    );

    const recenterBtn = screen.getByTitle('Đưa tâm bản đồ về điểm nhận hàng');
    fireEvent.click(recenterBtn);

    expect(mockMapInstance.flyTo).toHaveBeenCalledWith([10.7769, 106.7009], 16, { duration: 0.6 });
  });

  it('handles locate me button click using browser geolocation', () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: 10.8477,
            longitude: 106.7857,
            accuracy: 15,
          },
        });
      }),
    };
    // @ts-expect-error mock geolocation
    global.navigator.geolocation = mockGeolocation;

    const onLocationSelect = vi.fn();
    render(<CheckoutDeliveryMap selectedLocation={null} onLocationSelect={onLocationSelect} />);

    const locateBtn = screen.getByTitle('Lấy vị trí hiện tại của thiết bị');
    fireEvent.click(locateBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    expect(mockMapInstance.flyTo).toHaveBeenCalledWith([10.8477, 106.7857], 16, { duration: 0.8 });
    expect(onLocationSelect).toHaveBeenCalledWith({
      lat: 10.8477,
      lng: 106.7857,
      displayName: 'Vị trí hiện tại của thiết bị',
    });
  });

  it('cleans up Leaflet instance when component unmounts', () => {
    const { unmount } = render(
      <CheckoutDeliveryMap selectedLocation={null} onLocationSelect={vi.fn()} />
    );

    unmount();
    expect(mockMapInstance.remove).toHaveBeenCalled();
  });
});

