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
  var LOW_LIMIT_THRESHOLD = 40;

  // Critical settings (if no present or bad configured,
  // the service is unavailable)
  var _settings = {};
  var _allSettings = [
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
    'CHECK_BALANCE_DESTINATION',
    'CHECK_BALANCE_SENDERS',
    'TOP_UP_DESTINATION',
    'TOP_UP_SENDERS'
  ];

  // APIs
  var _sms = window.navigator.mozSms;
  var _conn = window.navigator.mozMobileConnection;

  // CostControl application state
  var STATE_TOPPING_UP = 'toppingup';
  var STATE_UPDATING_BALANCE = 'updatingbalance';
  var _state = {};
  var _onSMSReceived = {};
  var _smsTimeout = {};

  // Inner class: Balance.
  // Balance keeps an amount, a timestamp and a currency accesible by
  // properties with same names.
  function Balance(balance, timestamp) {
    this.balance = balance;
    this.timestamp = timestamp || new Date();
    this.currency = _settings.CREDIT_CURRENCY;
  }

  // The reviver to deserialize a Balance object in JSON.
  Balance.reviver = function cc_BalanceReviver(key, value) {
    switch (key) {
      case 'timestamp':
        return new Date(value);

      default:
        return value;
    }
  };

  // Returns stored balance
  function _getLastBalance() {
    var balance = window.localStorage.getItem('lastBalance');
    balance = (balance !== null) ? JSON.parse(balance, Balance.reviver) : null;
    return balance;
  }

  // Return true if the widget has all the information required to
  // work.
  function _checkConfiguration() {
    // Check for all parameters
    var isAllSet = _allSettings.every(function cc_mandatory(name) {
      return name in _settings;
    });

    if (!isAllSet)
      return false;

    // Check for not empty parameters
    var areSettingsValid = _notEmptySettings.every(
      function cc_notEmpty(name) {
        return !!_settings[name];
      }
    );

    if (!areSettingsValid)
      return false;

    // All OK
    return true;
  }

  // Enable observers for the basic parameters of the cost control
  function _configureSettings() {

    // Use when simple data type property
    function assignTo(name) {
      return function cc_configure_assignTo(value) {
        _settings[name] = value;
        debug(name + ': ' + _settings[name]);
      }
    }

    // Use when JSON property
    function parseAndAssignTo(name) {
      return function cc_configure_parseAndAssignTo(value) {
        _settings[name] = JSON.parse(value);
        debug(name + ': ' + _settings[name]);
      }
    }

    // Credit stuff
    SettingsListener.observe('costcontrol.credit.currency', 'R$',
      assignTo('CREDIT_CURRENCY'));

    // For balance
    // Send to...
    SettingsListener.observe('costcontrol.balance.destination', '8000',
      assignTo('CHECK_BALANCE_DESTINATION'));

    // Text to send
    SettingsListener.observe('costcontrol.balance.text', '',
      assignTo('CHECK_BALANCE_TEXT'));

    // Wait from...
    SettingsListener.observe('costcontrol.balance.senders', '["1515"]',
      parseAndAssignTo('CHECK_BALANCE_SENDERS'));

    // Parse following...
    SettingsListener.observe('costcontrol.balance.regexp',
      'R\\$\\s+([0-9]+)(?:[,\\.]([0-9]+))?',
      assignTo('CHECK_BALANCE_REGEXP'));

    // For top up
    // Send to...
    SettingsListener.observe('costcontrol.topup.destination', '7000',
      assignTo('TOP_UP_DESTINATION'));

    // Balance text
    SettingsListener.observe('costcontrol.topup.text', '&code',
      assignTo('TOP_UP_TEXT'));

    // Wait from...
    SettingsListener.observe('costcontrol.topup.senders', '["1515","7000"]',
      parseAndAssignTo('TOP_UP_SENDERS'));

    // Parse confirmation following...
    SettingsListener.observe('costcontrol.topup.confirmation_regexp',
      'Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?',
      assignTo('TOP_UP_CONFIRMATION_REGEXP'));

    // Recognize incorrect code following...
    SettingsListener.observe('costcontrol.topup.incorrect_code_regexp',
      '(envie novamente|Verifique) o codigo de recarga',
      assignTo('TOP_UP_INCORRECT_CODE_REGEXP'));
  }

  // Attach event listeners for automatic updates:
  //  * Periodically
  function _configureAutomaticUpdates() {
    window.addEventListener('costcontrolperiodicallyupdate', _automaticCheck);
    window.setInterval(function cc_periodicUpdateBalance() {
      _dispatchEvent('costcontrolperiodicallyupdate');
    }, REQUEST_BALANCE_UPDATE_INTERVAL);
  }

  // Initializes the cost control module:
  // critical parameters, automatic updates and state.dependant settings
  function _init() {
    _configureSettings();
    _configureAutomaticUpdates();

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
  function _getServiceStatus() {
    var status = { availability: false, roaming: null, detail: null };

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

    if (!_checkConfiguration()) {
      status.detail = 'missconfigured';
      return status;
    }

    if (!data.network.shortName) {
      status.detail = 'carrier-unknown';
      return status;
    }

    // All Ok
    status.availability = true;
    status.roaming = voice.roaming;
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
        var balance = _getLastBalance();
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
      new RegExp(_settings.CHECK_BALANCE_REGEXP));

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
      new RegExp(_settings.TOP_UP_CONFIRMATION_REGEXP, 'i'));
    if (found)
      return 'confirmation';

    found = message.body.match(
      new RegExp(_settings.TOP_UP_INCORRECT_CODE_REGEXP, 'i'));
    if (found)
      return 'incorrect-code';

    return 'unknown';
  }

  // When a message is received, the function tries to parse the credit
  // from the message. If not possible, the message is ignored.
  function _onBalanceSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (_settings.CHECK_BALANCE_SENDERS.indexOf(message.sender) === -1)
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
    window.localStorage.setItem('lastBalance', JSON.stringify(balance));
  }

  // When a message is received, the function tries to recognize
  // if the message is a confirmation or error message. Depending on the
  // nature of the message, the function will dispatch success or error
  // events.
  function _onConfirmationSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (_settings.TOP_UP_SENDERS.indexOf(message.sender) === -1)
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
      _settings.CHECK_BALANCE_DESTINATION,
      _settings.CHECK_BALANCE_TEXT
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
    var messageBody = _settings.TOP_UP_TEXT.replace('&code', code);
    var request = _sms.send(_settings.TOP_UP_DESTINATION, messageBody);
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
    var event = new CustomEvent(
      'costcontrolservicestatuschange',
      {detail: _getServiceStatus() }
    );
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
        (callbacks['on' + type] || null));
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
      return LOW_LIMIT_THRESHOLD;
    }
  };
}());
window[SERVICE_NAME].init();

// See service_utils.js for information
nowIAmReady();
