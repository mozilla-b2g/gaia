"use strict";

var fs = require("fs");
module.exports = {
  reporter: function (results, data, opts) {
    var whitelist;
    var len = results.length;
    var str = '';
    var prevfile;

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

      if (prevfile && prevfile !== file) {
        str += "\n";
      }
      prevfile = file;

      str += file  + ': line ' + error.line + ', col ' +
        error.character + ', ' + error.reason;

      if (opts.verbose) {
        str += ' (' + error.code + ')';
      }

      if (white) {
        str += ' (whitelist)';
      }


      str += '\n';
      return !white;
    });

    var white = len - red.length;

    if (str) {
      process.stdout.write(
        str + "\n" +
        red.length + ' error' + ((red.length === 1) ? '' : 's') +
        (white ? ' (' + (white) + ' whitelisted)' : '') +
        '\n'
      );
    }
    // interesting - if we modify 'results' to be 0 in length, jshint exits
    // with 0 :)
    results.splice.apply(results, [0,len].concat(red));
  }
};
