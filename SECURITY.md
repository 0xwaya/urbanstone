# Security Policy

## Supported Scope

This repository is a public source snapshot of the Amazon Granite project.

Security expectations for contributors:

- do not commit credentials, API keys, private certificates, or local environment files
- keep generated artifacts out of version control unless they are intentionally reviewed
- review third-party dependencies before promoting this snapshot into a deployable application

## Reporting A Vulnerability

Please do not open a public issue for a security problem.

Instead:

1. email the maintainer privately or use a private GitHub security report if enabled
2. include the affected file paths, impact, and reproduction steps
3. include whether any secret, token, or customer data may have been exposed

## Immediate Response Guidance

If a secret is accidentally committed:

1. rotate the secret immediately
2. remove it from the repository history if needed
3. document the remediation in a private channel
4. verify the repo still contains no replacement secrets before pushing again

## Hardening Priorities

Before any production deployment, complete these steps:

1. add dependency auditing and update automation
2. add CI checks for linting and secret scanning
3. define environment-variable contracts with `.env.example`
4. review asset licensing and public redistribution rights
5. add hosting, CSP, and runtime security controls appropriate to the final stack
