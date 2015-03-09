'use strict';
(function() {

  // container for icc instances
  var iccs = {};
  var iccIds = [];

  var MockIccManager = {
    _eventListeners: {},
    get iccIds() {
      return iccIds;
    },
    addEventListener: function(type, callback) {
      if (!this._eventListeners[type]) {
        this._eventListeners[type] = [];
      }
      var eventLength = this._eventListeners[type].length;
      this._eventListeners[type][eventLength] = callback;
    },
    triggerEventListeners: function(type, evt) {
      evt = evt || {};
      evt.type = type;

      if (!this._eventListeners[type]) {
        return;
      }
      this._eventListeners[type].forEach(function(callback) {
        if (typeof callback === 'function') {
          callback(evt);
        } else if (typeof callback == 'object' &&
                   typeof callback.handleEvent === 'function') {
          callback.handleEvent(evt);
        }
      });
    },
    removeEventListener: function(type, callback) {
      if (this._eventListeners[type]) {
        var idx = this._eventListeners[type].indexOf(callback);
        this._eventListeners[type].splice(idx, 1);
      }
    },
    addIcc: function(id, object) {
      object = object || {};
      object.iccId = id;

      // override by default
      if (iccIds.indexOf(id) == -1) {
        iccIds.push(id);
      }
      iccs[id] = this._wrapIcc(object);
    },
    removeIcc: function(id) {
      var index = iccIds.indexOf(id);
      if (index >= 0) {
        iccIds.splice(index, 1);
      }
      if (iccs[id]) {
        delete iccs[id];
      }
    },
    getIccById: function(id) {
      if (id in iccs) {
        return iccs[id];
      }
      return;
    },
    // we will wrap icc to add some internal
    // methods that will be called outside
    _wrapIcc: function(object) {

      object.setCardLock = function(options) {
        var handlers = {
          error: {
            lockType: options.lockType,
            retryCount: object.retryCount
          }
        };

        // We can manipulate object here
        object._setCardLockOptions = options;
        object._setCardLockCachedHandlers = handlers;
        return handlers;
      };

      object.getCardLock = function(type) {
        object._getCardLockType = type;
        var obj = {
          onsuccess: null,
          result: {
            enabled: true
          }
        };
        setTimeout(function() {
          if (obj.onsuccess) {
            obj.onsuccess();
          }
        });
        return obj;
      };

      object.getCardLockRetryCount = function(type) {
        var req = {
          result: { retryCount: 3 }
        };
        setTimeout(function() {
          req.onsuccess && req.onsuccess();
        });
        return req;
      };

      object.unlockCardLock = function(options) {
        var req = {
          // fires success handler immediately
          set onsuccess(handler) {
            return handler();
          },
          get onsuccess() {
            return function() {};
          }
        };
        return req;
      };

      object.iccInfo = object.iccInfo || { msisdn: '0912345678' };
      object._eventListeners = {};

      object.addEventListener = function(type, callback) {
        if (!this._eventListeners[type]) {
          this._eventListeners[type] = [];
        }
        var eventLength = this._eventListeners[type].length;
        this._eventListeners[type][eventLength] = callback;
      };

      object.removeEventListener = function(type, callback) {
        if (this._eventListeners[type]) {
          var idx = this._eventListeners[type].indexOf(callback);
          this._eventListeners[type].splice(idx, 1);
        }
      };

      object.triggerEventListeners = function(type, evt) {
        if (!this._eventListeners[type]) {
          return;
        }
        this._eventListeners[type].forEach(function(callback) {
          if (typeof callback === 'function') {
            callback(evt);
          } else if (typeof callback == 'object' &&
                     typeof callback.handleEvent === 'function') {
            callback.handleEvent(evt);
          }
        });

        if (typeof object['on' + type] === 'function') {
          object['on' + type](evt);
        }
      };

      object.sendStkResponse = function() {};
      object.sendStkMenuSelection = function() {};
      object.sendStkEventDownload = function() {};

      return object;
    },
    mTeardown: function iccm_teardown() {
      iccIds = [];
      iccs = {};
    },

    // STK Constants
    STK_MENU_TYPE_NOT_SPECIFIED: 0x00,
    STK_MENU_TYPE_DATA_VALUES: 0x01,
    STK_MENU_TYPE_NAVIGATION_OPTIONS: 0x03,
    STK_BROWSER_MODE_LAUNCH_IF_NOT_ALREADY_LAUNCHED: 0x00,
    STK_BROWSER_MODE_USING_EXISTING_BROWSER: 0x02,
    STK_BROWSER_MODE_USING_NEW_BROWSER: 0x03,
    STK_CMD_REFRESH: 0x01,
    STK_CMD_POLL_INTERVAL: 0x03,
    STK_CMD_POLL_OFF: 0x04,
    STK_CMD_SET_UP_EVENT_LIST: 0x05,
    STK_CMD_SET_UP_CALL: 0x10,
    STK_CMD_SEND_SS: 0x11,
    STK_CMD_SEND_USSD: 0x12,
    STK_CMD_SEND_SMS: 0x13,
    STK_CMD_SEND_DTMF: 0x14,
    STK_CMD_LAUNCH_BROWSER: 0x15,
    STK_CMD_PLAY_TONE: 0x20,
    STK_CMD_DISPLAY_TEXT: 0x21,
    STK_CMD_GET_INKEY: 0x22,
    STK_CMD_GET_INPUT: 0x23,
    STK_CMD_SELECT_ITEM: 0x24,
    STK_CMD_SET_UP_MENU: 0x25,
    STK_CMD_PROVIDE_LOCAL_INFO: 0x26,
    STK_CMD_TIMER_MANAGEMENT: 0x27,
    STK_CMD_SET_UP_IDLE_MODE_TEXT: 0x28,
    STK_RESULT_OK: 0x00,
    STK_RESULT_PRFRMD_WITH_PARTIAL_COMPREHENSION: 0x01,
    STK_RESULT_PRFRMD_WITH_MISSING_INFO: 0x02,
    STK_RESULT_PRFRMD_WITH_ADDITIONAL_EFS_READ: 0x03,
    STK_RESULT_PRFRMD_ICON_NOT_DISPLAYED: 0x04,
    STK_RESULT_PRFRMD_LIMITED_SERVICE: 0x06,
    STK_RESULT_UICC_SESSION_TERM_BY_USER: 0x10,
    STK_RESULT_BACKWARD_MOVE_BY_USER: 0x11,
    STK_RESULT_NO_RESPONSE_FROM_USER: 0x12,
    STK_RESULT_HELP_INFO_REQUIRED: 0x13,
    STK_RESULT_USSD_SS_SESSION_TERM_BY_USER: 0x14,
    STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS: 0x20,
    STK_RESULT_NETWORK_CRNTLY_UNABLE_TO_PROCESS: 0x21,
    STK_RESULT_USER_NOT_ACCEPT: 0x22,
    STK_RESULT_USER_CLEAR_DOWN_CALL: 0x23,
    STK_RESULT_LAUNCH_BROWSER_ERROR: 0x26,
    STK_RESULT_BEYOND_TERMINAL_CAPABILITY: 0x30,
    STK_RESULT_CMD_TYPE_NOT_UNDERSTOOD: 0x31,
    STK_RESULT_CMD_DATA_NOT_UNDERSTOOD: 0x32,
    STK_RESULT_CMD_NUM_NOT_KNOWN: 0x33,
    STK_RESULT_SS_RETURN_ERROR: 0x34,
    STK_RESULT_SMS_RP_ERROR: 0x35,
    STK_RESULT_REQUIRED_VALUES_MISSING: 0x36,
    STK_RESULT_USSD_RETURN_ERROR: 0x37,
    STK_RESULT_MULTI_CARDS_CMD_ERROR: 0x38,
    STK_RESULT_USIM_CALL_CONTROL_PERMANENT: 0x39,
    STK_RESULT_BIP_ERROR: 0x3a,
    STK_EVENT_TYPE_MT_CALL: 0x00,
    STK_EVENT_TYPE_CALL_CONNECTED: 0x01,
    STK_EVENT_TYPE_CALL_DISCONNECTED: 0x02,
    STK_EVENT_TYPE_LOCATION_STATUS: 0x03,
    STK_EVENT_TYPE_USER_ACTIVITY: 0x04,
    STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE: 0x05,
    STK_EVENT_TYPE_CARD_READER_STATUS: 0x06,
    STK_EVENT_TYPE_LANGUAGE_SELECTION: 0x07,
    STK_EVENT_TYPE_BROWSER_TERMINATION: 0x08,
    STK_EVENT_TYPE_DATA_AVAILABLE: 0x09,
    STK_EVENT_TYPE_CHANNEL_STATUS: 0x0a,
    STK_EVENT_TYPE_SINGLE_ACCESS_TECHNOLOGY_CHANGED: 0x0b,
    STK_EVENT_TYPE_DISPLAY_PARAMETER_CHANGED: 0x0c,
    STK_EVENT_TYPE_LOCAL_CONNECTION: 0x0d,
    STK_EVENT_TYPE_NETWORK_SEARCH_MODE_CHANGED: 0x0e,
    STK_EVENT_TYPE_BROWSING_STATUS: 0x0f,
    STK_EVENT_TYPE_FRAMES_INFORMATION_CHANGED: 0x10,
    STK_SERVICE_STATE_NORMAL: 0x00,
    STK_SERVICE_STATE_LIMITED: 0x01,
    STK_SERVICE_STATE_UNAVAILABLE: 0x02,
    STK_TONE_TYPE_DIAL_TONE: 0x01,
    STK_TONE_TYPE_CALLED_SUBSCRIBER_BUSY: 0x02,
    STK_TONE_TYPE_CONGESTION: 0x03,
    STK_TONE_TYPE_RADIO_PATH_ACK: 0x04,
    STK_TONE_TYPE_RADIO_PATH_NOT_AVAILABLE: 0x05,
    STK_TONE_TYPE_ERROR: 0x06,
    STK_TONE_TYPE_CALL_WAITING_TONE: 0x07,
    STK_TONE_TYPE_RINGING_TONE: 0x08,
    STK_TONE_TYPE_GENERAL_BEEP: 0x10,
    STK_TONE_TYPE_POSITIVE_ACK_TONE: 0x11,
    STK_TONE_TYPE_NEGATIVE_ACK_TONE: 0x12,
    STK_TIME_UNIT_MINUTE: 0x00,
    STK_TIME_UNIT_SECOND: 0x01,
    STK_TIME_UNIT_TENTH_SECOND: 0x02,
    STK_LOCAL_INFO_LOCATION_INFO: 0x00,
    STK_LOCAL_INFO_IMEI: 0x01,
    STK_LOCAL_INFO_DATE_TIME_ZONE: 0x03,
    STK_LOCAL_INFO_LANGUAGE: 0x04,
    STK_TIMER_START: 0x00,
    STK_TIMER_DEACTIVATE: 0x01,
    STK_TIMER_GET_CURRENT_VALUE: 0x02

  };

  // add default Icc instance at first
  MockIccManager.addIcc('12345', {
    'cardState': 'ready'
  });

  window.MockNavigatorMozIccManager = MockIccManager;
})();
