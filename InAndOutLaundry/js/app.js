(() => {
  "use strict";

  const config = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const tokenKey = "inoutlaundry_access_token";
  // Keep the bearer token in memory for this page session. For stronger browser
  // protection, prefer a backend-managed Secure, HttpOnly, SameSite cookie.
  let accessToken = null;
  let currentCustomer = null;

  const apiUrl = (path) => `${config.API_BASE_URL.replace(/\/$/, "")}${path}`;

  function showMessage(id, message, success = false) {
    const node = $(id);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("success", success);
  }

  function requireEndpoint(key, label = key) {
    const path = config.ENDPOINTS[key];
    if (!path) throw new Error(`${label} is not configured in js/config.js. The matching API endpoint must be implemented and confirmed first.`);
    return path;
  }

  async function apiRequest(path, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(apiUrl(path), {
      ...options,
      headers,
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
    if (!response.ok) {
      const message = data.message || data.title || data.error || `Request failed (${response.status})`;
      throw new Error(message);
    }
    return data;
  }

  function setSignedIn(data) {
    accessToken = data.accessToken || data.token || data.access_token || null;
    if (!accessToken) throw new Error("The login response did not contain accessToken, token or access_token.");
    const name = data.firstName || data.name || data.username || "Customer";
    $("loginForm").classList.add("hidden");
    $("registerForm").classList.add("hidden");
    $("profileForm").classList.add("hidden");
    document.querySelector(".tabs").classList.add("hidden");
    $("accountPanel").classList.remove("hidden");
    $("accountWelcome").textContent = `Welcome, ${name}. Your authenticated session is active.`;
    $("headerLogin").textContent = "My account";
    $("dashboard").classList.add("visible-section");
  }

  function showAuthTab(tab) {
    $("accountPanel").classList.add("hidden");
    document.querySelector(".tabs").classList.remove("hidden");
    ["login", "register", "profile"].forEach(name => $(name === "profile" ? "profileForm" : `${name}Form`).classList.toggle("hidden", name !== tab));
    document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function renderRecords(targetId, records, emptyText) {
    const target = $(targetId);
    if (!Array.isArray(records) || records.length === 0) {
      target.textContent = emptyText;
      return;
    }
    target.innerHTML = records.slice(0, 12).map(record => {
      const pairs = Object.entries(record).filter(([key, value]) => value !== null && typeof value !== "object" && !/password|token|secret/i.test(key)).slice(0, 6);
      return `<div class="record-item">${pairs.map(([key, value]) => `<div><b>${safeText(key)}:</b> ${safeText(value)}</div>`).join("")}</div>`;
    }).join("");
  }

  async function loadCollection(endpointKey, targetId, label) {
    const path = requireEndpoint(endpointKey, label);
    const result = await apiRequest(path, { method: "GET" });
    const records = Array.isArray(result) ? result : (result.items || result.data || result[Object.keys(result).find(k => Array.isArray(result[k]))] || []);
    renderRecords(targetId, records, `No ${label.toLowerCase()} were returned by the API.`);
    return records;
  }

  async function loadProfile() {
    if (!accessToken) throw new Error("Sign in first. The API's /Auth/me endpoint requires a valid JWT.");
    const result = await apiRequest(requireEndpoint("authMe", "Current-user endpoint"), { method: "GET" });
    $("profileData").innerHTML = Object.entries(result).map(([key, value]) => `<div><b>${safeText(key)}:</b> ${safeText(value)}</div>`).join("");
    return result;
  }

  async function loadDashboardItem(name) {
    try {
      if (name === "profile") await loadProfile();
      if (name === "bookings") await loadCollection("bookings", "bookingData", "Bookings");
      if (name === "orders") await loadCollection("orders", "orderData", "Orders");
      if (name === "notifications") await loadCollection("notifications", "notificationData", "Notifications");
      showMessage("dashboardMessage", `${name[0].toUpperCase()}${name.slice(1)} refreshed.`, true);
    } catch (error) {
      showMessage("dashboardMessage", error.message);
    }
  }

  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showAuthTab(btn.dataset.tab)));
  $("headerLogin").addEventListener("click", () => $("portal").scrollIntoView({ behavior: "smooth" }));
  $("year").textContent = new Date().getFullYear();

  // Registration/login are deliberately guarded until the actual API actions exist.
  $("registerForm").addEventListener("submit", async event => {
    event.preventDefault();
    const password = $("registerPassword").value;
    const strong = password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!strong) return showMessage("registerMessage", "Use at least 12 characters with uppercase, lowercase, a number and a symbol.");
    if (password !== $("confirmPassword").value) return showMessage("registerMessage", "The passwords do not match.");
    try {
      const path = requireEndpoint("register", "Customer registration");
      const payload = { firstName: $("firstName").value.trim(), lastName: $("lastName").value.trim(), phoneNumber: $("phone").value.trim(), email: $("registerEmail").value.trim(), password };
      const result = await apiRequest(path, { method: "POST", body: JSON.stringify(payload) });
      showMessage("registerMessage", result.message || "Registration completed. You can now sign in.", true);
      $("registerForm").reset();
    } catch (error) { showMessage("registerMessage", error.message); }
  });

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const path = requireEndpoint("login", "Customer login");
      const result = await apiRequest(path, { method: "POST", body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPassword").value }) });
      setSignedIn(result);
      showMessage("loginMessage", "Signed in successfully.", true);
      await loadProfile();
    } catch (error) { showMessage("loginMessage", error.message); }
  });

  document.querySelectorAll("[data-provider]").forEach(button => button.addEventListener("click", async () => {
    try {
      const base = requireEndpoint("externalLogin", "Google/Microsoft SSO");
      const result = await apiRequest(`${base}/${encodeURIComponent(button.dataset.provider)}`, { method: "GET" });
      if (result.authorizationUrl) window.location.assign(result.authorizationUrl);
      else showMessage("loginMessage", "The SSO API did not return an authorizationUrl.");
    } catch (error) { showMessage("loginMessage", error.message); }
  }));

  // This is the confirmed customer profile endpoint. It does not create a password/login account.
  $("profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = { firstName: $("profileFirstName").value.trim(), lastName: $("profileLastName").value.trim(), email: $("profileEmail").value.trim(), phoneNumber: $("profilePhone").value.trim() || null, address: $("profileAddress").value.trim() || null };
    try {
      const result = await apiRequest(requireEndpoint("customers", "Customers endpoint"), { method: "POST", body: JSON.stringify(payload) });
      currentCustomer = result;
      const id = result.customerId ?? result.CustomerId;
      showMessage("profileMessage", `Customer profile created${id ? ` successfully. Customer ID: ${id}` : " successfully."} Login credentials are created separately by the authentication API.`, true);
      $("profileForm").reset();
      if (id) $("bookingCustomerId").value = id;
    } catch (error) { showMessage("profileMessage", error.message); }
  });

  $("loadDashboard").addEventListener("click", async () => {
    $("dashboard").scrollIntoView({ behavior: "smooth" });
    await Promise.all(["profile", "bookings", "orders", "notifications"].map(loadDashboardItem));
  });
  document.querySelectorAll("[data-load]").forEach(button => button.addEventListener("click", () => loadDashboardItem(button.dataset.load)));

  $("bookingForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
      customerId: Number($("bookingCustomerId").value),
      serviceType: $("bookingService").value,
      scheduledPickupWindow: new Date($("bookingDate").value).toISOString(),
      rawWeightKilograms: Number($("bookingWeight").value),
      address: $("bookingAddress").value.trim(),
      notes: $("bookingNotes").value.trim()
    };
    try {
      await apiRequest(requireEndpoint("bookings", "Bookings endpoint"), { method: "POST", body: JSON.stringify(payload) });
      showMessage("bookingMessage", "Booking request submitted. Refresh your bookings to confirm the saved record.", true);
      $("bookingForm").reset();
    } catch (error) { showMessage("bookingMessage", `${error.message} Check the BookingsController request model and field names.`); }
  });

  $("trackingForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const path = `${requireEndpoint("orderTracking", "Order tracking endpoint")}/${encodeURIComponent($("trackingOrderId").value)}`;
      const result = await apiRequest(path, { method: "GET" });
      $("trackingResult").textContent = JSON.stringify(result, null, 2);
    } catch (error) { $("trackingResult").textContent = error.message; }
  });

  $("continuePayment").addEventListener("click", async () => {
    try {
      const path = requireEndpoint("payments", "Payment processing");
      const bookingId = Number($("paymentBookingId").value);
      if (!bookingId) throw new Error("Enter a booking ID before continuing.");
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
      const result = await apiRequest(path, { method: "POST", body: JSON.stringify({ bookingId, paymentMethod }) });
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else showMessage("paymentMessage", result.message || "The API did not return a hosted checkout URL.", true);
    } catch (error) { showMessage("paymentMessage", error.message); }
  });

  $("contactForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = { name: $("contactName").value.trim(), email: $("contactEmail").value.trim(), subject: $("contactSubject").value.trim(), message: $("contactBody").value.trim() };
    try {
      await apiRequest(requireEndpoint("contactMessages", "Contact messages endpoint"), { method: "POST", body: JSON.stringify(payload) });
      showMessage("contactMessage", "Your message has been submitted.", true);
      $("contactForm").reset();
    } catch (error) { showMessage("contactMessage", `${error.message} Check the ContactMessagesController request model.`); }
  });

  // Attempt to load the public service catalogue. If the API does not expose GET,
  // the static service preview remains visible.
  (async () => {
    try {
      const services = await loadCollection("services", "serviceList", "Services");
      if (services.length) {
        $("serviceList").innerHTML = services.map((service, index) => {
          const name = service.name || service.serviceName || service.title || `Laundry service ${index + 1}`;
          const description = service.description || service.details || "Available laundry service.";
          const price = service.price ?? service.priceZar ?? service.amount;
          return `<article class="service-card"><div class="service-icon">◇</div><h3>${safeText(name)}</h3><p>${safeText(description)}</p><span class="service-tag">${price !== undefined ? `R ${safeText(price)}` : "Available service"}</span></article>`;
        }).join("");
      }
    } catch (error) { showMessage("servicesMessage", `Showing service previews. ${error.message}`); }
  })();

  $("logoutButton").addEventListener("click", () => {
    accessToken = null;
    currentCustomer = null;
    $("accountPanel").classList.add("hidden");
    document.querySelector(".tabs").classList.remove("hidden");
    showAuthTab("login");
    $("headerLogin").textContent = "Sign in";
    showMessage("loginMessage", "You have signed out.", true);
  });
})();
