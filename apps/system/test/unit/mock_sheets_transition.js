'use strict';
/* exported MockSheetsTransition */

var MockSheetsTransition = {
  transitioning: false,
  begin: function st_begin() {
  },

  moveInDirection: function st_moveInDirection(direction, progress) {
  },

  end: function st_end(callback) {
    if (callback) {
      setTimeout(callback);
    }
  },

  snapBack: function st_snapBack() {
  },
  snapInPlace: function st_snapInPlace() {
  },
  snapForward: function st_snapForward() {
  },

  mTeardown: function st_mTeardown() {
    this.transitioning = false;
  }
};
