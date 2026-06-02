const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const HIGH_RISK_PATTERNS = [
  /\b(del|erase|rd|rmdir|remove-item|rm)\b/i,
  /\brm\s+(-[A-Za-z]*[rf][A-Za-z]*\s+|.*\s-[A-Za-z]*[rf][A-Za-z]*\s+)/i,
  /\bfind\b[\s\S]*\s-delete\b/i,
  /\b(shred|wipefs)\b/i,
  /\bdd\b[\s\S]*\bof\s*=/i,
  /\bmkfs(\.[a-z0-9]+)?\b/i,
  /\b(chmod|chown|chgrp)\b\s+(-[A-Za-z]*R[A-Za-z]*|--recursive)\b/i,
  /:\s*\(\s*\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/,
  /\bformat\b/i,
  /\bshutdown\b/i,
  /\breg\s+(add|delete|import)\b/i,
  /\bset-executionpolicy\b/i,
  /\binvoke-expression\b|\biex\b/i,
  /\bcurl\b.*\|\s*(powershell|pwsh|cmd|sh|bash)/i,
  /\bwget\b.*\|\s*(powershell|pwsh|cmd|sh|bash)/i,
  /\b(sudo|su)\b/i,
  /\b(docker|podman)\s+run\b/i,
  /\bmount\b|\bumount\b/i,
  /\bgit\s+push\b/i,
  /\btoken\b|\bpassword\b|\bsecret\b/i
];

const MEDIUM_RISK_PATTERNS = [
  /\bnpm\s+install\b|\bnpm\.cmd\s+install\b/i,
  /\b(apt|apt-get|apk|dnf|yum|pacman)\s+(install|remove|upgrade|update)\b/i,
  /\b(pip|pip3)\s+install\b/i,
  /\b(npx|pnpm|yarn)\b/i,
  /\bgit\s+(push|pull|merge|rebase|commit)\b/i,
  /\bpowershell\b|\bpwsh\b|\bcmd\b/i,
  /\bnode\b.*\.js\b/i
];

function reviewCommand(command) {
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      level: 'high',
      requiresProof: true,
      proofPhrase: 'APPROVE KAIROS',
      reason: 'Command may delete data, change system settings, escape isolation, execute downloaded code, or expose secrets.'
    };
  }

  if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      level: 'medium',
      requiresProof: false,
      reason: 'Command may change dependencies, repository state, or execute project code.'
    };
  }

  return {
    level: 'low',
    requiresProof: false,
    reason: 'No dangerous command pattern detected.'
  };
}

function reviewAction(action) {
  if (action.kind === 'shell') return reviewCommand(action.command);
  if (action.kind === 'mkdir') {
    return {
      level: 'low',
      requiresProof: false,
      reason: 'Creating a folder inside an approved workspace is low risk.'
    };
  }
  if (action.kind === 'zip') {
    return {
      level: action.overwrite ? 'medium' : 'low',
      requiresProof: false,
      reason: action.overwrite ? 'Zip output already exists and may be overwritten.' : 'Packaging files into a zip is low risk.'
    };
  }
  if (action.kind === 'template') {
    return {
      level: action.overwrite ? 'medium' : 'low',
      requiresProof: false,
      reason: action.overwrite
        ? 'Template target already has files and may be overwritten.'
        : 'Creating a new starter template inside the workspace is low risk.'
    };
  }
  if (action.kind === 'write') {
    return {
      level: action.overwrite ? 'medium' : 'low',
      requiresProof: false,
      reason: action.overwrite
        ? 'Overwriting an existing file. Review the content before approving.'
        : 'Creating a new file inside the workspace is low risk.'
    };
  }
  if (action.kind === 'web_fetch') {
    return {
      level: action.local ? 'low' : 'medium',
      requiresProof: false,
      reason: action.local
        ? 'Fetching a local URL is low risk.'
        : 'Fetching a remote URL sends a network request from this machine. Review the URL before approving.'
    };
  }
  if (action.kind === 'browser_open') {
    return {
      level: action.local ? 'low' : 'medium',
      requiresProof: false,
      reason: action.local
        ? 'Opening a local preview or workspace file in the browser is low risk.'
        : 'Opening a remote URL in the browser may leave local context. Review the target before approving.'
    };
  }

  return {
    level: 'medium',
    requiresProof: false,
    reason: 'Unknown action type. Review before proceeding.'
  };
}

async function requireApproval(review, flags = {}) {
  if (review.level === 'low') return true;

  console.log('Kairos Safety Review');
  console.log(`Risk: ${review.level}`);
  console.log(`Reason: ${review.reason}`);

  if (review.requiresProof) {
    if (flags.proof === review.proofPhrase) return true;
    const rl = readline.createInterface({ input, output });
    try {
      const answer = await rl.question(`Type ${review.proofPhrase} to continue: `);
      return answer.trim() === review.proofPhrase;
    } finally {
      rl.close();
    }
  }

  if (flags.yes) return true;
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question('Continue? (yes/no): ');
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

module.exports = {
  requireApproval,
  reviewAction,
  reviewCommand
};
