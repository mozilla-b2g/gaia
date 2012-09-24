/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

//  The CostControl service is in charge of keep the credit up to date with
//  periodic request to the credit service and to answers requests from
//  different points of the Cost Control application.
//
//  See service_utils.js for information about setService.
setService(function cc_setupCostControlService() {

  // Times and time-outs
  var WAITING_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  var REQUEST_BALANCE_UPDATE_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  var REQUEST_BALANCE_MAX_DELAY = 2 * 60 * 1000; // 2 minutes

  // Constants
  var PLAN_PREPAID = 'prepaid';
  var PLAN_POSTPAID = 'postpaid';

  var TRACKING_WEEKLY = 'weekly';
  var TRACKING_MONTHLY = 'monthly';
  var TRACKING_NEVER = 'never';

  // Critical settings (if no present or bad configured,
  // the service is unavailable)
  var _config = {};
  var _allSettings = [
    'ENABLE_ON',
    'CHECK_BALANCE_DESTINATION',
    'CHECK_BALANCE_TEXT',
    'CHECK_BALANCE_SENDERS',
    'CHECK_BALANCE_REGEXP',
    'TOP_UP_DESTINATION',
    'TOP_UP_TEXT',
    'TOP_UP_SENDERS',
    'TOP_UP_CONFIRMATION_REGEXP',
    'TOP_UP_INCORRECT_CODE_REGEXP'
  ];
  var _notEmptySettings = [
    'ENABLE_ON',
    'CHECK_BALANCE_DESTINATION',
    'CHECK_BALANCE_SENDERS',
    'TOP_UP_DESTINATION',
    'TOP_UP_SENDERS'
  ];

  // APIs
  var _sms = window.navigator.mozSms;
  var _conn = window.navigator.mozMobileConnection;
  var _telephony = window.navigator.mozTelephony;

  // CostControl application state
  var STATE_TOPPING_UP = 'toppingup';
  var STATE_UPDATING_BALANCE = 'updatingbalance';
  var _missconfigured = false;
  var _state = {};
  var _onSMSReceived = {};
  var _smsTimeout = {};
  var _enabledFunctionalities = {
    balance: false,
    telephony: false,
    datausage: false
  };

  // App settings object to control settings
  var _appSettings = (function cc_appSettings() {

    // Application settings
    var _cachedOptions = {
      'calltime': null,
      'lastbalance': null,
      'lastreset': null,
      'lowlimit': null,
      'lowlimit_threshold': null,
      'next_reset': null,
      'plantype': null,
      'reset_time': null,
      'smscount': null,
      'tracking_period': null
    };

    var _listeners = {};

    function _getInitializerFor(option) {
      return function(value) {
        _cachedOptions[option] = value;
        // Ensure regitered callbacks are informed the first time the settings
        // is set.
        var event = _newLocalSettingsChangeEvent(option, value, null);
        window.dispatchEvent(event);
      }
    }

    function _newLocalSettingsChangeEvent(key, value, oldValue) {
      return new CustomEvent('localsettingschanged', {
        detail: { key: key, value: value, oldValue: oldValue }
      });
    }

    // Call callback when the value for key is set
    function _observe(key, callback) {

      // Keep track of callbacks observing a key
      if (!_listeners.hasOwnProperty(key))
        _listeners[key] = [];

      if (_listeners[key].indexOf(callback) > -1)
        return;

      _listeners[key].push(callback);
      window.addEventListener('localsettingschanged',
                              function onLocalSettingsChanged(evt) {
                                if (evt.detail.key === key) {
                                  callback(evt.detail.value);
                                }
                              }
      );
      callback(_option(key));
    }

    // If only key is provided, the method return the current value for the
    // key. If both key and value are provided, the method sets the key to
    // that value.
    function _option(key, value) {
      var oldValue = _cachedOptions[key]; // retrieve from cache
      if (typeof value === 'undefined')
        return oldValue;

      asyncStorage.setItem(key, value, function dispatchSettingsChange() {
        _cachedOptions[key] = value; // update cache
        var event = _newLocalSettingsChangeEvent(key, value, oldValue);
        window.dispatchEvent(event);
      });
    }

    // Recover application settings from DB
    function _init() {
      for (var option in _cachedOptions) {
        asyncStorage.getItem(option, _getInitializerFor(option));
      }
    }

    _init();

    return {
      observe: _observe,
      option: _option
    };
  }());

  // Inner class: Balance.
  // Balance keeps an amount, a timestamp and a currency accesible by
  // properties with same names.
  function Balance(balance, timestamp) {
    this.balance = balance;
    this.timestamp = timestamp || new Date();
    this.currency = _config.CREDIT_CURRENCY;
  }

  // Returns stored balance
  function _getLastBalance() {
    return _appSettings.option('lastbalance');
  }

  // Return true if the widget has all the information required to
  // work.
  function _checkConfiguration() {
    // Check for all parameters
    var isAllSet = _allSettings.every(function cc_mandatory(name) {
      return name in _config;
    });

    if (!isAllSet)
      return false;

    // Check for not empty parameters
    var areSettingsValid = _notEmptySettings.every(
      function cc_notEmpty(name) {
        return !!_config[name];
      }
    );

    if (!areSettingsValid)
      return false;

    // All OK
    return true;
  }

  // Load the configuration file, then continue executing the afterCallback
  function _loadConfiguration(afterCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'js/config.json', true);
    xhr.send(null);

    xhr.onreadystatechange = function cc_loadConfiguration(evt) {
      if (xhr.readyState != 4)
        return;

      if (xhr.status == 0 || xhr.status == 200) {
        var config = JSON.parse(xhr.responseText);

        // Configure service
        _config.ENABLE_ON = config.enableon,

        _config.CREDIT_CURRENCY = config.credit.currency;

        _config.CHECK_BALANCE_DESTINATION = config.balance.destination;
        _config.CHECK_BALANCE_TEXT = config.balance.text;
        _config.CHECK_BALANCE_SENDERS = config.balance.senders;
        _config.CHECK_BALANCE_REGEXP = config.balance.regexp;

        _config.TOP_UP_DESTINATION = config.topup.destination;
        _config.TOP_UP_TEXT = config.topup.text;
        _config.TOP_UP_SENDERS = config.topup.senders;
        _config.TOP_UP_CONFIRMATION_REGEXP = config.topup.confirmation_regexp;
        _config.TOP_UP_INCORRECT_CODE_REGEXP =
          config.topup.incorrect_code_regexp;

        // Check for missconguration
        _missconfigured = !_checkConfiguration();
        if (_missconfigured) {
          console.error('Cost Control is missconfigured');
          return;
        }

        afterCallback();
      }
    }
  }

  // Attach event listeners for automatic updates:
  //  * Periodically
  function _configureBalance() {
    window.addEventListener('costcontrolperiodicallyupdate', _automaticCheck);
    window.setInterval(function cc_periodicUpdateBalance() {
      _dispatchEvent('costcontrolperiodicallyupdate');
    }, REQUEST_BALANCE_UPDATE_INTERVAL);

    _enabledFunctionalities.balance = true;
  }

  var _handledCalls = [];
  function _onCallsChanged(evt) {

    // Biiefly, see if there is a new ongoing (state === dialing) call and if
    // so, attach a an event when connected to annotate start time and attach
    // another when disconnecting to compute end time and the duration. Then
    // update calltime.
    _telephony.calls.forEach(function cc_eachCall(telCall) {
      // Abort if is not an outgoing call or is already handled
      if (telCall.state !== 'dialing' && _handledCalls.indexOf(telCall) > -1)
        return;

      // Keep track and attach callbacks
      _handledCalls.push(telCall);

      // Anotate start timestamp
      var starttime = null;
      telCall.onconnected = function cc_onTelCallConnected() {
        starttime = (new Date()).getTime();
      };

      // Duration and calltime update
      telCall.ondisconnected = function cc_onTelCallDisconnected() {
        // The call not even connected
        if (starttime === null)
          return;

        var now = (new Date()).getTime();
        var duration = now - starttime;
        setTimeout(function cc_updateCallTime() {
          var newCalltime = _appSettings.option('calltime') + duration;
          _appSettings.option('calltime', newCalltime);
        });

        // Remove from the already tracked calls
        _handledCalls.splice(_handledCalls.indexOf(telCall), 1);
      };
    });
  }

  // Count another SMS
  function _onSMSSent() {
    debug('Message sent!');
    _appSettings.option('smscount', _appSettings.option('smscount') + 1);
  }

  // Attach event listeners to telephony in order to count how many SMS has been
  // sent and how much time we talked since last reset.
  function _configureTelephony() {
    if (_appSettings.option('calltime') === null)
      _appSettings.option('calltime', 0);

    if (_appSettings.option('smscount') === null)
      _appSettings.option('smscount', 0);

    _telephony.oncallschanged = _onCallsChanged;
    _sms.onsent = _onSMSSent;

    _enabledFunctionalities.telephony = true;
  }

  // Recalculate the next automatic reset date in function of user preferences
  function _recalculateNextReset() {
    var trackingPeriod = _appSettings.option('tracking_period');
    if (trackingPeriod === TRACKING_NEVER) {
      _appSettings.option('next_reset', null);
      console.info('Automatic reset disabled');
      return;
    }

    var nextReset, today = new Date();

    // Recalculate with month period
    if (trackingPeriod === TRACKING_MONTHLY) {
      var month, year, monthday = parseInt(_appSettings.option('reset_time'));
      month = today.getMonth();
      year = today.getFullYear();
      if (today.getDate() >= monthday) {
        month = (month + 1) % 12;
        if (month === 0)
          year++;
      }
      nextReset = new Date(year, month, monthday);

    // Recalculate with week period
    } else {
      var oneDay = 24 * 60 * 60 * 1000;
      var weekday = parseInt(_appSettings.option('reset_time'));
      var daysToTarget = weekday - today.getDay();
      if (daysToTarget <= 0)
        daysToTarget = 7 + daysToTarget;
      nextReset = new Date();
      nextReset.setTime(nextReset.getTime() + oneDay * daysToTarget);
    }

    _appSettings.option('next_reset', nextReset);
  }

  function _resetStats() {
    CostControl.settings.option('smscount', 0);
    CostControl.settings.option('calltime', 0);
    CostControl.settings.option('lastreset', new Date());
  }

  // Check if we met the next reset, if so, reset an recalculate
  function _checkForNextReset() {
    var nextReset = CostControl.settings.option('next_reset') || null;
    if (!nextReset)
      return;

    nextReset = new Date(nextReset);
    if ((new Date()).getTime() >= nextReset.getTime()) {
      _resetStats();
      _recalculateNextReset();
    }
  }

  var _resetCheckTimeout = 0;
  // Attach listeners to ensure the proper automatic reset date
  function _configureDataUsage() {

    // Schedule autoreset

    // Get milliseconds from now until tomorrow at 00:00
    function timeUntilTomorrow() {
      var today = new Date();
      var tomorrow = (new Date());
      tomorrow.setTime(today.getTime() + oneDay); // this is tomorrow
      tomorrow = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate()
      );                                            // this is tomorrow at 00:00
      return tomorrow.getTime() - today.getTime();
    }
    var oneDay = 24 * 60 * 60 * 1000;

    // Check if we already met the reset date
    _checkForNextReset();

    // Launch tomorrow at 00:00
    var firstTimeout = timeUntilTomorrow();
    _resetCheckTimeout = setTimeout(function ccapp_firstCheck() {
      _checkForNextReset();

      // Launch in the following 24h
      _resetCheckTimeout = setInterval(function ccapp_nextCheck() {
        _checkForNextReset();
      }, oneDay);

    }, firstTimeout);

    // Observe settings that imply next reset recalculation
    _appSettings.observe('tracking_period', _recalculateNextReset);
    _appSettings.observe('reset_time', _recalculateNextReset);

    debug('Next check in ' + Math.ceil(firstTimeout / 60000) + ' minutes');

    _enabledFunctionalities.datausage = true;
  }

  // Check if the pair MCC/MNC of the SIM matches some of enabling conditions
  function _checkEnableConditions() {
    var simMCC = _conn.iccInfo.mcc;
    var simMNC = _conn.iccInfo.mnc;
    var matchedMCC = _config.ENABLE_ON ? _config.ENABLE_ON[simMCC] : null;
    if (!matchedMCC || !matchedMCC.length)
      return false;

    return matchedMCC.indexOf(simMNC) !== -1;
  }

  // Initializes the cost control module:
  // critical parameters, automatic updates and state-dependant settings
  function _init() {
    _loadConfiguration(function cc_afterConfiguration() {

      _configureDataUsage();
      console.info('Cost Control: data usage enabled.');

      if (_checkEnableConditions()) {
        _configureBalance();
        _configureTelephony();
        console.info('Cost Control: valid SIM card for balance and telephony.');
      } else {
        console.warn(
          'Cost Control: non valid SIM card for balance nor telephony.');
      }

      // State dependant settings allow simultaneous updates and topping up tasks
      _state[STATE_UPDATING_BALANCE] = false;
      _state[STATE_TOPPING_UP] = false;
      _smsTimeout[STATE_UPDATING_BALANCE] = 0;
      _smsTimeout[STATE_TOPPING_UP] = 0;
      _onSMSReceived[STATE_UPDATING_BALANCE] = _onBalanceSMSReceived;
      _onSMSReceived[STATE_TOPPING_UP] = _onConfirmationSMSReceived;

      // If data or voice change
      _conn.onvoicechange = _dispatchServiceStatusChangeEvent;
      _conn.ondatachange = _dispatchServiceStatusChangeEvent;

    });
  }

  // Return a status object with three fields:
  //  - 'availability': true or false if the Cost Control module can
  //    properly work.
  //  - 'roaming': if availability is true, roaming can be true or false
  //  - 'detail': if availability is false, this value try to explain why
  //     and can be:
  //      'no-mobile-connection-api' -> if MobileConnection API is not available
  //      'missed-apis-voice-or-data' -> voice or data interfaces are not
  //      available
  //      'no-coverage' -> if there is no coverage
  //      'missconfigured' -> if some essential configuration parameter is
  //      missed or unproperly set
  //      'carrier-unknown' -> if we cannot detect the carrier
  //  - 'enabledFunctionalities': is an object with three boolean fields
  //    pointing which functionalities are enabled: balance, telephony and
  //    datausage
  function _getServiceStatus() {
    var status = {
      availability: false, roaming: null, detail: null,
      enabledFunctionalities : {
        balance: _enabledFunctionalities.balance,
        telephony: _enabledFunctionalities.telephony,
        datausage: _enabledFunctionalities.datausage
      }
    };

    if (!_conn) {
      status.detail = 'no-mobile-connection-api';
      return status;
    }

    var voice = _conn.voice;
    var data = _conn.data;
    if (!voice || !data) {
      status.detail = 'missed-apis-voice-or-data';
      return status;
    }

    if (voice.signalStrength === null) {
      status.detail = 'no-coverage';
      return status;
    }

    if (_missconfigured) {
      status.detail = 'missconfigured';
      return status;
    }

    if (!data.network.shortName) {
      status.detail = 'carrier-unknown';
      return status;
    }

    // All depends on balance functionality is enabled or not
    if (_enabledFunctionalities.balance) {
      status.availability = true;
      status.roaming = voice.roaming;
    }

    return status;
  }

  // Handle the events that triggers automatic balance updates
  function _automaticCheck(evt) {
    debug('Event listened: ' + evt.type);

    // Ignore if the device is in roaming
    var service = _getServiceStatus();
    if (service.roaming) {
      console.warn('Device in roaming, no automatic updates allowed');
      return;
    }

    switch (evt.type) {
      // Periodically updates
      case 'costcontrolperiodicallyupdate':

        // Abort if it have not passed enough time since last update
        var balance = _getlastbalance();
        var lastUpdate = balance ? balance.timestamp : null;
        var now = (new Date()).getTime();
        if (lastUpdate === null ||
            (now - lastUpdate > REQUEST_BALANCE_MAX_DELAY))
          _updateBalance();

        break;
    }
  }

  // Return the balance from the message or null if impossible to parse
  function _parseBalanceSMS(message) {
    var newBalance = null;
    var found = message.body.match(
      new RegExp(_config.CHECK_BALANCE_REGEXP));

    // Impossible to parse
    if (!found || found.length < 2) {
      console.warn('Impossible to parse balance message.');

    // Parsing succsess
    } else {
      var integer = found[1];
      var decimal = found[2] || '0';
      newBalance = parseFloat(integer + '.' + decimal);
    }

    return newBalance;
  }

  // Return a string indicating the type of SMS identified:
  // 'confirmation' or 'incorrect-code'.
  //
  // It returns 'unknown' if it can not recognize it at all.
  function _recognizeReceivedSMS(message) {
    var found = message.body.match(
      new RegExp(_config.TOP_UP_CONFIRMATION_REGEXP, 'i'));
    if (found)
      return 'confirmation';

    found = message.body.match(
      new RegExp(_config.TOP_UP_INCORRECT_CODE_REGEXP, 'i'));
    if (found)
      return 'incorrect-code';

    return 'unknown';
  }

  // When a message is received, the function tries to parse the credit
  // from the message. If not possible, the message is ignored.
  function _onBalanceSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (_config.CHECK_BALANCE_SENDERS.indexOf(message.sender) === -1)
      return;

    var newBalance = _parseBalanceSMS(message);

    // As we dont know how many messages we receive, we can just ignore this
    // and continue waiting for the right one.
    if (newBalance === null)
      return;

    _stopWaiting(STATE_UPDATING_BALANCE);
    var now = new Date();
    var balance = new Balance(newBalance, now);
    _dispatchEvent(_getEventName(STATE_UPDATING_BALANCE, 'success'), balance);

    // Store values
    _appSettings.option('lastbalance', balance);
  }

  // When a message is received, the function tries to recognize
  // if the message is a confirmation or error message. Depending on the
  // nature of the message, the function will dispatch success or error
  // events.
  function _onConfirmationSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (_config.TOP_UP_SENDERS.indexOf(message.sender) === -1)
      return;

    var messageType = _recognizeReceivedSMS(message);

    // As we dont know how many messages we receive, we can just ignore this
    // and continue waiting for the right one.
    if (messageType === 'unknown')
      return;

    _stopWaiting(STATE_TOPPING_UP);
    if (messageType === 'confirmation') {
      _dispatchEvent(_getEventName(STATE_TOPPING_UP, 'success'));

    } else {
      _dispatchEvent(
        _getEventName(STATE_TOPPING_UP, 'error'),
        { reason: 'incorrect-code'}
      );
    }
  }

  // Start waiting for SMS
  function _startWaiting(mode) {
    _state[mode] = true;
    _sms.addEventListener('received', _onSMSReceived[mode]);
    _smsTimeout[mode] = window.setTimeout(
      function cc_onTimeout() {
        debug('Timing out for ' + mode);
        _dispatchEvent(_getEventName(mode, 'error'), { reason: 'timeout' });
        _stopWaiting(mode);
      },
      WAITING_TIMEOUT
    );
    _dispatchEvent(_getEventName(mode, 'start'));
    debug('Start waiting for ' + mode);
  }

  // Disable waiting for SMS
  function _stopWaiting(mode) {
    _dispatchEvent(_getEventName(mode, 'finish'));
    window.clearTimeout(_smsTimeout[mode]);

    _state[mode] = false;
    _sms.removeEventListener('received', _onSMSReceived[mode]);
    debug('Stop waiting for ' + mode);
  }

  // Start an update balance request. In case of error or success, the proper
  // events will be dispatched to the listeners set by setBalanceCallbacks()
  // method.
  function _updateBalance() {
    // Abort if other operation in progress
    if (_state[STATE_UPDATING_BALANCE]) {
      debug('Already updating, ignoring...');
      return;
    }

    // Error if system is not available
    var status = _getServiceStatus();
    if (!status.availability) {
      _dispatchEvent(_getEventName(STATE_UPDATING_BALANCE, 'error'),
        { reason: 'service-unavailable-' + status.detail });
      return;
    }

    // Send the request SMS
    var request = _sms.send(
      _config.CHECK_BALANCE_DESTINATION,
      _config.CHECK_BALANCE_TEXT
    );
    request.onsuccess = function cc_onSuccessSendingBalanceRequest() {
      _startWaiting(STATE_UPDATING_BALANCE);
    }
    request.onerror = function cc_onRequestError() {
      _dispatchEvent(_getEventName(STATE_UPDATING_BALANCE, 'error'),
        { reason: 'sending-error' });
    };
  }

  // Start a top up request. In case of error or success, the proper
  // events will be dispatched to the listeners set by setTopUpCallbacks()
  // method.
  function _topUp(code) {
    if (!code || _state[STATE_TOPPING_UP]) {
      debug('Already topping up, ignoring...');
      return;
    }

    // Compose topup message and send
    var messageBody = _config.TOP_UP_TEXT.replace('&code', code);
    var request = _sms.send(_config.TOP_UP_DESTINATION, messageBody);
    request.onsuccess = function cc_onSuccessSendingTopup() {
      _startWaiting(STATE_TOPPING_UP);
    }
    request.onerror = function cc_onErrorSendingTopup() {
      _dispatchEvent(_getEventName(STATE_TOPPING_UP, 'error'),
        { reason: 'sending-error' });
    }
  }

  var _lastServiceStatusHash = '';

  // Helper to dispatch a custom event with the new status of the service
  //
  // This helper is actually the callback for changing voice or telephony,
  // part of the mozMobileConnection API. Note not all changes in these
  // objects result in a state change so we keep a unique hash for every
  // status in order to compare if the service status has really changed.
  function _dispatchServiceStatusChangeEvent() {
    var newServiceStatus = _getServiceStatus();
    var newServiceStatusHash = JSON.stringify(newServiceStatus);

    // Abort if the status has not really change
    if (_lastServiceStatusHash === newServiceStatusHash)
      return;

    _lastServiceStatusHash = newServiceStatusHash;
    var event = new CustomEvent('costcontrolservicestatuschange', {
      detail: newServiceStatus
    });
    window.dispatchEvent(event);
    debug('CostControl Event: costcontrolservicestatuschange: ' +
          newServiceStatusHash);
  }

  // Helper to dispatch custom events, provide type and the detail object
  function _dispatchEvent(type, detail) {
    var event = new CustomEvent(type, {detail: detail || null});
    window.dispatchEvent(event);
    debug('CostControl Event: ' + type + ': ' + JSON.stringify(detail));
  }

  // Get the event name as concatenation between a root determined by mode
  // (STATE_UPDATING_BALANCE, STATE_TOPPING_UP) and a provided suffix.
  function _getEventName(mode, suffix) {
    suffix = suffix || '';
    var root;
    if (mode === STATE_UPDATING_BALANCE) {
      root = 'costcontrolbalanceupdate';
    } else {
      root = 'costcontroltopup';
    }

    return root + suffix;
  }

  // Assign callbacks to the proper events
  function _bindCallbacks(state, callbacks) {
    var eventTypes = ['success', 'error', 'start', 'finish'];
    eventTypes.forEach(function cc_bindEventType(type) {
      window.addEventListener(_getEventName(state, type),
                              (callbacks['on' + type] || null)
      );
    });
  }

  // Register callbacks to invoke when updating balance
  function _setBalanceCallbacks(callbacks) {
    _bindCallbacks(STATE_UPDATING_BALANCE, callbacks);
  }

  // Register callbacks to invoke whent topping up
  function _setTopUpCallbacks(callbacks) {
    _bindCallbacks(STATE_TOPPING_UP, callbacks);
  }

  function _setServiceStatusChangeCallback(callback) {
    window.addEventListener('costcontrolservicestatuschange', callback);
  }

  return {
    init: _init,
    setBalanceCallbacks: _setBalanceCallbacks,
    setTopUpCallbacks: _setTopUpCallbacks,
    set onservicestatuschange(callback) {
      _setServiceStatusChangeCallback(callback);
    },
    requestBalance: _updateBalance,
    requestTopUp: _topUp,
    getLastBalance: _getLastBalance,
    getServiceStatus: _getServiceStatus,
    getRequestBalanceMaxDelay: function cc_getRequestBalanceMaxDelay() {
      return REQUEST_BALANCE_MAX_DELAY;
    },
    getLowLimitThreshold: function cc_getLowLimitThreshold() {
      return _appSettings.option('lowlimit_threshold');
    },
    getTopUpTimeout: function cc_getTopUpTimeout() {
      return WAITING_TIMEOUT;
    },
    get settings() {
      return _appSettings;
    },

    PLAN_PREPAID: PLAN_PREPAID,
    PLAN_POSTPAID: PLAN_POSTPAID,
    TRACKING_WEEKLY: TRACKING_WEEKLY,
    TRACKING_MONTHLY: TRACKING_MONTHLY,
    TRACKING_NEVER: TRACKING_NEVER
  };
}());
window[SERVICE_NAME].init();

// See service_utils.js for information
nowIAmReady();
