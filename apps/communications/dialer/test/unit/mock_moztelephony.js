'use strict';

var MockMozTelephony = {
  dial: function() {},
  dialEmergency: function() {},
  active: null,
  calls: [],
  conferenceGroup: {
    state: null,
    calls: [],
    hold: function() {},
    resume: function() {}
  },
  speakerEnabled: false,

  mTriggerCallsChanged: function() {
    if (this.oncallschanged) {
      this.oncallschanged();
    }
  },

  mTriggerGroupCallsChanged: function() {
    if (this.conferenceGroup.oncallschanged) {
      this.conferenceGroup.oncallschanged();
    }
  },

  mTriggerGroupStateChange: function() {
    if (this.conferenceGroup.onstatechange) {
      this.conferenceGroup.onstatechange();
    }
  },

  mTeardown: function() {
    this.active = null;
    this.calls = [];
    this.conferenceGroup.calls = [];
    this.conferenceGroup.state = null;
    this.speakerEnabled = false;
    this.mTriggerCallsChanged();
    this.mTriggerGroupCallsChanged();
  },

  mSuiteTeardown: function() {
    this.oncallschanged = null;
    this.conferenceGroup.oncallschanged = null;
    this.conferenceGroup.onstatechange = null;
  }
};

// Should be called in the context of a suite
function telephonyAddCall(mockCall, opt) {
  MockMozTelephony.calls.push(mockCall);

  var handledCall = new MockHandledCall(mockCall);

  // not already stubed
  if (!('restore' in HandledCall)) {
    this.sinon.stub(window, 'HandledCall');
  }
  HandledCall.withArgs(mockCall).returns(handledCall);

  if (opt && opt.trigger) {
    MockMozTelephony.mTriggerCallsChanged();
  }

  return handledCall;
}

/* Should be called in the context of a suite after one call has already been
 * added via telephonyAddCall(). */
function telephonyAddCdmaCall(number, opt) {
  MockMozTelephony.calls[0].secondNumber = number;
  MockMozTelephony.calls[0].state = 'connected';

  if (opt && opt.trigger) {
    MockMozTelephony.mTriggerCallsChanged();
  }
}
