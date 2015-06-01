'use strict';

(function() {

  var listeners;

  function mnmt_init() {
    Mock.active = null;
    Mock.calls = [];
    Mock.conferenceGroup.state = null;
    Mock.conferenceGroup.calls = [];
    Mock.speakerEnabled = false;
    listeners = {};
  }

  function mnmt_addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function mnmt_removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  function mnmt_countEventListener(evtName, func) {
    var count = 0;
    var list = listeners[evtName];

    if (!list) {
      return count;
    }

    for (var i = 0; i < list.length; ++i) {
      if (list[i] === func) {
        count += 1;
      }
    }

    return count;
  }

  function mnmt_mTriggerEvent(evt) {
    var evtName = evt.type;
    if (listeners[evtName]) {
      listeners[evtName].forEach(function(listener) {
        if (listener.handleEvent) {
          listener.handleEvent(evt);
        } else {
          listener.call(Mock, evt);
        }
      });
    }
  }

  function mnmt_mSuiteTeardown() {
    Mock.oncallschanged = null;
    Mock.conferenceGroup.oncallschanged = null;
    Mock.conferenceGroup.onstatechange = null;
  }

  function mnmt_mTriggerCallsChanged() {
    if (Mock.oncallschanged) {
      Mock.oncallschanged();
    }

    mnmt_mTriggerEvent({ type: 'callschanged' });
  }

  function mnmt_mTriggerGroupCallsChanged() {
    if (Mock.conferenceGroup.oncallschanged) {
      Mock.conferenceGroup.oncallschanged();
      mnmt_mTriggerEvent('callschanged');
    }
  }

  function mnmt_mTriggerGroupStateChange() {
    if (Mock.conferenceGroup.onstatechange) {
      Mock.conferenceGroup.onstatechange();
      mnmt_mTriggerEvent('statechange');
    }
  }

  function mnmt_mTeardown() {
    mnmt_init();
    mnmt_mTriggerCallsChanged();
    mnmt_mTriggerGroupCallsChanged();
  }

  var Mock = {
    dial: function() { return {}; },
    dialEmergency: function() {},
    conferenceGroup: {
      hangUp: function() { return {}; },
      add: function() { return Promise.resolve(); },
      hold: function() {},
      resume: function() {},
      addEventListener: function() {},
      removeEventListener: function() {}
    },
    startTone: function(dtmfChar) {},
    stopTone: function() {},
    sendTones: function() {},

    addEventListener: mnmt_addEventListener,
    removeEventListener: mnmt_removeEventListener,
    mCountEventListener: mnmt_countEventListener,
    mTeardown: mnmt_mTeardown,
    mSuiteTeardown: mnmt_mSuiteTeardown,
    mTriggerEvent: mnmt_mTriggerEvent,
    mTriggerCallsChanged: mnmt_mTriggerCallsChanged,
    mTriggerGroupCallsChanged: mnmt_mTriggerGroupCallsChanged,
    mTriggerGroupStateChange: mnmt_mTriggerGroupStateChange
  };

  mnmt_init();

  window.MockNavigatorMozTelephony = Mock;
})();
