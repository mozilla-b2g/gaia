/* global
     Promise
*/
/* exported MockNavigation */

'use strict';

var MockNavigation = {
  init: function() {},
  isCurrentPanel: function() {},
  isDefaultPanel: () => false,
  ensureCurrentPanel: () => Promise.resolve(),
  toPanel: function() { return Promise.resolve(); },
  toDefaultPanel: () => Promise.resolve(),
  getPanelName: () => '',
  on: () => {},
  off: () => {}
};
