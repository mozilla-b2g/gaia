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
  var _allSettings = [
    'CREDIT_FORMAT',
    'CREDIT_LOW_LIMIT',
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

  var _widget, _widgetCredit, _widgetTime;
  var _sms, _telephony;
  var _onSMSReceived = null;
  var _state = STATE_IDLE;
  var _balanceTimeout = 0;
  var _connectedCalls = 0;

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
        if(_checkConfiguration())
          _widget.style.display = '';
      }
    }

    function changeFormat() {
      var assignToCreditFormat = assignTo('CREDIT_FORMAT');
      return function cc_configure_changeFormat(value) {
        assignToCreditFormat(value);
        _updateUI();
      }
    }

    // Credit stuff
    SettingsListener.observe('costcontrol.credit.format', 'R$ &i,&d',
      changeFormat());

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
  //  * After calling
  //  * After sending a message
  //  * Periodically
  function _configureEventListeners() {

    // Listen for SMS
    if (window.navigator.mozSms) {
      _sms = window.navigator.mozSms;
      _sms.addEventListener('sent', function(evt) { console.log('MESSAGE SENT!'); });
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
    _widget = document.getElementById('cost-control');
    _widget.style.display = 'none';
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
      _mockup_topUp
    );
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configureWidget();
    _configureSettings();
    _configureEventListeners();
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

    // Filter calls, leaving only connected calls
    function getConnected(calls) {
      var connected = [];
      calls.forEach(function cc_automaticCheck_eachCall(call) {
        if (call.state === 'connected')
          connected.push(call);
      });
      return connected;
    }

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
        // XXX: Uncomment this line when call changes are properly recorded
//        var currentConnectedCalls = getConnected(_telephony.calls).length;
        var currentConnectedCalls = _telephony.calls.length;
        if (_connectedCalls && currentConnectedCalls < _connectedCalls)
          _mockup_updateBalance();

        // Update calls
        _connectedCalls = currentConnectedCalls;
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
    if (Math.random() < 0.4) {
      window.mozNotification.createNotification(
        _('Cost Control: Top Up') || 'Cost Control: Top Up',
        _('Error parsing the confirmation message') ||
        'Error parsing the confirmation message'
      ).show();
      return;
    }

    var newBalance = currentBalance + parseInt(message.body);
    newBalance = Math.round(newBalance * 100)/100;

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

  function _mockup_topUp() {
    if (_state !== STATE_IDLE)
      return;

    var _ = navigator.mozL10n.get;

    function actualTopUp(code) {
      if (!code)
        return;

      _setUpdatingMode(true);

      // Compose topup message and send
      var messageBody = _settings.TOP_UP_TEXT.replace('&code', code);
      var request = _sms.send('+34638358467' /*_settings.TOP_UP_DESTINATION*/, messageBody);
      request.onsuccess = function cc_onSuccessSendingTopup() {
        _startWaiting(STATE_TOPPING_UP, _onConfirmationSMSReceived);
      }

      request.onerror = function cc_onErrorSendingTopup() {
        _setUpdatingMode(false);
        ModalDialog.alert(_('It is not possible to update your balance now.'));
      }
    }

    ModalDialog.prompt(
      _('Enter the top up code:') + '\n' +
      _('Typically found in the scratch card or directly in your receipt.'),
      '000002',
      actualTopUp
    );
  }

  function _updateUI(balance) {
    var now = new Date();
    if (balance !== undefined) {
      var timestring = now.toISOString();
      window.localStorage.setItem('costcontrolTime', timestring);
      window.localStorage.setItem('costcontrolBalance', balance);
    }

    // Get data
    var rawTime = window.localStorage.getItem('costcontrolTime');
    rawTime = rawTime !== null ? new Date(rawTime) : new Date();
    var rawBalance = window.localStorage.getItem('costcontrolBalance');
    rawBalance = rawBalance !== null ? parseFloat(rawBalance) : 0.00;

    // Format and set
    // Check for low credit
    if (rawBalance < _settings.CREDIT_LOW_LIMIT)
      _widget.classList.add('low-credit');
    else
      _widget.classList.remove('low-credit');

    // Format credit
    var splitBalance = (rawBalance.toFixed(2)).split('.');
    _widgetCredit.textContent = _settings.CREDIT_FORMAT
      .replace('&i', splitBalance[0])
      .replace('&d', splitBalance[1]);

    // Format time
    var time = rawTime.toLocaleFormat('%H:%M');
    var date = rawTime.toLocaleFormat('%a');
    var dateDay = parseInt(rawTime.toLocaleFormat('%u'));
    var nowDateDay = parseInt(now.toLocaleFormat('%u'));
    var _ = navigator.mozL10n.get;
    if (nowDateDay === dateDay)
      date = _('Today') || 'Today';
    else if ((nowDateDay === dateDay + 1) ||
              (nowDateDay === 7 && dateDay === 1))
      date = _('Yesterday') || 'Yesterday';

    _widgetTime.textContent = date + ', ' + time;
  }

  return {
    init: _init
  };
})();

CostControl.init();
