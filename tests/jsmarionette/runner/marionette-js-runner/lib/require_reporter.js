'use strict';
/**
Helper to import the mocha reporters...
*/
module.exports = function requireReporter(argv, path) {
  var reporter;
  [
    argv.reporter,
    path,
    'mocha/lib/reporters/' + (path || 'dot')
  ].some(function(value) {
    try {
      reporter = require(value);
      return true;
    } catch (error) {
      return false;
    }
  });

  return reporter;
};
