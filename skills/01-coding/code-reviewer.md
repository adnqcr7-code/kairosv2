---
name: code-reviewer
version: 1.0.0
category: coding
description: Reviews code for quality, best practices, security, and performance
author: kairos-team
license: MIT
tags:
  - coding
  - review
  - quality
  - security
  - performance
keywords:
  - review
  - code review
  - quality
  - best practices
  - security audit
  - performance
requires:
  tools:
    - read_file
    - search_files
  permissions:
    - filesystem:read
---

## Trigger
When user requests code review or mentions "review this code", "code review", "review my code", etc.

## Parameters
- filePath (string, required): Path to the file or directory to review
- focus (string, optional): Specific aspects to focus on (quality, security, performance, etc.)
- strict (boolean, optional): Whether to be strict in the review (default: false)

## Action
1. **Validate Input**:
   - Check if filePath exists and is accessible
   - If directory, find all code files to review
   - Validate focus parameter if provided

2. **Read Code**:
   - Read the file(s) content
   - Detect programming language
   - Parse file structure

3. **Analyze Code**:
   - **Quality Analysis**:
     - Check code formatting and style
     - Look for code smells
     - Check for anti-patterns
     - Review naming conventions
     - Check for magic numbers/strings
     - Review function/comethod length
     - Check cyclomatic complexity
     
   - **Best Practices**:
     - Check for proper error handling
     - Review exception handling
     - Check for resource cleanup (file handles, connections)
     - Review logging practices
     - Check for proper documentation
     - Review test coverage
     
   - **Security Analysis**:
     - Look for hardcoded secrets
     - Check for SQL injection vulnerabilities
     - Review XSS vulnerabilities
     - Check for path traversal issues
     - Review authentication/authorization
     - Check for sensitive data exposure
     
   - **Performance Analysis**:
     - Look for inefficient algorithms
     - Check for unnecessary computations
     - Review database query efficiency
     - Check for memory leaks
     - Review caching opportunities
     - Check for blocking operations

4. **Generate Report**:
   - Create structured review report
   - Categorize findings by severity (critical, high, medium, low)
   - Provide specific code locations
   - Suggest improvements
   - Include examples of good practices

5. **Store Results**:
   - Save review results to memory
   - Update skill based on new patterns found
   - Record metrics for future improvement

## Examples

### Example 1: Basic code review
User: "Review src/index.js"
Action: Read src/index.js, analyze for quality, security, and performance issues, provide detailed report

### Example 2: Focused review
User: "Review src/api/user.js for security issues"
Action: Read src/api/user.js, focus analysis on security vulnerabilities, provide security-focused report

### Example 3: Directory review
User: "Review the entire src/ directory"
Action: Find all code files in src/, analyze each file, provide comprehensive review report

### Example 4: Strict review
User: "Review src/utils/helper.js with strict mode"
Action: Read src/utils/helper.js, perform strict analysis with high standards, provide detailed report

## Notes
- Always provide specific, actionable feedback
- Reference line numbers when possible
- Include code examples for improvements
- Prioritize findings by severity
- Consider the programming language's idioms
- Be constructive and educational
- Offer to help implement fixes

## Output Format
```markdown
# Code Review Report: [File Path]

## Summary
- **Language**: [Detected Language]
- **Lines of Code**: [Count]
- **Files Reviewed**: [Count]
- **Overall Score**: [X/10]

## Findings

### Critical Issues (Must Fix)
1. **[Issue Title]** at line [X]
   - Description: [Detailed description]
   - Impact: [Potential impact]
   - Fix: [Suggested fix with code example]

### High Priority Issues (Should Fix)
1. **[Issue Title]** at line [X]
   - Description: [Detailed description]
   - Impact: [Potential impact]
   - Fix: [Suggested fix]

### Medium Priority Issues (Nice to Fix)
1. **[Issue Title]** at line [X]
   - Description: [Detailed description]
   - Fix: [Suggested fix]

### Low Priority Issues (Optional)
1. **[Issue Title]** at line [X]
   - Description: [Detailed description]
   - Fix: [Suggested fix]

## Quality Metrics
- **Code Quality**: [X/10]
- **Best Practices**: [X/10]
- **Security**: [X/10]
- **Performance**: [X/10]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Next Steps
- [ ] Fix critical issues
- [ ] Address high priority issues
- [ ] Consider medium priority improvements
- [ ] Review recommendations
```
