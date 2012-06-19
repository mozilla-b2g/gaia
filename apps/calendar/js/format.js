(function(window) {
  var FORMAT_REGEX = /%([0-9])?s/g;

  if (typeof(Calendar) == 'undefined') {
    Calendar = {};
  }

  Calendar.format = function() {
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

}(this));
