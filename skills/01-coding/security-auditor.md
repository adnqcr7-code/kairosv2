---
name: security-auditor
version: 1.0.0
category: coding
description: Audits code and systems for security vulnerabilities and best practices
author: kairos-team
license: MIT
tags:
  - security
  - audit
  - vulnerabilities
  - compliance
  - hardening
keywords:
  - security audit
  - vulnerability scan
  - security review
  - penetration test
  - security check
  - compliance
requires:
  tools:
    - read_file
    - search_files
    - run_command
  permissions:
    - filesystem:read
    - command:low-risk
---

## Trigger
When user requests security audit or mentions "security audit", "vulnerability scan", "security review", "penetration test", etc.

## Parameters
- target (string, required): Path to file, directory, or system to audit
- type (string, optional): Type of audit (code, config, dependencies, full)
- depth (string, optional): Depth of audit (quick, standard, deep)
- output (string, optional): Output format (summary, detailed, json)

## Action

### 1. Pre-Audit Setup
- Verify target exists and is accessible
- Determine audit scope based on target type
- Check for required tools and permissions
- Initialize audit report structure

### 2. Code Security Audit (if target is code)

#### Secrets Detection
- Scan for API keys, tokens, passwords
- Look for hardcoded credentials
- Check environment variable usage
- Review configuration files
- Patterns to detect:
  - AWS, GCP, Azure credentials
  - Database connection strings
  - API keys and tokens
  - Private keys and certificates
  - Passwords and secrets

#### Injection Vulnerabilities
- **SQL Injection**:
  - Look for string concatenation in queries
  - Check for raw SQL queries
  - Review ORM usage
  - Test with sample payloads
  
- **XSS (Cross-Site Scripting)**:
  - Check for unescaped user input
  - Review HTML rendering
  - Look for innerHTML usage
  - Check for DOM manipulation
  
- **Command Injection**:
  - Review shell command execution
  - Check for user input in commands
  - Look for exec, spawn, system calls
  - Verify input sanitization

#### Authentication & Authorization
- **Authentication**:
  - Check password storage (hashed vs plaintext)
  - Review session management
  - Look for weak authentication methods
  - Check for brute force protection
  
- **Authorization**:
  - Review access control checks
  - Look for privilege escalation
  - Check for broken access control
  - Verify role-based permissions

#### Data Security
- **Sensitive Data Exposure**:
  - Check for PII (Personally Identifiable Information)
  - Look for credit card numbers, SSNs, etc.
  - Review logging of sensitive data
  - Check API responses for data leakage
  
- **Data Storage**:
  - Review encryption at rest
  - Check for secure storage practices
  - Look for insecure file permissions
  - Verify backup security

#### Input Validation
- Check for missing input validation
- Look for type checking
- Review length limits
- Check for regex validation
- Verify sanitization functions

#### Error Handling
- Review error messages for information leakage
- Check for stack traces in production
- Look for detailed error responses
- Verify error logging practices

### 3. Configuration Security Audit

#### File Permissions
- Check file and directory permissions
- Look for world-writable files
- Review sensitive file access
- Verify ownership settings

#### Network Security
- Review firewall rules
- Check for open ports
- Look for insecure protocols (HTTP, FTP)
- Verify SSL/TLS configuration

#### Service Configuration
- Review running services
- Check for unnecessary services
- Look for outdated software
- Verify security patches

### 4. Dependencies Security Audit

#### Vulnerability Scanning
- Check for known vulnerabilities in dependencies
- Review dependency versions
- Look for outdated packages
- Check for deprecated packages

#### License Compliance
- Review dependency licenses
- Check for incompatible licenses
- Look for GPL dependencies
- Verify commercial usage rights

### 5. Infrastructure Security Audit

#### Container Security (if applicable)
- Review Dockerfile for best practices
- Check for running as root
- Look for exposed ports
- Verify image sources

#### Cloud Security (if applicable)
- Review IAM policies
- Check for over-permissive roles
- Look for public resources
- Verify encryption settings

### 6. Compliance Checks

#### Standards Compliance
- Check for OWASP Top 10 compliance
- Review CIS benchmarks
- Look for PCI DSS requirements
- Verify GDPR compliance

#### Custom Rules
- Apply organization-specific security policies
- Check for industry-specific requirements
- Review custom security rules

### 7. Post-Audit Actions
- Generate comprehensive report
- Prioritize findings by severity
- Provide remediation steps
- Store audit results in memory
- Update security knowledge base

## Severity Levels
- **Critical**: Immediate action required, active vulnerability
- **High**: Should be fixed soon, potential vulnerability
- **Medium**: Should be addressed, security improvement
- **Low**: Optional, best practice recommendation
- **Info**: Informational, no action required

## Output Format

### Summary Format
```
Security Audit Summary: [Target]
- Total Findings: [X]
- Critical: [X] | High: [X] | Medium: [X] | Low: [X] | Info: [X]
- Overall Risk: [Critical/High/Medium/Low]
- Estimated Fix Time: [X hours/days]
```

### Detailed Format
```markdown
# Security Audit Report: [Target]

## Executive Summary
- **Audit Date**: [Date/Time]
- **Target**: [Target Description]
- **Scope**: [Audit Scope]
- **Overall Risk**: [Risk Level]
- **Critical Issues**: [Count]
- **High Issues**: [Count]
- **Medium Issues**: [Count]

## Critical Findings

### [Finding Title]
- **Severity**: Critical
- **Category**: [Category]
- **Location**: [File:Line]
- **Description**: [Detailed description]
- **Impact**: [Potential impact]
- **Evidence**: [Code snippet or command]
- **Recommendation**: [Remediation steps]
- **References**: [CVE, OWASP, etc.]

## High Findings
[Same structure as Critical]

## Medium Findings
[Same structure as Critical]

## Low Findings
[Same structure as Critical]

## Informational Findings
[Same structure as Critical]

## Statistics
- **Files Scanned**: [Count]
- **Lines Analyzed**: [Count]
- **Vulnerabilities Found**: [Count]
- **Configuration Issues**: [Count]
- **Best Practice Violations**: [Count]

## Recommendations
1. [Priority 1 Recommendation]
2. [Priority 2 Recommendation]
3. [Priority 3 Recommendation]

## Next Steps
- [ ] Fix critical vulnerabilities immediately
- [ ] Address high severity issues within [timeframe]
- [ ] Review and fix medium severity issues
- [ ] Consider low severity improvements
- [ ] Schedule follow-up audit
```

### JSON Format
```json
{
  "auditId": "[Unique ID]",
  "target": "[Target]",
  "timestamp": "[ISO Date]",
  "scope": "[Scope]",
  "summary": {
    "totalFindings": [X],
    "bySeverity": {
      "critical": [X],
      "high": [X],
      "medium": [X],
      "low": [X],
      "info": [X]
    },
    "overallRisk": "[Risk Level]",
    "estimatedFixTime": "[Time Estimate]"
  },
  "findings": [
    {
      "id": "[Finding ID]",
      "title": "[Finding Title]",
      "severity": "critical",
      "category": "[Category]",
      "location": {
        "file": "[File Path]",
        "line": [Line Number],
        "code": "[Code Snippet]"
      },
      "description": "[Detailed Description]",
      "impact": "[Potential Impact]",
      "evidence": "[Evidence]",
      "recommendation": "[Remediation Steps]",
      "references": ["[Reference 1]", "[Reference 2]"],
      "cve": ["[CVE ID]"],
      "cvss": [Score],
      "fixed": false,
      "fixedAt": null,
      "notes": "[Additional Notes]"
    }
  ],
  "statistics": {
    "filesScanned": [X],
    "linesAnalyzed": [X],
    "vulnerabilitiesFound": [X],
    "configurationIssues": [X],
    "bestPracticeViolations": [X]
  },
  "recommendations": [
    {
      "priority": 1,
      "title": "[Recommendation Title]",
      "description": "[Detailed Description]",
      "actions": ["[Action 1]", "[Action 2]"],
      "resources": ["[Resource 1]", "[Resource 2]"]
    }
  ]
}
```

## Examples

### Example 1: Basic security audit
User: "Perform a security audit on src/api/"
Action: Scan all files in src/api/ for security vulnerabilities, generate detailed report

### Example 2: Quick security check
User: "Quick security check on app.js"
Action: Perform quick security scan on app.js, report critical and high issues only

### Example 3: Dependency audit
User: "Check package.json for vulnerable dependencies"
Action: Analyze package.json, check for known vulnerabilities, provide upgrade recommendations

### Example 4: Full system audit
User: "Full security audit of the entire project"
Action: Perform comprehensive security audit including code, config, dependencies, and infrastructure

## Notes
- Always prioritize security over convenience
- Be thorough but efficient
- Provide actionable recommendations
- Reference security standards and best practices
- Consider the specific technology stack
- Be aware of false positives
- Document all findings clearly
- Offer to help implement fixes
