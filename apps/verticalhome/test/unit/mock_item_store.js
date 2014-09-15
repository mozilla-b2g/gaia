'use strict';

function MockItemStore() {}

MockItemStore.prototype = {
  mNextPosition: 0,
  all: function() {},
  deferredSave: function() {},
  getNextPosition: function() {
    var nextPosition = this.mNextPosition;
    this.mNextPosition++;
    return nextPosition;
  }
};
