import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeVietnamese,
  searchLocalDictionary,
  searchAddressSuggestions,
  reverseGeocode,
  geocodeInitialAddress,
  KNOWN_VN_LOCATIONS,
} from '../checkoutGeocodingService';

describe('checkoutGeocodingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeVietnamese', () => {
    it('removes Vietnamese accents and converts to lowercase', () => {
      expect(normalizeVietnamese('Cầu Giấy')).toBe('cau giay');
      expect(normalizeVietnamese('Đống Đa')).toBe('dong da');
      expect(normalizeVietnamese('TP. Hồ Chí Minh')).toBe('tp. ho chi minh');
      expect(normalizeVietnamese('Đà Nẵng')).toBe('da nang');
    });

    it('handles empty or whitespace strings', () => {
      expect(normalizeVietnamese('')).toBe('');
      expect(normalizeVietnamese('   ')).toBe('');
    });
  });

  describe('searchLocalDictionary', () => {
    it('returns empty array when query length < 2', () => {
      expect(searchLocalDictionary('a')).toEqual([]);
      expect(searchLocalDictionary('')).toEqual([]);
    });

    it('matches districts by Vietnamese name', () => {
      const results = searchLocalDictionary('Cầu Giấy');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].place_name).toContain('Cầu Giấy');
      expect(results[0].source).toBe('dictionary');
      expect(results[0].lat).toBeCloseTo(21.0362, 2);
    });

    it('matches districts without accents', () => {
      const results = searchLocalDictionary('dong da');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].place_name).toContain('Đống Đa');
    });

    it('matches HCMC districts like "quan 1"', () => {
      const results = searchLocalDictionary('quan 1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.place_name.includes('Quận 1'))).toBe(true);
    });

    it('respects maxResults limit', () => {
      const results = searchLocalDictionary('quận', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('searchAddressSuggestions', () => {
    it('returns empty array if query has length < 2', async () => {
      const res = await searchAddressSuggestions('x');
      expect(res).toEqual([]);
    });

    it('fetches from Photon and merges with dictionary for queries >= 2 chars', async () => {
      const mockPhotonData = {
        features: [
          {
            geometry: { coordinates: [105.7900, 21.0360] },
            properties: {
              street: 'Đường Cầu Giấy',
              housenumber: '123',
              district: 'Cầu Giấy',
              city: 'Hà Nội',
              country: 'Việt Nam',
            },
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotonData,
      } as Response);

      const results = await searchAddressSuggestions('123 Cầu Giấy');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.source === 'photon' || r.source === 'dictionary')).toBe(true);
    });

    it('matches short numeric query like "97" from local dictionary and Photon', async () => {
      const results = await searchAddressSuggestions('97');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.place_name.includes('97'))).toBe(true);
    });

    it('falls back safely to local dictionary if network request fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const results = await searchAddressSuggestions('Cầu Giấy');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBe('dictionary');
    });

    it('uses cached results for repeated queries', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await searchAddressSuggestions('Quận Hoàn Kiếm');
      const firstCallCount = fetchSpy.mock.calls.length;

      // Repeat query
      const cached = await searchAddressSuggestions('Quận Hoàn Kiếm');
      expect(cached.length).toBeGreaterThan(0);
      expect(fetchSpy.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('reverseGeocode', () => {
    it('returns formatted address from Photon reverse API', async () => {
      const mockReverse = {
        features: [
          {
            geometry: { coordinates: [105.789, 21.0365] },
            properties: {
              street: 'Đường Xuân Thủy',
              housenumber: '10',
              district: 'Cầu Giấy',
              city: 'Hà Nội',
              country: 'Việt Nam',
            },
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReverse,
      } as Response);

      const res = await reverseGeocode(21.0365, 105.789);
      expect(res).toContain('10 Đường Xuân Thủy');
    });

    it('falls back to nearest known location or coordinates when reverse lookup fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Timeout'));

      // Tọa độ gần Cầu Giấy
      const res = await reverseGeocode(21.0362, 105.7906);
      expect(res).toContain('Cầu Giấy');
    });
  });

  describe('geocodeInitialAddress', () => {
    it('returns null for empty or invalid address', async () => {
      expect(await geocodeInitialAddress('')).toBeNull();
      expect(await geocodeInitialAddress('   ')).toBeNull();
    });

    it('finds initial coords from local dictionary', async () => {
      const res = await geocodeInitialAddress('Số 45 Cầu Giấy, Hà Nội');
      expect(res).not.toBeNull();
      expect(res?.lat).toBeCloseTo(21.0362, 2);
    });
  });

  describe('KNOWN_VN_LOCATIONS integrity', () => {
    it('has valid coordinates for all entries within Vietnam geographic bounding box', () => {
      for (const loc of KNOWN_VN_LOCATIONS) {
        // Vietnam bounding box roughly: lat 8° to 24°, lng 102° to 110°
        expect(loc.lat).toBeGreaterThan(8);
        expect(loc.lat).toBeLessThan(24);
        expect(loc.lng).toBeGreaterThan(102);
        expect(loc.lng).toBeLessThan(110);
        expect(loc.name.length).toBeGreaterThan(3);
        expect(loc.keywords.length).toBeGreaterThan(0);
      }
    });
  });
});

