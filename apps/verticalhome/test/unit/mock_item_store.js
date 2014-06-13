'use strict';

function MockItemStore() {}

MockItemStore.prototype = {
  mNextPosition: 0,
  applicationSource: {},
  bookmarkSource: {},
  collectionSource: {},
  all: function() {},
  getNextPosition: function() {
    var nextPosition = this.mNextPosition;
    this.mNextPosition++;
    return nextPosition;
  }
};
