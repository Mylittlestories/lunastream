# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅                 |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in LunaStream, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please:

1. **Email:** Send details to the project maintainers
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** of the vulnerability within 1 week
- **Fix timeline** communicated promptly
- **Credit** for responsible disclosure (unless you prefer to remain anonymous)

### Security Best Practices

When deploying LunaStream:

1. **Always set a strong `JWT_SECRET`** - use at least 32 random characters
2. **Use HTTPS** in production (Vercel provides this automatically)
3. **Keep dependencies updated** - run `npm audit` regularly
4. **Review environment variables** - never commit `.env` files
5. **Use parameterized queries** - Prisma handles this automatically
6. **Enable CORS properly** - restrict origins in production

### Dependencies

We monitor dependencies for vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with major updates
npm audit fix --force
```

### Architecture Security Notes

- **Authentication:** JWT tokens with configurable expiration
- **Password Storage:** bcryptjs with salt rounds
- **Database:** Prisma ORM with parameterized queries
- **API Routes:** Server-side validation on all endpoints
- **CSP:** Content Security Policy headers recommended

---

Thank you for helping keep LunaStream secure! 🔒
