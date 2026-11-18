/**
 * Tiện ích xác định vị trí địa lý dựa trên địa chỉ IP (GeoIP Lookup)
 * Dùng làm fallback khi người dùng không cấp quyền Geolocation (GPS) của trình duyệt.
 */

// Cache vị trí theo IP để tránh gọi API nhiều lần
const ipLocationCache = new Map<string, string>();

export async function getLocationByIp(ip?: string): Promise<string | null> {
  if (!ip) return null;

  // Xử lý các IP local / loopback
  if (
    ip === '127.0.0.1' ||
    ip === '0:0:0:0:0:0:0:1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return 'Vị trí cục bộ (Mạng nội bộ)';
  }

  if (ipLocationCache.has(ip)) {
    return ipLocationCache.get(ip) || null;
  }

  try {
    // Gọi ipapi.co (miễn phí, không cần token)
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const city = data.city || '';
    const country = data.country_name || data.country || '';

    let locationStr = '';
    if (city && country) {
      locationStr = `${city}, ${country}`;
    } else {
      locationStr = city || country || '';
    }

    if (locationStr) {
      ipLocationCache.set(ip, locationStr);
      return locationStr;
    }
  } catch {
    // Fallback nếu chặn CORS hoặc lỗi mạng: return null nhẹ nhàng
  }

  return null;
}
