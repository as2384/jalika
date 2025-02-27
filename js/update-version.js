// Simple Node.js script to update version.json with Git commit info
// Run with: node update-version.js

const fs = require('fs');
const { execSync } = require('child_process');

// Get current Git commit hash
function getGitCommitHash() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.error('Error getting Git commit hash:', error.message);
    return 'unknown';
  }
}

// Get current Git branch
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.error('Error getting Git branch:', error.message);
    return 'unknown';
  }
}

// Main function
function updateVersionFile() {
  const versionFilePath = 'version.json';
  let versionData = {
    version: '1.0.0',
    commit: 'unknown',
    buildDate: new Date().toISOString(),
    environment: 'development'
  };

  // Try to read existing version file
  try {
    const existingData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    versionData = { ...versionData, ...existingData };
  } catch (error) {
    console.log('Creating new version file');
  }

  // Update with latest Git info
  versionData.commit = getGitCommitHash();
  versionData.branch = getGitBranch();
  versionData.buildDate = new Date().toISOString();

  // Write updated file
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  console.log(`Updated ${versionFilePath} with commit ${versionData.commit.substring(0, 7)}`);
}

// Run the update
updateVersionFile();
