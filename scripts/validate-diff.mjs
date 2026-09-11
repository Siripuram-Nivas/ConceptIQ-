import { execSync } from 'child_process';

try {
  console.log('================================================================');
  console.log('🚨 DIFF ACCOUNTABILITY');
  console.log('================================================================\\n');

  console.log('--- CHANGED FILES (Name Only) ---');
  const nameOnly = execSync('git diff --name-only', { encoding: 'utf-8' });
  console.log(nameOnly);

  console.log('\\n--- CHANGED FILES (Stat) ---');
  const stat = execSync('git diff --stat', { encoding: 'utf-8' });
  console.log(stat);

} catch (err) {
  console.error('Failed to run git diff:', err);
}
