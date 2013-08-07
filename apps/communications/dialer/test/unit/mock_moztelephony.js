'use strict';

var MockMozTelephony = {
  dial: function() {},
  dialEmergency: function() {},
  active: null,
  calls: null,

  mTeardown: function() {
    this.active = null;
    this.calls = null;
  }
};

