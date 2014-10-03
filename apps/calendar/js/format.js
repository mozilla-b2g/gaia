define(function(require, exports, module) {
'use strict';

var FORMAT_REGEX = /%([0-9])?s/g;

module.exports = function() {
  var args = Array.prototype.slice.call(arguments);

  var i = 0;
  var str = args.shift();
  return str.replace(FORMAT_REGEX, function(match, pos) {
    var index = parseInt(pos || i++, 10);
    return args[index];
  });
};

});
