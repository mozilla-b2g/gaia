/* global
     Promise
*/
/* exported MockNavigation */

'use strict';

var MockNavigation = {
  back: () => Promise.resolve(),
  init: () => Promise.resolve(),
  isCurrentPanel: () => {},
  isDefaultPanel: () => false,
  toPanel: () => Promise.resolve(),
  setReady: () => {},
  on: () => {},
  off: () => {},
  once: () => {}
};
