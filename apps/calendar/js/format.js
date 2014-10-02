(function(exports) {
'use strict';

/**
 * Constants
 */
var FORMAT_REGEX = /%([0-9])?s/g;

exports.format = function() {
  var i = 0,
      str,
      args = Array.prototype.slice.call(arguments),
      result;

  str = args.shift();

  result = str.replace(FORMAT_REGEX, function(match, pos) {
    var index = parseInt(pos || i++, 10);
    return args[index];
  });

  return result;
};

}(Calendar));
