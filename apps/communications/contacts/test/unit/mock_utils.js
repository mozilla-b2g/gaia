'use strict';

var MockURL = {
  createObjectURL: function(url) {
    return url;
  },

  revokeObjectURL: function(url) {
    // do nothing
  }
};

var MockUtils = {
  'misc' : {
    'toMozContact': function(c) {
      return c;
    }
  }
};
