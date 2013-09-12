/*global module, console, process */

// Run a test with DEBUG=true in front to get console listing of
// helper method calls:
// DEBUG=true ./bin/gaia-marionette whatever_test.js
var debug = process.env.DEBUG;

module.exports = function(logPrefix, obj) {

  if (!debug)
    return;

  // Optionally log all calls done to prototype methods. Uncomment this
  // section to get traces when trying to debug where flow gets stuck.
  Object.keys(obj).forEach(function(key) {
    var desc = Object.getOwnPropertyDescriptor(obj, key);
    if (!desc.get && !desc.set && typeof obj[key] === 'function') {
      var oldMethod = obj[key];
      obj[key] = function() {

        var args = Array.prototype.slice.call(arguments, 0).map(function(arg) {
          return String(arg);
        }).join(', ');

        console.log(logPrefix + '.' + key + '(' + args + ')');
        return oldMethod.apply(this, arguments);
      };
    }
  });
};
