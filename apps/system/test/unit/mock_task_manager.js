/* exported MockTaskManager */

'use strict';

function MockTaskManager() {
  this.is_shown = false;
}

MockTaskManager.prototype = {
  start: function() {},
  show: function() { this.is_shown = true; },
  hide: function() { this.is_shown = false; },
  isShown: function() { return this.is_shown; }
};
