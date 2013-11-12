"use strict";

var fs = require("fs");
module.exports = {
  reporter: function (results, data, opts) {
    var whitelist;
    var len = results.length;
    var redErrors = '';
    var whiteErrors = '';

    try {
      whitelist = fs.readFileSync('./.jshintwhitelist', 'utf-8');
      whitelist = whitelist.split('\n');
    } catch (e) {
      process.stdout.write('Error reading .jshintwhitelist\n');
      whitelist = [];
    }

    opts = opts || {};

    // filter the results down to only those that should be "red"
    var red = results.filter(function (result) {
      var file = result.file;
      var error = result.error;
      var white = whitelist.indexOf(file) !== -1;
      var str = '';

      str += file  + ': line ' + error.line + ', col ' +
        error.character + ', ' + error.reason;

      if (opts.verbose) {
        str += ' (' + error.code + ')';
      }

      if (white) {
        str += ' (white)';
        whiteErrors += str + '\n';
      } else {
        str += ' (ERROR)';
        redErrors += str + '\n';
      }

      return !white;
    });

    var redCount = red.length;
    var whiteCount = len - redCount;

    // if we are running in travis, skip output of white errors
    if (process.env.CI_ACTION) {
      whiteErrors = '';
    }

    process.stdout.write(
      // show redErrors first always
      redErrors + whiteErrors + '\n' +
      redCount + ' error' + ((redCount === 1) ? '' : 's') +
      (whiteCount ? ' (' + (whiteCount) + ' whitelisted)' : '') +
      '\n'
    );
    // interesting - if we modify 'results' to be 0 in length, jshint exits
    // with 0 :)
    results.splice.apply(results, [0,len].concat(red));
  }
};
