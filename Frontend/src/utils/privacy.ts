/**
 * Masking helpers for PII (email, phone, address) — used by admin views so
 * customer data is hidden by default and only revealed on demand.
 */

/** a***@gmail.com — giữ ký tự đầu + domain. */
export function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 1) return email.charAt(0) + '***' + email.slice(at);
  return email.charAt(0) + '***' + email.slice(at);
}

/** 09** *** 123 — giữ 2 số đầu + 3 số cuối. */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return digits.slice(0, 2) + '***';
  return (
    digits.slice(0, 2) +
    '** *** ' +
    digits.slice(-3)
  );
}

/** 123 … — giữ 10 ký tự đầu, che phần còn lại. */
export function maskAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address.charAt(0) + '***';
  return address.slice(0, 10) + '***';
}
