/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// XXX: Remove when bug https://bugzilla.mozilla.org/show_bug.cgi?id=766873
// is resolved
var _w = window.open('/background.html#0', SERVICE_BACKGROUND_NAME, 'background');
console.log('service started: ' + (_w !== null));

(function() {
  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  console.log('too early: widget');
  var CostControl = getService();
  var _widget, _widgetCredit, _widgetTime;
  var _isUpdating = false;

  var REQUEST_BALANCE_MAX_DELAY = 1 * 60 * 1000; // 1 minute

  // Attach event listeners for automatic updates:
  //  * After showing the utility tray
  function _configureAutomaticUpdates() {
    // Listen to utilitytray show
    window.addEventListener('message', function cc_utilityTray(evt) {
      _automaticCheck(evt.data);
    });
  }

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    _updateUI(evt.detail.balance);
    _setUpdatingMode(false);
  }

  // On balance updating error, if manual request, notificate
  function _onUpdateBalanceError(evt) {
    _setUpdatingMode(false);

    if (!isManualRequest)
      return;

    switch(evt.detail.reason) {
      case 'parse-error':
        navigator.mozNotification.createNotification(
          _('checking-balance-parsing-error-title'),
          _('checking-balance-parsing-error-description')
        ).show();
        break;

      case 'sending-error':
        alert(_('cannot-check-balance'));
        break;
    }
  }

  // Attach event listeners for manual updates
  function _configureWidget() {
    _widget = document.getElementById('cost-control');
    _widgetCredit = document.getElementById('cost-control-credit');
    _widgetTime = document.getElementById('cost-control-time');

    // Listener for check now button
    var checkNowBalanceButton = document.getElementById('cost-control-credit-area');
    checkNowBalanceButton.addEventListener(
      'click',
      function cc_manualCheck() {
        _updateBalance(true);
      }
    );

    // Listener for top up button
    var topUpButton = document.getElementById('cost-control-topup');
    topUpButton.addEventListener(
      'click',
      _topUp
    );

    // Suscribe callbacks for balance updating success and error to the service
    CostControl.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError
    });

    _updateUI();
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configureWidget();
    _configureAutomaticUpdates();
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

      // When utility tray shows and it has passed "enough" time since the last
      // update.
      case 'utilitytrayshow':
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

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;
    if (updating)
      _widget.classList.add('updating');
    else
      _widget.classList.remove('updating');
  }

  // Request a balance update from the service
  function _updateBalance(isManualRequest) {
    if (_isUpdating)
      return;

    _setUpdatingMode(true);
    CostControl.requestBalance();
  }

  // Request a top up to the cost control application via web activity
  function _topUp() {
    if (_isUpdating)
      return;

    _setUpdatingMode(true);

    // TODO: Use a web activity
    var activity = new MozActivity({ name: 'costcontrol/topup' });
    activity.onsuccess = function () {
      _updateUI(activity.result.newBalance);
      _setUpdatingMode(false);
    };
    activity.onerror = function () {
      console.log('ERROR');
    };
  }

  // Updates the UI with the new balance and return both balance and timestamp
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
    if (rawBalance <  100/* TODO: Replace by some value not harcocded */)
      _widget.classList.add('low-credit');
    else
      _widget.classList.remove('low-credit');

    // Format credit
    var splitBalance = (rawBalance.toFixed(2)).split('.');
    var formattedBalance = 'R$ &i,&d' /* TODO: Replace by some value not hardcoded*/
      .replace('&i', splitBalance[0])
      .replace('&d', splitBalance[1]);
    _widgetCredit.textContent = formattedBalance;

    // Format time
    var time = rawTime.toLocaleFormat('%H:%M');
    var date = rawTime.toLocaleFormat('%a');
    var dateDay = parseInt(rawTime.toLocaleFormat('%u'), 10);
    var nowDateDay = parseInt(now.toLocaleFormat('%u'), 10);
    if (nowDateDay === dateDay)
      date = _('today');
    else if ((nowDateDay === dateDay + 1) ||
              (nowDateDay === 7 && dateDay === 1))
      date = _('yesterday');

    var formattedTime = date + ', ' + time;
    _widgetTime.textContent = formattedTime;

    return { balance: formattedBalance, time: formattedTime };
  }

  _init();
}());

