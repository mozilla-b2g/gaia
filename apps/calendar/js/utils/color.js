define(function(require, exports) {
'use strict';

// right now the calendar app only displays 8 different colors so it's a good
// idea to memoize the results of hexToBackground to avoid calculating it for
// each busytime
var memoized = {};

exports.hexToBackground = function(hex) {
  if (!(hex in memoized)) {
    // we need 20% opacity for background; it's simpler to use rgba than to
    // create a new layer and set opacity:20%
    var {r, g, b} = hexToChannels(hex);
    memoized[hex] = `rgba(${r}, ${g}, ${b}, 0.2)`;
  }

  return memoized[hex];
};

function hexToChannels(hex) {
  var val = parseInt(hex.replace(/#/, ''), 16);
  return {
    r: val >> 16,
    g: val >> 8 & 0xFF,
    b: val & 0xFF
  };
}

});
