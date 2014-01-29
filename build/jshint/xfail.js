// custom jshint reporter, allows errors in files listed in the
// build/jshint/xfail.list file, but still display them
/* global module, process */

'use strict';

var fs = require('fs');
module.exports = {
  reporter: function(results, data, opts) {
    var xfail;
    var len = results.length;
    var redErrors = '';
    var xErrors = '';
    var lastFile;
    var fileCount = 0;

    try {
      xfail = fs.readFileSync('build/jshint/xfail.list', 'utf-8');
      xfail = xfail.split('\n');
    } catch (e) {
      process.stdout.write('Error reading build/jshint/xfail.list\n');
      xfail = [];
    }

    opts = opts || {};

    // filter the results down to only those that should be "red"
    var red = results.filter(function(result) {
      var file = result.file;
      var error = result.error;
      var expected = xfail.indexOf(file) !== -1;
      var str = '';
      if (lastFile && (file !== lastFile)) {
        fileCount = 0;
      }
      lastFile = file;
      fileCount++;

      str += file + ': line ' + error.line + ', col ' +
        error.character + ', ' + error.reason;

      if (opts.verbose) {
        str += ' (' + error.code + ')';
      }

      if (expected) {
        str += ' (xfail)';
        if (!opts.verbose) {
          if (fileCount === 6) {
            xErrors += file + ': more xfail errors silenced,' +
              ' run with --verbose\n';
          } else if (fileCount < 6) {
            xErrors += str + '\n';
          }
        } else {
          xErrors += str + '\n';
        }
      } else {
        str += ' (ERROR)';
        redErrors += str + '\n';
      }

      return !expected;
    });

    var redCount = red.length;
    var xCount = len - redCount;

    // if we are running in travis, or if the user uses NO_XFAIL=1,
    // skip output of xfail errors
    if (process.env.CI_ACTION || process.env.NO_XFAIL) {
      xErrors = '';
    }

    process.stdout.write(
      // show redErrors first always
      redErrors + xErrors + '\n' +
      redCount + ' error' + ((redCount === 1) ? '' : 's') +
      (xCount ? ' (' + (xCount) + ' xfailed)' : '') +
      '\n'
    );
    // interesting - if we modify 'results' to be 0 in length, jshint exits
    // with 0 :)
    results.splice.apply(results, [0, len].concat(red));
  }
};
