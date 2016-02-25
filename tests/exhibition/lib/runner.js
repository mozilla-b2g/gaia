/*globals exports, process*/
'use strict';

// Imports
var childProcess = require('child_process');
var waitForPort = require('wait-for-port');

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
  return new Promise(function(resolve, reject) {
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
      var waitFor = info.waitFor;

      // waitFor: { host: 'hostname.com', port: 1234 }
      if (waitFor.host && waitFor.port) {
        console.log('waiting for', info.waitFor);
        waitForPort(waitFor.host,
                    waitFor.port,
                    { numRetries: 120, retryInterval: 1000 },
                    function(err) {
          if (err) {
            // Forward the error
            reject(new Error(err));
          }
          else {
            // Done.
            console.log('done wait for', info.waitFor);
            resolve(child);
          }
        });

        return;
      }
      else {
        // That's all we support for now.
        reject(new Error('Unsupported waitFor usage.'));
      }
    }
  
    // Done.
    resolve(child);
  });
}

// Run a process command
function run(processInfo) {
  var options = getProcessOptions(processInfo);
  var info = getProcessInfo(processInfo);

  // If the pre req command needs to run in the background.
  if (info.bg === true) {
    // This will return it's own promise.
    return runAsync(info, options);
  }

  // This seems silly, but we should have the same interface regardless of sync
  // vs async. One interface is better than many.
  return new Promise(function(resolve, reject) {
    try {
      var child = childProcess.execFileSync(info.cmd,
                                            info.args,
                                            options);
      resolve(child);
    }
    catch(err) {
      reject(err);
    }
  });
}

function runQueue(queue) {
  let previousPromise = null;
  let jobPromises = [];

  // Schedule all of them.
  queue.forEach(function(job) {
    let jobPromise = run(job);
    jobPromises.push(jobPromise);
    if (previousPromise) {
      previousPromise.then(jobPromise);
    }
    previousPromise = jobPromise;
  });

  return jobPromises;
}

// Module Exports
exports.run = run;
exports.runQueue = runQueue;
