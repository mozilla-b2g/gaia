/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

setService(function() {
  var _fakeLastBalance = _getLastBalance();
  var _fakeCredit = _fakeLastBalance ? _fakeLastBalance.balance : 12.34;

  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var WAITING_TIMEOUT = 1 * 30 * 1000; // 5 minutes
  var REQUEST_BALANCE_UPDATE_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  var REQUEST_BALANCE_MAX_DELAY = 2 * 60 * 1000; // 2 minutes

  var STATE_IDLE = 'idle';
  var STATE_TOPPING_UP = 'toppingup';
  var STATE_CHECKING = 'checking';

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

  var _sms = window.navigator.mozSms;
  var _onSMSReceived = {};
  var _state = {};
  var _smsTimeout = {};

  // Balance constructor
  function Balance(balance, timestamp) {
    this.balance = balance;
    this.timestamp = timestamp || new Date();
    this.currency = _settings.CREDIT_CURRENCY;
  }

  Balance.reviver = function cc_BalanceReviver(key, value) {
    switch(key) {
      case 'timestamp':
        return new Date(value);

      default:
        return value;
    }
  };

  // Return true if the widget has all the information required to
  // work. Return false elsewhere.
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

    function assignTo(name) {
      return function cc_configure_assignTo(value) {
        _settings[name] = value;
        console.log(name + ': ' + _settings[name]);
      }
    }

    function parseAndAssignTo(name) {
      return function cc_configure_parseAndAssignTo(value) {
        _settings[name] = JSON.parse(value);
        console.log(name + ': ' + _settings[name]);
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

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {
    _configureSettings();
    _configureAutomaticUpdates();

    _state[STATE_CHECKING] = false;
    _state[STATE_TOPPING_UP] = false;
    _smsTimeout[STATE_CHECKING] = 0;
    _smsTimeout[STATE_TOPPING_UP] = 0;
    _onSMSReceived[STATE_CHECKING] = _onBalanceSMSReceived;
    _onSMSReceived[STATE_TOPPING_UP] = _onConfirmationSMSReceived;
  }

  function _dispatchEvent(type, detail) {
    var event = new CustomEvent(type, {detail: detail || null});
    window.dispatchEvent(event);
  }

  // Return true if the device is in roaming
  function _inRoaming() {
    var conn = window.navigator.mozMobileConnection;
    var voice = conn.voice;
    return voice.roaming;
  }

  // Handle the events that triggers automatic balance updates
  function _automaticCheck(evt) {
    console.log('Evento escuchado: ' + evt.type);

    // Ignore if the device is in roaming
    if (_inRoaming()) {
      console.warn('Device in roaming, no automatic updates allowed');
      return;
    }

    switch (evt.type) {
      // Periodically updates
      case 'costcontrolperiodicallyupdate':

        // Abort if it have not passed enough time since last update
        var lastUpdated = window.localStorage.getItem('costcontrolTime');
        if (lastUpdated !== null)
          lastUpdated = (new Date(lastUpdated)).getTime();

        var now = (new Date()).getTime();
        if (now - lastUpdated > REQUEST_BALANCE_MAX_DELAY)
          _updateBalance();

        break;

    }
  }

  // Return the balance from the message or null if impossible to parse
  function _parseBalanceSMS(message) {
    var newBalance = null;
    var found = message.body.match(
      new RegExp(_settings.CHECK_BALANCE_REGEXP));

    // Impossible parse
    if (!found || found.length < 2) {
      console.warn('Impossible to parse balance message.')

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
  // It returns 'unknown' if it can not recognize it.
  function _recognizeReceivedSMS(message) {
    var found = message.body.match(
      new RegExp(_settings.TOP_UP_CONFIRMATION_REGEXP, "i"));
    if (found)
      return 'confirmation';

    found = message.body.match(
      new RegExp(_settings.TOP_UP_INCORRECT_CODE_REGEXP, "i"));
    if (found)
      return 'incorrect-code';

    return 'unknown';
  }

  // What happend when the balance SMS is received
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

    _stopWaiting();
    var now = new Date();
    var balance = new Balance(newBalance, now);
    _dispatchEvent('costcontrolbalanceupdatesuccess', balance);

    // Store values
    window.localStorage.setItem('lastBalance', JSON.stringify(balance));
  }

  // What happend when the confirmation SMS is received
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

    _stopWaiting();
    if (messageType === 'confirmation')
      _dispatchEvent('costcontroltopupsuccess');

    else
      _dispatchEvent('costcontroltopuperror', { reason: 'incorrect-code'});
  }

  function _getEventName(mode, suffix) {
    suffix = suffix || '';
    var root;
    if (mode === STATE_CHECKING)
      root = 'costcontrolbalanceupdate';
    else
      root = 'costcontroltopup';

    return root + suffix;
  }

  // Start waiting for SMS
  function _startWaiting(mode) {
    _state[mode] = true;
    _sms.addEventListener('received', _onSMSReceived[mode]);
    _smsTimeout[mode] = window.setTimeout(
      function cc_onTimeout() {
        console.log('Timing out for ' + mode);
        _dispatchEvent(_getEventName(mode, 'error'), { reason: 'timeout' });
        _stopWaiting(mode);
      },
      WAITING_TIMEOUT
    );
    _dispatchEvent(_getEventName(mode, 'start'));
  }

  // Disable waiting for SMS
  function _stopWaiting(mode) {
    _dispatchEvent(_getEventName(mode, 'finish'));
    window.clearTimeout(_smsTimeout[mode]);

    _state[mode] = false;
    _sms.removeEventListener('received', _onSMSReceived[mode]);
  }

  function _updateBalance() {
    // Abort if other operation in progress
    if (_state[STATE_CHECKING]) {
      console.log('Already updating, ignoring...');
      return;
    }

    // Send the request SMS
    var request = _sms.send(
      _settings.CHECK_BALANCE_DESTINATION,
      _settings.CHECK_BALANCE_TEXT
    );

    request.onsuccess = function cc_onSuccessSendingBalanceRequest() {
      _startWaiting(STATE_CHECKING);
    }

    request.onerror = function cc_onRequestError() {
      _dispatchEvent('costcontrolbalanceupdateerror', 
        { reason: 'sending-error' });
    };
  }

  function _toUp(code) {
    if (!code || _state[STATE_TOPPING_UP]) {
      console.log('Already topping up, ignoring...');
      return;
    }

    // Compose topup message and send
    var messageBody = _settings.TOP_UP_TEXT.replace('&code', code);
    var request = _sms.send(_settings.TOP_UP_DESTINATION, messageBody);
    request.onsuccess = function cc_onSuccessSendingTopup() {
      _startWaiting(STATE_TOPPING_UP);
    }

    request.onerror = function cc_onErrorSendingTopup() {
      _dispatchEvent('costcontroltopuperror', 
        { reason: 'sending-error' });
    }
  }

  // Register callbacks to invoke while updating balance
  function _setBalanceCallbacks(callbacks) {
    var onsuccess = callbacks.onsuccess || null;
    var onerror = callbacks.onerror || null;
    var onstart = callbacks.onstart || null;
    var onfinish = callbacks.onfinish || null;
    window.addEventListener('costcontrolbalanceupdatesuccess', onsuccess);
    window.addEventListener('costcontrolbalanceupdateerror', onerror);
    window.addEventListener('costcontrolbalanceupdatestart', onstart);
    window.addEventListener('costcontrolbalanceupdatefinish', onfinish);
  }

  // Register callbacks to invoke while topping up
  function _setTopUpCallbacks(callbacks) {
    var onsuccess = callbacks.onsuccess || null;
    var onerror = callbacks.onerror || null;
    var onstart = callbacks.onstart || null;
    var onfinish = callbacks.onfinish || null;
    window.addEventListener('costcontroltopupsuccess', onsuccess);
    window.addEventListener('costcontroltopuperror', onerror);
    window.addEventListener('costcontroltopupstart', onstart);
    window.addEventListener('costcontroltopupfinish', onfinish);
  }

  // Returns stored balance
  function _getLastBalance() {
    var balance = window.localStorage.getItem('lastBalance');
    balance = (balance !== null) ? JSON.parse(balance, Balance.reviver) : null;
    return balance;
  }

  // Return true or false if we can ensure we are in roaming or not.
  // If we cannot guarantee (i.e. carrier has not been detected yet)
  // it returns null
  function _inRoaming() {
    var conn = navigator.mozMobileConnection;
    if (!conn)
      return null;

    var voice = conn.voice;
    var data = conn.data;
    if (!voice || !data)
      return null;

    return data.network.shortName ? voice.roaming : null;
  }

  // Return true if we have coverage
  function _inCoverage() {
    var conn = navigator.mozMobileConnection;
    if (!conn)
      return false;

    var voice = conn.voice;
    if (!voice)
      return false;

    return voice.signalStrength !== null;
  }

  return {
    init: _init,
    setBalanceCallbacks: _setBalanceCallbacks,
    setTopUpCallbacks: _setTopUpCallbacks,
    requestBalance: _updateBalance,
    requestTopUp: _toUp,
    getLastBalance: _getLastBalance,
    inRoaming: _inRoaming,
    inCoverage: _inCoverage,
    getRequestBalanceMaxDelay: function cc_getRequestBalanceMaxDelay() {
      return REQUEST_BALANCE_MAX_DELAY;
    }
  };
}());

window[SERVICE_NAME].init();
nowIAmReady();
