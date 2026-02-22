const { exec } = require('child_process');

function runOpenClaw(args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    exec(`openclaw ${args}`, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) reject(new Error(stderr || err.message));
      else resolve(stdout || stderr);
    });
  });
}

module.exports = {
  runOpenClaw
};
