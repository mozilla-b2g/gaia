/*globals exports, process*/
'use strict';

// Imports
var childProcess = require('child_process');

// Envy binary name
var ENVY_CMD = 'envy';
// Child process options.
var DEFAULT_PROCESS_OPTIONS = Object.freeze({ cwd: process.cwd(),
                                              stdio: [process.stdin,
                                                      process.stdout,
                                                      process.stderr] });
// Child processes.
var _childProcesses = [];

function getProcessOptions(processInfo) {
  var options = {};
  Object.assign(options, DEFAULT_PROCESS_OPTIONS);

  // Clone environment from parent for child.
  options.env = {};
  Object.assign(options.env, process.env);

  // Add additional environment from process info if present.
  if (processInfo.env && typeof processInfo.env === 'object') {
    Object.assign(options.env, processInfo.env);
  }

  return options;
}

function getProcessInfo(processInfo) {
  var info = {};
  Object.assign(info, processInfo);

  // Override a few things to ensure we run using envy properly.
  info.cmd = ENVY_CMD;
  info.args = [processInfo.cmd];
  // Add additional arguments if they were originally provided.
  if (processInfo.args) {
    info.args.push.apply(info.args, processInfo.args);
  }

  return info;
}

function runAsync(info, options) {
  // Use standard async execFile.
  var child = childProcess.execFile(info.cmd,
                                    info.args,
                                    options);
  // Keep track of the child process.
  _childProcesses.push(child);
  // For debugging purposes, we want to know process errors.
  child.on('error', function(err) {
    console.error(err);
  });
  // Just in case it terminates before we tell it to do so.
  child.once('exit', function() {
    var c = _childProcesses.indexOf(child);
    if (c === -1) {
      console.warn('Failed to find child process on exit');
    }
    _childProcesses.splice(c, 1);
  });

  // Wait for specified condition.
  if (info.waitFor) {
    // XXXAus: SUPPORT WAITING FOR PORT
  }

  // Done.
  return;
}

// Run a process command
function run(processInfo) {
  var options = getProcessOptions(processInfo);
  var info = getProcessInfo(processInfo);

  // If the pre req command needs to run in the background, truthy is fine.
  if (info.bg === true) {
    return runAsync(info, options);
  }

  // Otherwise run synchronously. This will throw if it fails.
  return childProcess.execFileSync(info.cmd,
                                   info.args,
                                   options);
}

// Module Exports
exports.run = run;
