# Rate Limiting Architecture - DementiaCare+

## Overview

DementiaCare+ implements a comprehensive role-based rate limiting system to prevent abuse, ensure fair resource allocation, and protect the API from DoS attacks. The system supports both in-memory (development) and Redis-backed (production) stores.

## Rate Limiting Tiers

### Global Limiter
- **Limit**: 1000 requests per 15 minutes
- **Key**: IP address
- **Purpose**: Catch bot/script abuse across all requests
- **Applied to**: All endpoints

### Role-Based Limits (Applied after authentication)

#### Patient Tier
- **Limit**: 100 requests per minute
- **Key**: User ID (req.userId)
- **Purpose**: Normal patient gameplay and dashboard usage
- **Rationale**: Patients typically interact with games, reminders, and profiles

#### Caregiver Tier
- **Limit**: 200 requests per minute
- **Key**: User ID
- **Purpose**: Caregiver dashboard, monitoring, and reporting
- **Rationale**: Caregivers need higher limits for multi-patient monitoring and analytics

#### Admin Tier
- **Limit**: 500 requests per minute
- **Key**: User ID
- **Purpose**: Admin operations, bulk data management, compliance reporting
- **Rationale**: Admins perform system-wide operations requiring higher request throughput

### Endpoint-Specific Limits

#### Authentication
- **Type**: Auth Rate Limiter
- **Limit**: 5 attempts per 15 minutes
- **Key**: Email + IP address
- **Purpose**: Prevent brute-force login/register attacks
- **Applied to**: 
  - `POST /api/auth/login`
  - `POST /api/auth/register`

#### Sensitive Operations
- **Type**: Strict Rate Limiter
- **Limit**: 10 requests per minute
- **Key**: User ID
- **Purpose**: Prevent account deletion abuse
- **Applied to**:
  - `DELETE /api/backup/delete-account`
  - `PATCH /api/auth/email`

#### Game Submission
- **Type**: Game Rate Limiter
- **Limit**: 30 actions per minute
- **Key**: User ID
- **Purpose**: Prevent game score manipulation
- **Applied to**:
  - `POST /api/games/submit`

#### AI Recommendations
- **Type**: Endpoint-Specific
- **Limit**: 5 requests per hour
- **Key**: User ID
- **Purpose**: Control expensive ML computations
- **Applied to**:
  - `GET /api/ai/recommendations`
  - `GET /api/ai/recommendations/:patientId`

#### Data Export
- **Type**: Endpoint-Specific
- **Limit**: 3 exports per day (24 hours)
- **Key**: User ID
- **Purpose**: Prevent database strain from bulk exports
- **Applied to**:
  - `GET /api/backup/export-data`
  - `GET /api/backup/export-performance-csv`
  - `POST /api/backup/create-snapshot`

#### Compliance Report Generation
- **Type**: Endpoint-Specific
- **Limit**: 2 reports per hour
- **Key**: User ID
- **Purpose**: Control resource-intensive compliance analysis
- **Applied to**:
  - `GET /api/backup/generate-report-pdf`
  - `POST /api/compliance/generate-report`

#### File Upload
- **Type**: Endpoint-Specific
- **Limit**: 20 uploads per hour
- **Key**: User ID
- **Purpose**: Prevent storage quota exhaustion
- **Applied to**:
  - `POST /api/storage/upload-memory`
  - `POST /api/storage/upload-base64`

## Configuration

### Environment Variables

```bash
# Optional: Redis for distributed rate limiting
# Format: redis://[:password@]host:port/[database]
# If not provided, in-memory store is used (suitable for single-instance deployments)
REDIS_URL=redis://localhost:6379
```

### Development Setup (In-Memory Store)
No additional configuration needed. Rate limits are stored in process memory.

**Pros:**
- No external dependencies
- Fast local development
- Easy testing

**Cons:**
- Not shared across multiple server instances
- Resets on server restart
- Not suitable for production multi-instance deployments

### Production Setup (Redis)

1. **Install Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. **Configure Redis URL**
   ```bash
   # .env
   REDIS_URL=redis://localhost:6379
   
   # Or with authentication
   REDIS_URL=redis://:password@localhost:6379/0
   
   # Or remote Redis
   REDIS_URL=redis://user:password@redis-prod.example.com:6379
   ```

3. **Verify Connection**
   The server logs will show:
   ```
   Redis connected for rate limiting
   ```

If Redis connection fails, the system automatically falls back to in-memory store:
```
Redis not available. Using memory store for rate limiting
```

## Response Codes and Headers

### On Rate Limit Hit
```http
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": "2024-09-02T14:30:00.000Z"
}

RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1725362400
```

### Headers Explanation
- `RateLimit-Limit`: Maximum requests allowed in the window
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when limit resets

## Implementation Details

### Service: `rateLimitService.js`
- **Location**: `backend/src/services/rateLimitService.js`
- **Exports**:
  - `globalLimiter`: Global abuse protection
  - `patientLimiter`: Patient role limit
  - `caregiverLimiter`: Caregiver role limit
  - `adminLimiter`: Admin role limit
  - `strictLimiter`: Sensitive operations limit
  - `authLimiter`: Auth attempt limit
  - `gameLimiter`: Game action limit
  - `endpointLimiters`: Object containing specific endpoint limiters
  - `getLimiterByRole(role)`: Helper to get limiter by user role
  - `createLimiter(windowMs, max, keyGenerator)`: Factory function

### Middleware: `rateLimit.js`
- **Location**: `backend/src/middleware/rateLimit.js`
- **Exports**:
  - `roleBasedRateLimit`: Applied after authentication to enforce role-based limits
  - `sensitiveOperationRateLimit`: Applied to sensitive endpoints

### Routes Updated
All routes now apply appropriate rate limiting:

**Authentication Routes** (`auth.js`):
```javascript
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.patch('/email', protect, sensitiveOperationRateLimit, updateEmailValidation, updateEmail);
router.delete('/account', protect, sensitiveOperationRateLimit, deleteAccount);
```

**Game Routes** (`games.js`):
```javascript
router.post('/submit', gameLimiter, submitGameResult);
```

**AI Routes** (`ai.js`):
```javascript
router.get('/recommendations', restrictTo('patient'), endpointLimiters.aiRecommendations, getRecommendations);
router.get('/recommendations/:patientId', restrictTo('caregiver'), endpointLimiters.aiRecommendations, getRecommendationsForPatient);
```

**Storage Routes** (`storage.js`):
```javascript
router.post('/upload-memory', protect, restrictTo('patient'), endpointLimiters.fileUpload, upload.single('photo'), ...);
router.post('/upload-base64', protect, restrictTo('patient'), endpointLimiters.fileUpload, ...);
```

**Backup Routes** (`backup.js`):
```javascript
router.get('/export-data', protect, restrictTo('patient'), endpointLimiters.dataExport, ...);
router.get('/export-performance-csv', protect, restrictTo('patient'), endpointLimiters.dataExport, ...);
router.post('/create-snapshot', protect, restrictTo('patient'), endpointLimiters.dataExport, ...);
router.delete('/delete-account', protect, restrictTo('patient'), sensitiveOperationRateLimit, ...);
router.get('/generate-report-pdf', protect, endpointLimiters.complianceReport, ...);
```

**Compliance Routes** (`compliance.js`):
```javascript
router.post('/generate-report', protect, restrictTo('admin'), endpointLimiters.complianceReport, ...);
```

## Testing Rate Limits

### Manual Testing
```bash
# Test patient limit (100 req/min)
for i in {1..105}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/patient/dashboard
done
# Last 5 requests should return 429

# Test auth limit (5 attempts/15min)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6th request should return 429
```

### Using Redis CLI
```bash
# Connect to Redis
redis-cli

# View all rate limit keys
KEYS "rate-limit:*"

# Check remaining limit for a user
GET "rate-limit:patient:user-id-here"

# View TTL (time to reset)
TTL "rate-limit:patient:user-id-here"

# Manually reset a user's limit (for testing)
DEL "rate-limit:patient:user-id-here"
```

## Monitoring and Alerting

### Metrics to Track
1. **Rate Limit Hit Rate**: Percentage of 429 responses
2. **Peak Request Rates**: Identify burst patterns
3. **Role Distribution**: Which roles hit limits most often
4. **Redis Memory Usage**: If using Redis, monitor memory consumption

### Recommended Thresholds
- Alert if > 5% of requests return 429
- Alert if Redis memory exceeds 80% of allocation
- Alert if response times spike due to rate limit processing

## Customization

### Adding New Endpoint-Specific Limits
```javascript
// In rateLimitService.js
const customLimiter = createLimiter(
  60 * 1000,    // 1 minute window
  50,           // 50 requests max
  (req) => `custom:${req.userId}`
);

// Export it
module.exports = {
  // ... existing exports
  endpointLimiters: {
    // ... existing
    customEndpoint: customLimiter
  }
};

// In your route
router.get('/custom-endpoint', protect, endpointLimiters.customEndpoint, handler);
```

### Adjusting Existing Limits
```javascript
// In rateLimitService.js, modify the createLimiter call
const patientLimiter = createLimiter(
  60 * 1000,       // 1 minute
  150,             // Changed from 100 to 150
  (req) => `patient:${req.userId}`
);
```

## Troubleshooting

### Issue: "Too many requests" immediately on login
**Solution**: Auth rate limit triggered. Wait 15 minutes or check Redis state:
```bash
redis-cli DEL "rate-limit:auth:email@test.com:IP"
```

### Issue: Redis connection fails but server starts
**Behavior**: System falls back to in-memory store. Check logs:
```bash
tail -f logs/app.log | grep -i redis
```

### Issue: Rate limits not persisting across server restarts
**Cause**: Using in-memory store without Redis
**Solution**: Configure REDIS_URL for persistent rate limiting

### Issue: Different limits on different instances
**Cause**: Multiple servers with in-memory stores
**Solution**: Configure all servers to use same Redis instance

## Performance Impact

- **In-Memory Store**: < 1ms per request (negligible overhead)
- **Redis Store**: 5-10ms per request (network roundtrip)
- **Memory Usage (In-Memory)**: ~1KB per active user
- **Redis Memory Usage**: ~100 bytes per tracked key

## Security Considerations

1. **Key Collision**: Rate limit keys are unique per user/IP to prevent false positives
2. **DDoS Protection**: Global limiter on IP address prevents flooding
3. **Timing Attacks**: Rate limits don't reveal whether email exists (same limit for auth)
4. **Token Bypass**: Limits apply before token validation for most endpoints
5. **Redis Security**: 
   - Always use Redis with authentication in production
   - Use TLS for Redis connections over network
   - Restrict Redis to internal networks

## Future Enhancements

- [ ] Implement adaptive rate limiting based on system load
- [ ] Add per-IP rate limiting for unauthenticated endpoints
- [ ] Dynamic limits based on user subscription tier
- [ ] Circuit breaker pattern for overloaded endpoints
- [ ] Rate limit analytics dashboard
- [ ] Whitelist/blacklist mechanisms for IPs
- [ ] Graduated backoff algorithm for repeated violations
