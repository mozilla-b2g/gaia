'use strict';

var MockCompose = {
  append: function() {},
  isEmpty: function() {
    return this.mEmpty;
  },
  mEmpty: true,
  mSetup: function() {
    this.mEmpty = true;
  }
};
