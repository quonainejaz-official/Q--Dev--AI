/**
 * AuthService — login, register, logout, session persistence.
 */
import { store } from '../store/Store.js';
import { StorageService } from './StorageService.js';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthService = {
  init() {
    const token = StorageService.get(TOKEN_KEY);
    const user = StorageService.get(USER_KEY);
    if (token && user) {
      store.dispatch('SET_TOKEN', token);
      store.dispatch('SET_USER', user);
    }
  },

  get token() {
    return store.select('token');
  },

  get user() {
    return store.select('user');
  },

  get isAuthenticated() {
    return !!store.select('token');
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this._saveSession(data);
    return data;
  },

  async register(name, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    this._saveSession(data);
    return data;
  },

  logout() {
    StorageService.remove(TOKEN_KEY);
    StorageService.remove(USER_KEY);
    store.dispatch('LOGOUT');
  },

  headers() {
    const token = this.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  _saveSession({ token, user }) {
    StorageService.set(TOKEN_KEY, token);
    StorageService.set(USER_KEY, user);
    store.dispatch('SET_TOKEN', token);
    store.dispatch('SET_USER', user);
  },
};
