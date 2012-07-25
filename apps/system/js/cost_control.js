/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = (function() {

  var WAITING_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  var REQUEST_BALANCE_UPDATE_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  
  var STATE_IDLE = 'idle';
  var STATE_TOPPING_UP = 'toppingup';
  var STATE_CHECKING = 'checking';

  var _settings = {};
  var _widget, _widgetCredit, _widgetTime;
  var _sms, _telephony;
  var _onSMSReceived = null;
  var _state = STATE_IDLE;
  var _balanceTimeout = 0;
  var _activeCalls = 0;

  // Enable observers for the basic parameters of the cost control
  function _configure() {

    function assignTo(name) {
      return function assign_to(value) {
        _settings[name] = value;
        console.log(name + ': ' + _settings[name]);
      }
    }

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
      '(R\\$\\s+[0-9]+([,\\.][0-9]+)?)',
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
      '(R\\$\\s+[0-9]+([,\\.][0-9]+)?)',
      assignTo('TOP_UP_CONFIRMATION_REGEXP'));
  }

  // Attach event listeners for automatic updates:
  //  * After calling
  //  * After sending a message
  //  * Periodically
  function _configureEventListeners() {

    // Listen for SMS
    if (window.navigator.mozSms) {
      _sms = window.navigator.mozSms;
      _sms.addEventListener('sent', _automaticCheck);
    }

    // Listen to ending calls
    if (window.navigator.mozTelephony) {
      _telephony = window.navigator.mozTelephony;
      _telephony.addEventListener('callschanged', _automaticCheck);
    }

    // Periodically update
    var periodicallyUpdateEvent =
      new CustomEvent('costcontrolPeriodicallyUpdate');
    _widget.addEventListener('costcontrolPeriodicallyUpdate', _automaticCheck);
    window.setInterval(function cc_periodicUpdateBalance() {
      _widget.dispatchEvent(periodicallyUpdateEvent);
    }, REQUEST_BALANCE_UPDATE_INTERVAL);
  }

  // Attach event listeners for manual updates
  function _configureWidget() {
    console.log('---- Configuring widget -----');
    _widget = document.getElementById('cost-control');
    _widgetCredit = document.getElementById('cost-control-credit');
    _widgetTime = document.getElementById('cost-control-time');

    // Listener for check now button
    var checkNowBalanceButton = document.getElementById('cost-control-credit-area');
    checkNowBalanceButton.addEventListener(
      'click',
      function cc_manualCheckBalance() {
        _mockup_updateBalance();
      }
    );

    // Listener for top up button
    var topUpButton = document.getElementById('cost-control-topup');
    topUpButton.addEventListener(
      'click',
      function cc_topUp() {
        var _ = navigator.mozL10n.get;
        ModalDialog.prompt(
          _('Enter the top up code:') + '\n' +
          _('Typically found in the scratch card or directly in your receipt.'),
          '000002',
          _mockup_topUp
        );
      }
    );
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configure();
    _configureWidget();
    _configureEventListeners();
    _updateUI();
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

      // After sending a message
      case 'sent':

        // Ignore messages to cost control numbers
        if (evt.type === 'sent') {
          var receiver = evt.message.receiver;
          if (reciever === '+34638358467' /* _settings.CHECK_BALANCE_DESTINATION */ || receiver === '+34638358467' /* _settings.TOP_UP_DESTINATION*/ )
            return;
        }

        _mockup_updateBalance();
        break;

      // After ending a call
      case 'callschanged':
        // Some call has ended
        if (_activeCalls && _telephony.calls.length < _activeCalls)
          _mockup_updateBalance();

        // Update calls
        _activeCalls = _telephony.calls.length;
        break;
    }
  }

  // Return the balance from the message or null if impossible to parse
  function _parseBalanceSMS(message) {
    var newBalance = null;
    var found = message.body.match(
      new RegExp(_settings.CHECK_BALANCE_REGEXP));

    // Impossible parse
    if (!found || !found[1]) {
      console.warn('Impossible to parse balance message.')

    // Parsing succsess
    } else {
      newBalance = found[1];
    }

    return newBalance;
  }

  // Return the balance from the message or null if impossible to parse
  function _parseConfirmationSMS(message) {
    var newBalance = null;
    var found = message.body.match(
      new RegExp(_settings.CHECK_BALANCE_REGEXP));

    // Impossible parse
    if (!found || !found[1]) {
      console.warn('Impossible to parse confirmation message.')

    // Parsing succsess
    } else {
      newBalance = found[1];
    }

    return newBalance;
  }

  // What happend when the a SMS is received
  function _onBalanceSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (message.sender !== '800268'/*_settings.CHECK_BALANCE_SENDERS*/)
      return;

    _stopWaiting();
    var newBalance = _parseBalanceSMS(message);
    _updateUI(newBalance);
  }

  // What happend when the a SMS is received
  function _onConfirmationSMSReceived(evt) {
    // Ignore messages from other senders
    var message = evt.message;
    if (message.sender !== '800268'/*_settings.TOP_UP_SENDERS*/)
      return;

    _stopWaiting();
    // XXX: Uncomment after removing mock ups
//      var newBalance = _parseConfirmationSMS(message);

    // TODO: If no parsing, notificate error and return

    // XXX: Remove when removing mock ups
    var currentBalance = parseFloat(_widgetCredit.textContent.slice(2));
    var newBalance = currentBalance + parseInt(message.body);
    newBalance = 'R$ ' + Math.round(newBalance * 100)/100;

    _updateUI(newBalance);
    // TODO: Add confirmation notification
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    if (updating)
      _widget.classList.add('updating');
    else
      _widget.classList.remove('updating');
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
    _setUpdatingMode(false);
    _sms.removeEventListener('received', _onSMSReceived);
  }

  function _mockup_updateBalance() {
    if (_state !== STATE_IDLE)
      return;

    // Send the request SMS
    // XXX: Uncomment after removing mockups
    _setUpdatingMode(true);
    /*var request = _sms.send(
      _settings.CHECK_BALANCE_DESTINATION,
      _settings.CHECK_BALANCE_TEXT
    );*/
    var currentCredit = parseFloat(_widgetCredit.textContent.slice(2));
    var newCredit = Math.max(0, currentCredit - 2);
    newCredit = Math.round(newCredit * 100)/100;
    var request = _sms.send(
      '+34638358467',
      'R$ ' + newCredit
    );
    request.onsuccess = function cc_onSuccessSendingBalanceRequest() {
      _startWaiting(STATE_CHECKING, _onBalanceSMSReceived);
    }
  }

  function _mockup_topUp(code) {
    if (!code || _state !== STATE_IDLE)
      return;

    _setUpdatingMode(true);

    // Compose topup message and send
    var messageBody = _settings.TOP_UP_TEXT.replace('&code', code);
    var request = _sms.send('+34638358467' /*_settings.TOP_UP_DESTINATION*/, messageBody);
    request.onsuccess = function cc_onSuccessSendingTopup() {
      _startWaiting(STATE_TOPPING_UP, _onConfirmationSMSReceived);
    }

    request.onerror = function cc_onErrorSendingTopup() {
      var _ = navigator.mozL10n.get;
      _setUpdatingMode(false);
      ModalDialog.alert(_('It is not possible to update your balance now.'));
    }
  }

  function _updateUI(balance) {
    if (balance) {
      var now = new Date();
      var datestring = now.toLocaleFormat('%a, %H:%M');
      window.localStorage.setItem('costcontrolDate', datestring);
      window.localStorage.setItem('costcontrolBalance', balance);
    }

    _widgetCredit.textContent =
      window.localStorage.getItem('costcontrolBalance') || 'R$ 12.34';
    _widgetTime.textContent =
      window.localStorage.getItem('costcontrolDate') || 'Today';
  }

  return {
    init: _init
  };
})();

CostControl.init();
