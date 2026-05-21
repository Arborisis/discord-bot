const axios = require('axios');
const config = require('../config');

const api = axios.create({
  baseURL: config.api.laravelUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Internal-Token': config.api.laravelToken,
  },
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Laravel]', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

module.exports = { api };
