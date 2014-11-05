'use strict';
/* exported MockCookie */

var MockCookie = {
  data: {},
  load: function() {
    return this.data;
  },
  update: function(obj) {
    this.data = obj;
  }
};
