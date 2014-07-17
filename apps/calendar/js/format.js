define(function() {
  'use strict';

  var FORMAT_REGEX = /%([0-9])?s/g;

  function format() {
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
  }

  return format;

});
