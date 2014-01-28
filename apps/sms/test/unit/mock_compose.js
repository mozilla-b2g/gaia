/*exported MockCompose */

'use strict';

var MockCompose = {
  clear: function() {
    this.mEmpty = true;
  },

  focus: function() {},

  append: function(aContent) {
    this.mEmpty = false;
  },

  isEmpty: function() {
    return this.mEmpty;
  },

  getText: function() {},

  mEmpty: true,

  mSetup: function() {
    this.mEmpty = true;
  }
};
