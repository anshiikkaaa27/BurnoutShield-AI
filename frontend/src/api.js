/**
 * Centralised Axios client for BurnoutShield.
 *
 * Base URL logic:
 *  - Local dev  : set REACT_APP_API_URL=http://localhost:8000 in frontend/.env
 *                 → axios calls http://localhost:8000/dashboard etc.
 *  - Docker     : leave REACT_APP_API_URL empty (or don't set it)
 *                 → axios calls /api/dashboard which nginx proxies to backend:8000
 *
 * The Authorization header is managed by AuthContext.
 */
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export default api;
