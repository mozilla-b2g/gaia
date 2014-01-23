'use strict';

var MockCookie = {
  data: {},
  load: function() {},
  update: function(obj) {
    this.data = obj;
  }
};
