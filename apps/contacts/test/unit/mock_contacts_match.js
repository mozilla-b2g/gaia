'use strict';
/* exported MockMatcher */

var MockMatcher = {
  match: function(contact, mode, cbs) {
    cbs.onmismatch();
  }
};
