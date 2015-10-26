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

  snapLeft: function st_snapLeft() {
  },
  snapInPlace: function st_snapInPlace() {
  },
  snapRight: function st_snapRight() {
  },

  mTeardown: function st_mTeardown() {
    this.transitioning = false;
  }
};
