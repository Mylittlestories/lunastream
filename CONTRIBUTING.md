# Contributing to LunaStream

Thank you for your interest in contributing to LunaStream! This document provides guidelines and information for contributors.

## 🎯 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the project maintainers.

## 🚀 How to Contribute

### Reporting Bugs

Before creating a bug report, please check the [existing issues](../../issues) to avoid duplicates. When creating a bug report, include:

- **Clear title** with a descriptive summary
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, browser, Node.js version)
- **Screenshots** if applicable
- **Logs** if available

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing issues and discussions first
2. Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Provide clear use cases and benefits
4. Be open to discussion and refinement

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
3. **Make your changes** following our coding standards
4. **Test thoroughly** - ensure no regressions
5. **Commit with clear messages** following [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push and create a PR** using our [PR template](.github/pull_request_template.md)

## 📝 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/lunastream.git
cd lunastream

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npx prisma db push

# Start development server
npm run dev
```

## 🏗️ Coding Standards

### General

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Write **meaningful variable/function names**
- Add **comments** for complex logic
- Keep functions **small and focused**

### React/Next.js

- Use **functional components** with hooks
- Prefer **'use client'** directive only when needed
- Use **Tailwind CSS** for styling
- Keep components **under 300 lines** when possible
- Use **proper TypeScript interfaces** for props

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add subtitle auto-detection
fix: resolve video player crash on seek
docs: update installation guide
refactor: simplify stream resolver logic
test: add unit tests for auth service
chore: update dependencies
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

All PRs must pass tests and linting before merging.

## 📦 Adding Stream Sources

When adding new embed sources:

1. Test the source manually first
2. Add to the `resolveEmbedStreams()` function in `src/app/page.tsx`
3. Include fallback handling
4. Document the source in README.md
5. Test with both movies and series

## 📖 Documentation

- Update **README.md** for user-facing changes
- Update **DEPLOYMENT.md** for deployment changes
- Add **JSDoc comments** for exported functions
- Keep inline comments for complex logic

## 🐛 Bug Fix Process

1. Reproduce the bug
2. Write a failing test (if possible)
3. Fix the issue
4. Verify the fix
5. Update documentation if needed
6. Submit PR

## 🔄 Review Process

All PRs require at least one review. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation updates
- Security considerations
- Performance impact

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for helping make LunaStream better! 🌙✨
