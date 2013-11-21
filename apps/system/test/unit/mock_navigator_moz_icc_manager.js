'use strict';

(function(window) {
  function MockMozIcc() {
    var props = {'cardState': 'ready', 'iccInfo': {}};
    var eventListeners = {'cardstatechange': [], 'iccinfochange': []};

    function mmi_addEventListener(type, callback) {
      if (eventListeners[type]) {
        eventListeners[type][eventListeners[type].length] = callback;
      }
    }

    function mmi_removeEventListener(type, callback) {
      if (eventListeners[type]) {
        var idx = eventListeners[type].indexOf(callback);
        eventListeners[type].splice(idx, 1);
      }
    }

    function mmi_triggerEventListeners(type, evt) {
      if (!eventListeners[type]) {
        return;
      }
      eventListeners[type].forEach(function(callback) {
        if (typeof callback === 'function') {
          callback(evt);
        } else if (typeof callback == 'object' &&
                   typeof callback['handleEvent'] === 'function') {
          callback['handleEvent'](evt);
        }
      });

      if (typeof _mock['on' + type] === 'function') {
        _mock['on' + type](evt);
      }
    }

    var _mock = {
      get cardState() {
        return props['cardState'];
      },
      get iccInfo() {
        return props['iccInfo'];
      },
      addEventListener: mmi_addEventListener,
      removeEventListener: mmi_removeEventListener,
      mTriggerEventListeners: mmi_triggerEventListeners,
      get mProps() {
        return props;
      },
      get mEventListeners() {
        return eventListeners;
      }
    };

    return _mock;
  }

  function MockMozIccManager() {
    var iccIds = [];
    var icc = MockMozIcc();

    function micm_getIccById(iccId) {
      return icc;
    }

    var _mock = {
      getIccById: micm_getIccById,
      get mMockIcc() {
        return icc;
      }
    };

    return _mock;
  }

  window.MockNavigatorMozIccManager = MockMozIccManager();
})(this);
