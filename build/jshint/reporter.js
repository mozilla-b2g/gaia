/* jshint node: true */

'use strict';

module.exports = {
  reporter: function(results, data, opts) {
    var len = results.length;
    var redErrors = '';
    var lastFile;
    var fileCount = 0;

    opts = opts || {};

    // filter the results down to only those that should be "red"
    var red = results.filter(function(result) {
      var file = result.file;
      var error = result.error;
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

      str += ' (ERROR)';
      redErrors += str + '\n';

      return true;
    });

    var redCount = red.length;

    process.stdout.write(
      // show redErrors first always
      redErrors + '\n' +
      redCount + ' error' + ((redCount === 1) ? '' : 's') +
      '\n'
    );
    // interesting - if we modify 'results' to be 0 in length, jshint exits
    // with 0 :)
    results.splice.apply(results, [0, len].concat(red));
  }
};
