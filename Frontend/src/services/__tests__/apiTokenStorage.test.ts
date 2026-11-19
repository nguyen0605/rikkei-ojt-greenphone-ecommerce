import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessToken, getAccessToken, clearClientStorage } from '../api';

describe('API In-Memory Token Management', () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores and retrieves access token strictly in RAM (In-Memory)', () => {
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('greenphone.token')).toBeNull();

    setAccessToken('mock-ram-jwt-token-12345');

    // Access token is present in memory
    expect(getAccessToken()).toBe('mock-ram-jwt-token-12345');
    // Access token MUST NEVER be persisted to localStorage
    expect(localStorage.getItem('greenphone.token')).toBeNull();
  });

  it('clearClientStorage clears RAM token and client storage while keeping rememberedEmail', () => {
    setAccessToken('mock-ram-jwt-token-12345');
    localStorage.setItem('greenphone.rememberedEmail', 'user@example.com');
    localStorage.setItem('greenphone.customKey', 'some-data');
    sessionStorage.setItem('greenphone.has_session', 'true');

    clearClientStorage();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('greenphone.rememberedEmail')).toBe('user@example.com');
    expect(localStorage.getItem('greenphone.customKey')).toBeNull();
    expect(sessionStorage.getItem('greenphone.has_session')).toBeNull();
  });
});
