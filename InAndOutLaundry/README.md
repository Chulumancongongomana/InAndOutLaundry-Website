# In & Out Laundry Web App

Responsive HTML5, CSS and JavaScript website for the In & Out Laundry project. The website communicates with the existing ASP.NET Core Web API; it does not connect directly to SQL Server.

## Included

- Dark navy and blue responsive design
- Customer sign-in and registration interfaces with strong-password validation
- Customer profile creation using the confirmed `POST /api/Customers` endpoint
- Customer profile/session endpoint integration point (`GET /api/Auth/me`)
- Laundry service catalogue API integration with static previews as a fallback
- Booking request form and booking list integration points
- Order list and order tracking integration points
- Notifications integration point
- Bank card, Instant EFT and cash payment selection interface
- Contact message form integration point
- Google and Microsoft SSO entry points
- Admin access placeholder with a clear requirement for server-side role authorization

## Project structure

```text
InAndOutLaundry/
|-- index.html
|-- css/
|   `-- styles.css
|-- js/
|   |-- config.js
|   `-- app.js
`-- README.md
```

## Configure the API

Open `js/config.js` and check:

```javascript
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:5062/api"
};
```

Use the exact API address shown by Visual Studio. If the API uses HTTPS, configure the HTTPS URL and use HTTPS for the website as well.

### Confirmed by the API code shared so far

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/Customers` | Retrieve customer records |
| GET | `/api/Customers/{id}` | Retrieve one customer |
| POST | `/api/Customers` | Create a customer profile (not a login account) |
| PUT | `/api/Customers/{id}` | Update a customer profile |
| DELETE | `/api/Customers/{id}` | Delete a customer if there are no related bookings/orders |
| GET | `/api/Auth/me` | Read claims from a valid JWT; requires authentication |

The customer POST payload used by the website is:

```json
{
  "firstName": "First name",
  "lastName": "Surname",
  "email": "customer@example.com",
  "phoneNumber": "0710000000",
  "address": "Cape Town"
}
```

The `CustomersController` shown so far does not accept or hash a password and does not create a user login. Do not send passwords to this endpoint.

### Controller routes that still need action/DTO verification

Your project contains `LaundryServicesController`, `BookingsController`, `OrdersController`, `OrderTrackingController`, `NotificationsController`, `ContactMessagesController`, `PaymentsController`, and `UsersController`. The website has integration points for these controllers, but the actual HTTP methods, route templates, request DTOs, and response fields must be checked in each controller before relying on them.

The default route names in `js/config.js` are starting values only. Update them to match the actual controller attributes and actions. The booking/contact/payment request property names may also need to be changed in `js/app.js` to match your API models.

## Important authentication work still required in the API

The `AuthController.cs` shared so far only implements `GET /api/Auth/me`, protected by `[Authorize]`. It does not yet show registration, login, password verification, JWT generation, or Google/Microsoft OAuth/OIDC endpoints.

Before enabling the website's login and registration, implement and test API endpoints for:

- Customer registration that creates the linked `Customer` and `User` records in one transaction
- Password hashing and verification using a proven password hasher (never store plaintext passwords)
- Login that returns a signed JWT with the claims your API expects, including user ID, username, role, and CustomerId
- Authorization policies/roles for customer and administrator actions
- Google/Microsoft OAuth 2.0 or OpenID Connect flows if SSO is required

When those endpoints exist, set `register`, `login`, and `externalLogin` in `js/config.js` to their exact routes. The website deliberately leaves these routes as `null` until they are confirmed; this avoids sending credentials to invented endpoints.

The website keeps the bearer token in page memory rather than persistent browser storage. For stronger browser security, consider a backend-managed `Secure`, `HttpOnly`, `SameSite` cookie and configure CORS credentials correctly if you adopt cookie authentication.

## CORS

The API must allow the exact origin used by your development server. For example, VS Code Live Server commonly uses `http://127.0.0.1:5500` or `http://localhost:5500`; check your browser address bar and allow that exact origin in ASP.NET Core CORS configuration.

For bearer-token authentication, allow the required headers and methods. Do not use unrestricted origins. The Android native app does not use browser CORS.

## Run locally

1. Start the ASP.NET Core API in Visual Studio 2022.
2. Confirm the API is listening at the configured address, currently expected to be `http://localhost:5062`.
3. Open this folder in Visual Studio Code.
4. Run `index.html` using the Live Server extension.
5. Open the browser developer console if an API request fails. Check the API URL, CORS origin, route, HTTP method, payload property names, and API response.

## Security and payment notes

- Client-side password rules are for usability only. The API must enforce password policy and hash passwords server-side.
- Never put SQL Server connection strings, JWT signing keys, OAuth client secrets, or payment provider secrets in JavaScript.
- Do not store raw card numbers or CVV. Use a supported payment provider's hosted checkout or tokenized flow.
- Payment method selection is a UI only until a payment provider and verified server-side payment endpoint are integrated.
- The admin panel is not security. Every admin endpoint must validate the JWT and role on the API.
- Use HTTPS in production. Do not send passwords or bearer tokens over untrusted HTTP networks.
- Do not treat customer IDs supplied by the browser as proof of ownership. The API must derive/verify the authenticated customer's identity from trusted JWT claims.

## Integration test checklist

- [ ] Confirm `GET /api/Customers` from the website.
- [ ] Create a test customer profile and verify it appears in SQL Server and the Customers GET response.
- [ ] Confirm the actual service, booking, order, tracking, notification and contact action routes and DTOs.
- [ ] Implement and test registration/login/JWT generation in the API.
- [ ] Verify `/api/Auth/me` with a valid JWT.
- [ ] Restrict customer data and booking/order endpoints to the authenticated owner.
- [ ] Configure Google/Microsoft SSO on the API if required.
- [ ] Integrate a payment provider in sandbox mode before accepting real payments.
- [ ] Test the same customer account and records from the website and Android app.
