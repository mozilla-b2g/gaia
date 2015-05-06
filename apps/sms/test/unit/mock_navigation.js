/* global
     Promise
*/
/* exported MockNavigation */

'use strict';

var MockNavigation = {
  init: function() {},
  isCurrentPanel: function() {},
  ensureCurrentPanel: () => Promise.resolve(),
  toPanel: function() { return Promise.resolve(); },
  getPanelName: () => '',
  on: () => {},
  off: () => {}
};
