'use strict';

var MockMatcher = {
  match: function(contact, mode, cbs) {
    cbs.onmismatch();
  }
};
