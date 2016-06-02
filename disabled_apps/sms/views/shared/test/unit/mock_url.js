/*exported MockURL */

'use strict';

var MockURL = {
  createObjectURL: function(url) {
    return url;
  },
  revokeObjectURL: function(url) {}
};
