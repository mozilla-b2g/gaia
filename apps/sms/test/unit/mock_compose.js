'use strict';

var MockCompose = {
  clear: function() {},
  focus: function() {},
  append: function() {},
  isEmpty: function() {
    return this.mEmpty;
  },
  mEmpty: true,
  mSetup: function() {
    this.mEmpty = true;
  }
};
