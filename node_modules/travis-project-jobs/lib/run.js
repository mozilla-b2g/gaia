var fs = require('fs'),
    fsPath = require('path'),
    spawn = require('child_process').spawn,
    debug = require('debug')('travis-project-jobs:run');

function Status(code) {
  this.code = code || 0;
}

/**
 * Runs a given travis step.
 *
 *    run(
 *      '/path/to/project',
 *      'script',
 *      { required: true },
 *      function(err, status) {
 *        // status.code
 *      }
 *    );
 *
 *
 * @param {String} project path.
 * @param {String} step to run.
 * @param {Object} [options] for project.
 * @param {Function} callback [Error, Status].
 * @return {ChildProcess|Null}
 *  child process or null if failure is allowed.
 */
function run(project, step, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  //  step executable
  var binary = fsPath.join(project, step);

  // some steps can fail
  var required = options.required || false;

  // for tests or other logging
  var stdio = options.stdio || 'inherit';

  debug(binary, 'required? ' + required);

  // verify it exists
  if (!fs.existsSync(binary)) {
    var err;
    // throw if required
    if (required) {
      err = new Error('missing required step:' + binary);
    }

    // otherwise just fire callback
    return process.nextTick(callback.bind(null, err, new Status()));
  }

  // spawn the child process
  var child = spawn(binary, [], { stdio: stdio });

  child.once('error', function(err) {
    callback(err);
  });

  child.once('close', function(code) {
    callback(null, new Status(code));
  });

  return child;
}

module.exports = run;
