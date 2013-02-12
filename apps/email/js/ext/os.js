/**
 *
 **/

define('os',
  [
    'exports'
  ],
  function(
    exports
  ) {

exports.hostname = function() {
  return 'localhost';
};
exports.getHostname = exports.hostname;

}); // end define
