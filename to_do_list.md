# Toka Events Backend + Payment To-Do List

## Objective
Move from frontend-only MVP to a secure production-ready architecture using:
- FastAPI backend
- Pesapal payment integration
- Managed hosting and database

## Phase 1: Immediate Priorities (Urgent)

- [ ] Create FastAPI backend project structure
  - [ ] Add app entrypoint and API router structure
  - [ ] Add environment-based configuration (`.env`)
  - [ ] Add CORS settings for frontend origin

- [ ] Secure credentials handling
  - [ ] Store Pesapal consumer key/secret in environment variables
  - [ ] Ensure no credentials are present in frontend files
  - [ ] Add `.env` to `.gitignore`

- [ ] Define core database models (PostgreSQL)
  - [ ] Users
  - [ ] Events
  - [ ] Registrations
  - [ ] Payments
  - [ ] Tickets
  - [ ] Referrals (optional in first pass)

- [ ] Implement minimum API endpoints
  - [ ] `POST /auth/register`
  - [ ] `POST /auth/login`
  - [ ] `GET /events`
  - [ ] `POST /events`
  - [ ] `POST /registrations`
  - [ ] `GET /tickets/{ticket_id}`

- [ ] Integrate Pesapal payment flow
  - [ ] `POST /payments/pesapal/initialize` to create order and get redirect URL
  - [ ] Redirect user to Pesapal checkout page
  - [ ] `POST /payments/pesapal/ipn` webhook endpoint to receive callbacks
  - [ ] Verify transaction status before marking payment as successful
  - [ ] Mark registration/ticket as paid only after verified callback

- [ ] Protect reliability and trust
  - [ ] Add idempotency handling for webhook retries
  - [ ] Add request validation for phone/email/amount/event IDs
  - [ ] Add clear error responses for failed payments

## Phase 2: Next Days (Short-Term)

- [ ] Connect current frontend registration flow to backend APIs
  - [ ] Replace simulated payment logic with backend payment initialization call
  - [ ] Replace localStorage-confirmed tickets with backend-confirmed tickets
  - [ ] Add payment status polling or callback-driven status refresh

- [ ] Add authentication and authorization
  - [ ] JWT token issuance
  - [ ] Protected organizer endpoints (create/edit events)
  - [ ] Basic role separation (attendee vs organizer)

- [ ] Add observability and monitoring
  - [ ] Structured logging
  - [ ] Error tracking (for example, Sentry)
  - [ ] Track payment lifecycle events for debugging

- [ ] Add tests
  - [ ] Unit tests for payment service logic
  - [ ] API integration tests for registration and payment endpoints
  - [ ] Webhook signature and retry behavior tests

## Phase 3: Later Improvements

- [ ] Add ticket verification tools
  - [ ] QR validation endpoint
  - [ ] Organizer check-in dashboard

- [ ] Improve referral system
  - [ ] Server-side referral attribution
  - [ ] Fraud checks for duplicate/self-referrals

- [ ] Add advanced organizer analytics
  - [ ] Conversion funnel (view -> register -> paid)
  - [ ] Revenue and attendance trend summaries

- [ ] Add async jobs if traffic grows
  - [ ] Background workers for webhook processing and notifications
  - [ ] Queue/retry strategy for external API failures

## Hosting Options (Recommended)

## Best for fast launch
- [ ] Render
  - Good for quick FastAPI deployment and managed Postgres
  - Watch for cold starts and scaling costs

- [ ] Railway
  - Very fast setup and easy developer workflow
  - Review long-term pricing as usage grows

## Best for stronger control later
- [ ] DigitalOcean (App Platform or Droplet)
  - Better pricing control and infrastructure flexibility
  - More operational responsibility

- [ ] AWS (Lightsail/EC2/ECS)
  - Highest scalability and flexibility
  - More setup complexity

## Suggested Hosting Decision
- [ ] Start with Render or Railway now
- [ ] Use managed PostgreSQL from day one
- [ ] Re-evaluate migration to DigitalOcean/AWS after stable traction

## Security Checklist (Must-Have)

- [ ] HTTPS only in production
- [ ] Environment variables for all secrets
- [ ] Validate Pesapal webhook authenticity/signature
- [ ] Do not issue final tickets before verified payment status
- [ ] Add rate limits for sensitive endpoints
- [ ] Enable regular database backups

## Definition of Done for First Production Payment Release

- [ ] User can register for an event from frontend
- [ ] Backend creates Pesapal payment and returns checkout link
- [ ] Webhook confirms payment and updates registration status
- [ ] Ticket is only marked valid after payment verification
- [ ] Failed and pending states are visible to user
- [ ] Logs exist for each payment lifecycle step
