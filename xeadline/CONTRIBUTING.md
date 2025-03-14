# Contributing to Xeadline

Thank you for your interest in contributing to Xeadline! This document provides guidelines and instructions for contributing to the project. By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Branching Strategy](#branching-strategy)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment (see [Development Setup](docs/DEVELOPMENT_SETUP.md))
4. Create a new branch for your contribution
5. Make your changes
6. Submit a pull request

## Development Environment

Please refer to the [Development Setup](docs/DEVELOPMENT_SETUP.md) document for detailed instructions on setting up your development environment.

### Quick Setup

```bash
# Clone your fork
git clone https://github.com/your-username/xeadline.git
cd xeadline

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Start development server
npm run dev
```

## Branching Strategy

We use a simplified Git flow approach:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: Feature branches
- `bugfix/bug-description`: Bug fix branches
- `hotfix/issue-description`: Urgent fixes for production

### Branch Naming Convention

- Feature branches: `feature/short-description`
- Bug fix branches: `bugfix/issue-number-short-description`
- Hotfix branches: `hotfix/issue-number-short-description`

Example: `feature/lightning-tipping` or `bugfix/123-fix-auth-flow`

## Coding Standards

We maintain high coding standards to ensure code quality and consistency.

### General Guidelines

- Write clean, readable, and maintainable code
- Follow the principle of DRY (Don't Repeat Yourself)
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names
- Add comments for complex logic, but prefer self-documenting code
- Write tests for your code

### TypeScript

- Use TypeScript for type safety
- Define interfaces for data structures
- Use proper type annotations
- Avoid using `any` type when possible
- Use type inference when appropriate

### React

- Use functional components with hooks
- Keep components small and focused
- Use proper component composition
- Follow React best practices
- Use React Testing Library for component tests

### CSS/Styling

- Use TailwindCSS for styling
- Follow the design system defined in [UI Design Specification](docs/UI_DESIGN_SPECIFICATION.md)
- Ensure responsive design works on all screen sizes
- Maintain accessibility standards

### Linting and Formatting

We use ESLint and Prettier to maintain code quality and consistency:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

### Scope

The scope is optional and should be the name of the component affected (e.g., `auth`, `post`, `community`).

### Examples

```
feat(auth): add support for nos2x extension
fix(post): resolve issue with vote count display
docs(readme): update installation instructions
style(components): format according to style guide
refactor(api): simplify relay connection logic
test(auth): add tests for key generation
```

## Pull Request Process

1. Create a new branch from `develop` for your changes
2. Make your changes and commit them following the commit guidelines
3. Push your branch to your fork
4. Submit a pull request to the `develop` branch of the main repository
5. Ensure the PR description clearly describes the changes and references any related issues
6. Wait for review and address any feedback

### Pull Request Template

When creating a pull request, please use the provided template and fill in all relevant sections.

### Code Review

All pull requests require at least one review from a maintainer before merging. Reviewers will check for:

- Code quality and adherence to coding standards
- Test coverage
- Documentation
- Potential issues or bugs
- Alignment with project goals

## Testing

We value thorough testing to ensure code quality and prevent regressions.

### Testing Requirements

- Write tests for all new features and bug fixes
- Maintain or improve test coverage
- Ensure all tests pass before submitting a pull request

### Types of Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete user flows

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Documentation

Good documentation is crucial for the project's usability and maintainability.

### Code Documentation

- Add JSDoc comments for functions and components
- Document complex logic and algorithms
- Keep comments up-to-date with code changes

### Project Documentation

- Update relevant documentation when adding or changing features
- Create new documentation for significant features
- Ensure documentation is clear and accessible

## Issue Reporting

### Bug Reports

When reporting a bug, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Environment information (browser, OS, etc.)
7. Any additional context

### Security Vulnerabilities

If you discover a security vulnerability, please do NOT open an issue. Email [security@xeadline.com](mailto:security@xeadline.com) instead.

## Feature Requests

We welcome feature requests that align with the project's goals.

When submitting a feature request, please include:

1. A clear and descriptive title
2. A detailed description of the proposed feature
3. The problem it solves or value it adds
4. Any alternatives you've considered
5. Any additional context or examples

## Community

### Communication Channels

- GitHub Discussions: For general questions and discussions
- Discord: For real-time communication and community building
- Twitter: For announcements and updates

### Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in the community.

## Nostr-Specific Contributions

### NIP Implementations

When implementing or modifying Nostr Implementation Possibilities (NIPs):

1. Reference the specific NIP number and link to the specification
2. Ensure compliance with the NIP specification
3. Add tests that verify correct implementation
4. Document any extensions or variations from the standard

### Relay Interactions

When working with Nostr relay code:

1. Ensure efficient subscription management
2. Handle connection errors gracefully
3. Test with multiple relays
4. Document relay requirements or assumptions

## Lightning Network Contributions

When working with Lightning Network integrations:

1. Follow security best practices for payment handling
2. Test with testnet before mainnet
3. Document payment flows clearly
4. Ensure proper error handling for payment failures

## Licensing

By contributing to Xeadline, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Recognition

We value all contributions and strive to recognize contributors in the following ways:

- Listing in the Contributors section of the README
- Acknowledgment in release notes for significant contributions
- Opportunities for regular contributors to join the core team

Thank you for contributing to Xeadline!
