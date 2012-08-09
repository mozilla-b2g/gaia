/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

setService(function() {
  var _fakeLastBalance = _getLastBalance();
  var _fakeCredit = _fakeLastBalance ? _fakeLastBalance.balance : 12.34;
  console.log('fake creadit: ' + _fakeCredit);

  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var WAITING_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  var REQUEST_BALANCE_UPDATE_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  var REQUEST_BALANCE_MAX_DELAY = 1 * 60 * 1000; // 1 minute

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
  ];
  var _notEmptySettings = [
    'CHECK_BALANCE_DESTINATION',
    'CHECK_BALANCE_SENDERS',
    'TOP_UP_DESTINATION',
    'TOP_UP_SENDERS'
  ];

  var _sms = window.navigator.mozSms;
  var _onSMSReceived = null;
  var _state = STATE_IDLE;
  var _balanceTimeout = 0;
  var _connectedCalls = 0;

  function Balance(balance, timestamp) {
    this.balance = balance;
    this.timestamp = timestamp || new Date();
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

    // Credit stuff
    SettingsListener.observe('costcontrol.credit.lowlimit', 4,
      assignTo('CREDIT_LOW_LIMIT'));

    // For balance
    // Send to...
    SettingsListener.observe('costcontrol.balance.destination', '8000',
      assignTo('CHECK_BALANCE_DESTINATION'));

    // Text to send
    SettingsListener.observe('costcontrol.balance.text', '',
      assignTo('CHECK_BALANCE_TEXT'));

    // Wait from...
    SettingsListener.observe('costcontrol.balance.senders', '1515',
      assignTo('CHECK_BALANCE_SENDERS'));

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
    SettingsListener.observe('costcontrol.topup.senders', '1515',
      assignTo('TOP_UP_SENDERS'));

    // Parse confirmation following...
    SettingsListener.observe('costcontrol.topup.regexp',
      'R\\$\\s+([0-9]+)(?:[,\\.]([0-9]+))?',
      assignTo('TOP_UP_CONFIRMATION_REGEXP'));
  }

  // Attach event listeners for automatic updates:
  //  * Periodically
  function _configureAutomaticUpdates() {
    // Periodically update
    var periodicallyUpdateEvent =
      new CustomEvent('costcontrolPeriodicallyUpdate');
    window.addEventListener('costcontrolPeriodicallyUpdate', _automaticCheck);
    window.setInterval(function cc_periodicUpdateBalance() {
      window.dispatchEvent(periodicallyUpdateEvent);
    }, REQUEST_BALANCE_UPDATE_INTERVAL);
  }

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {
    _configureSettings();
    _configureAutomaticUpdates();

    window.opener.dispatchEvent(
      new CustomEvent('costcontrolserviceready'));
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
      case 'costcontrolPeriodicallyUpdate':

        // Abort if it have not passed enough time since last update
        var lastUpdated = window.localStorage.getItem('costcontrolTime');
        if (lastUpdated !== null)
          lastUpdated = (new Date(lastUpdated)).getTime();

        var now = (new Date()).getTime();
        if (now - lastUpdated > REQUEST_BALANCE_MAX_DELAY)
          _mockup_updateBalance();

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

  // Return the balance from the message or null if impossible to parse
  function _parseConfirmationSMS(message) {
    var newBalance = null;
    var found = message.body.match(
      new RegExp(_settings.CHECK_BALANCE_REGEXP));

    // Impossible parse
    if (!found || found.length < 2) {
      console.warn('Impossible to parse confirmation message.')

    // Parsing succsess
    } else {
      var integer = found[1];
      var decimal = found[2] || '0';
      newBalance = parseFloat(integer + '.' + decimal);
    }

    return newBalance;
  }

  // What happend when the balance SMS is received
  function _onBalanceSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (message.sender !== _settings.CHECK_BALANCE_SENDERS)
      return;

    _stopWaiting();
    var newBalance = _parseBalanceSMS(message);

    // Error when parsing and manual. If not manual, fail silently
    if (newBalance === null) {
      var errorEvent = new CustomEvent(
        'costcontrolbalanceupdateerror',
        { detail: { reason: 'parse-error' } }
      );
      window.dispatchEvent(errorEvent);
      return;
    }

    var now = new Date();
    var timestring = now.toISOString();
    var balance = new Balance(newBalance, now);

    var successEvent = new CustomEvent(
      'costcontrolbalanceupdatesuccess',
      { detail: balance }
    );
    window.dispatchEvent(successEvent);

    // Store values
    window.localStorage.setItem('lastBalance', JSON.stringify(balance));
  }

  // What happend when the confirmation SMS is received
  function _onConfirmationSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (message.sender !== '800378'/*_settings.TOP_UP_SENDERS*/)
      return;

    _stopWaiting();
    // XXX: Uncomment after removing mock ups
//      var newBalance = _parseConfirmationSMS(message);

    // TODO: If no parsing, notificate error and return

    // XXX: Remove when removing mock ups
    var currentBalance = _fakeCredit;
    var newBalance = currentBalance + parseInt(message.body, 10);
    newBalance = Math.round(newBalance * 100)/100;

    // Notificate when parsing confirmation fails
    if (newBalance === null) {
      var errorEvent = new CustomEvent(
        'costcontroltopuperror',
        { detail: { reason: 'parse-error' } }
      );
      window.dispatchEvent(errorEvent);
      return;
    }

    _fakeCredit = newBalance;
    var successEvent = new CustomEvent(
      'costcontroltopupsuccess',
      { detail: { newBalance: _fakeCredit } }
    );
    window.dispatchEvent(successEvent);
  }

  // Start waiting for SMS
  function _startWaiting(mode, onSMSReceived) {
    _state = mode;
    _onSMSReceived = onSMSReceived;
    _sms.addEventListener('received', _onSMSReceived);
    _balanceTimeout = window.setTimeout(
      _stopWaiting,
      WAITING_TIMEOUT
    );
  }

  // Disable waiting for SMS
  function _stopWaiting() {
    window.clearTimeout(_balanceTimeout);

    _state = STATE_IDLE;
    _sms.removeEventListener('received', _onSMSReceived);
  }

  function _mockup_updateBalance() {
    // Abort if other operation in progress
    if (_state !== STATE_IDLE)
      return;

    // Send the request SMS
    var request = _sms.send(
      _settings.CHECK_BALANCE_DESTINATION,
      _settings.CHECK_BALANCE_TEXT
    );
    /*
    var currentCredit = _fakeCredit;
    var newCredit = Math.max(0, currentCredit - 2);
    newCredit = Math.round(newCredit * 100)/100;
    _fakeCredit = newCredit;
    var request = _sms.send(
      '+34620970334',
      'R$ ' + newCredit
    );
    */
    request.onsuccess = function cc_onSuccessSendingBalanceRequest() {
      _startWaiting(STATE_CHECKING, _onBalanceSMSReceived);
    }

    request.onerror = function cc_onRequestError() {
      var errorEvent = new CustomEvent(
        'costcontrolbalanceupdateerror',
        { detail: { reason: 'sending-error' } }
      );
      window.dispatchEvent(errorEvent);
    };
  }

  function _mockup_topUp(code) {
    if (!code || _state !== STATE_IDLE)
      return;

    // Compose topup message and send
    var messageBody = _settings.TOP_UP_TEXT.replace('&code', code);
    var request = _sms.send('+34620970334' /*_settings.TOP_UP_DESTINATION*/, messageBody);
    request.onsuccess = function cc_onSuccessSendingTopup() {
      _startWaiting(STATE_TOPPING_UP, _onConfirmationSMSReceived);
    }

    request.onerror = function cc_onErrorSendingTopup() {
      var errorEvent = new CustomEvent(
        'costcontroltopuperror',
        { detail: { reason: 'sending-error' } }
      );
      window.dispatchEvent(errorEvent);
    }
  }

  // Register callbacks to invoke while updating balance
  function _setBalanceCallbacks(callbacks) {
    var onsuccess = callbacks.onsuccess || null;
    var onerror = callbacks.onerror || null;
    window.addEventListener('costcontrolbalanceupdatesuccess', onsuccess);
    window.addEventListener('costcontrolbalanceupdateerror', onerror);
  }

  // Register callbacks to invoke while topping up
  function _setTopUpCallbacks(callbacks) {
    var onsuccess = callbacks.onsuccess || null;
    var onerror = callbacks.onerror || null;
    window.addEventListener('costcontroltopupsuccess', onsuccess);
    window.addEventListener('costcontroltopuperror', onerror);
  }

  // Returns stored balance
  function _getLastBalance() {
    console.log('getting last balance');
    var balance = window.localStorage.getItem('lastBalance');
    console.log('has balance? ' + (balance !== null) + ' (' + balance + ')');
    balance = (balance !== null) ? JSON.parse(balance, Balance.reviver) : null;
    return balance;
  }

  return {
    init: _init,
    setBalanceCallbacks: _setBalanceCallbacks,
    setTopUpCallbacks: _setTopUpCallbacks,
    requestBalance: _mockup_updateBalance,
    requestTopUp: _mockup_topUp,
    getLastBalance: _getLastBalance,
  };
}());

window[SERVICE_NAME].init();
nowIAmReady();
