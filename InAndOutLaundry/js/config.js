/*
 * API configuration for local development.
 * Change API_BASE_URL when the API is deployed or accessed from another device.
 * Do not put SQL Server connection strings, JWT signing keys, or payment secrets here.
 */
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:5062/api",
  // Routes confirmed from the shared API code/screenshots:
  // GET/POST /Customers and GET /Auth/me.
  ENDPOINTS: {
    customers: "/Customers",
    authMe: "/Auth/me",
    // These authentication routes are intentionally null until implemented
    // and confirmed in AuthController. Do not assume they already exist.
    register: null,
    login: null,
    externalLogin: null,
    // Controller routes exist, but action methods/request DTOs still need checking.
    services: "/LaundryServices",
    bookings: "/Bookings",
    orders: "/Orders",
    orderTracking: "/OrderTracking",
    notifications: "/Notifications",
    contactMessages: "/ContactMessages",
    payments: null
  },
  // Set to the exact origin shown in the browser address bar / Live Server.
  // This is a reference for configuring API CORS, not a CORS bypass.
  EXPECTED_WEB_ORIGIN: "http://127.0.0.1:5500"
};
