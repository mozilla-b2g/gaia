#!/usr/bin/env node
'use strict';
var exec = require('child_process').exec;

function main() {
  var info = {
    __dirname: __dirname,
    __filename: __filename,
    process: {
      arch: process.arch,
      config: process.config,
      cwd: process.cwd(),
      env: process.env,
      execArgv: process.execArgv,
      platform: process.platform
    }
  };

  exec('whoami', function(err, stdout, stderr) {
    info.whoami = stdout.replace(/\s+/g, '');
    console.log('[sockit-to-me] ' + JSON.stringify(info, null, 4));
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}
