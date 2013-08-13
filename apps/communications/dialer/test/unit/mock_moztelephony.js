'use strict';

var MockMozTelephony = {
  dial: function() {},
  dialEmergency: function() {},
  active: null,
  calls: [],

  mTriggerCallsChanged: function() {
    if (this.oncallschanged) {
      this.oncallschanged();
    }
  },

  mTeardown: function() {
    this.active = null;
    this.calls = [];
    this.mTriggerCallsChanged();
  }
};

