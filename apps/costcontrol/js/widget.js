/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl;
window.addEventListener('message', function cc_onApplicationReady(evt) {
  
  if (evt.data.type === 'applicationready') {
    CostControl = getService(function cc_onServiceReady(evt) {
      // If the service is not ready, when ready it re-set the CostControl object
      // and setup the widget.
      CostControl = evt.detail.service;
      setupWidget();
    });

    // If the service is already initialized, just setup the widget
    if (CostControl)
      setupWidget();
  }
});

function setupWidget() {

  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var STATE_ERROR = 'error';
  var STATE_NO_AUTOMATIC = 'no-automatic';
  var STATE_DEFAULT = 'default';

  var _widget, _widgetCredit, _widgetCurrency, _widgetTime;
  var _isUpdating = false;
  var _state = STATE_DEFAULT;

  function _automaticUpdatesAllowed() {
    var status = CostControl.getServiceStatus();
    return status.availability && !status.roaming;
  }

  // Attach event listeners for automatic updates:
  //  * After showing the utility tray
  function _configureAutomaticUpdates() {
    // Listen to utilitytray show
    window.addEventListener('message', function cc_utilityTray(evt) {
      if (evt.data.type === 'utilitytrayshow')
        _automaticCheck(evt.data);
    });
  }

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    _widget.classList.remove('error');
    _updateUI(evt.detail.balance, evt.detail.timestamp, evt.detail.currency);
  }

  // On balance updating error, if manual request, notificate
  function _onUpdateBalanceError(evt) {
    _widget.classList.add('error');
    switch(evt.detail.reason) {
      case 'sending-error':
        debug('TODO: Change widget state to indicate the fail.');
        break;
    }
  }

  // On starting an update, enter into update mode
  function _onUpdateStart(evt) {
    _setUpdatingMode(true);
  }

  // On ending an update, exit from update mode
  function _onUpdateFinish(evt) {
    _setUpdatingMode(false);
  }

  // Attach event listeners for manual updates
  function _configureWidget() {
    _widget = document.getElementById('cost-control');
    _widgetCredit = document.getElementById('cost-control-credit');
    _widgetCurrency = document.getElementById('cost-control-currency')
    _widgetTime = document.getElementById('cost-control-time');

    // Listener to open application
    _widget.addEventListener('click', _openApp);

    // Suscribe callbacks for balance updating success and error to the service
    CostControl.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError,
      onstart: _onUpdateStart,
      onfinish: _onUpdateFinish
    });

    _updateUI();
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configureWidget();
    _configureAutomaticUpdates();
  }

  // Handle the events that triggers automatic balance updates
  function _automaticCheck(evt) {
    debug('Event listened: ' + evt.type);

    // Ignore if the device is in roaming
    if (!_automaticUpdatesAllowed()) {
      console.warn('Device in roaming, no automatic updates allowed');
      return;
    }

    switch (evt.type) {

      // When utility tray shows and it has passed "enough" time since the last
      // update.
      case 'utilitytrayshow':
        // Abort if it have not passed enough time since last update
        var balance = CostControl.getLastBalance();
        var lastUpdate =  balance ? balance.timestamp : null;
        var now = (new Date()).getTime();
        if (lastUpdate === null ||
            (now - lastUpdate > CostControl.getRequestBalanceMaxDelay()))
          _updateBalance();

        break;
    }
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;

    if (updating) {
      _widget.classList.add('updating');
      _widgetTime.textContent = _('updating...');
    } else {
      _widget.classList.remove('updating');
    }
  }

  // Request a balance update from the service
  function _updateBalance() {
    if (_isUpdating)
      return;

    CostControl.requestBalance();
  }

  // Open the cost control & data usage application
  function _openApp() {
    var activity = new MozActivity({ name: 'costcontrol/open' });
  }

  // Updates the UI with the new balance and return both balance and timestamp
  function _updateUI(balance, timestamp, currency) {
    if (!arguments.length) {
      var lastBalance = CostControl.getLastBalance();
      balance = lastBalance ? lastBalance.balance : null;
      timestamp = lastBalance ? lastBalance.timestamp : null;
      currency = lastBalance ? lastBalance.currency : null;
    }
    timestamp = timestamp || new Date();
    currency = currency || '';

    var status = CostControl.getServiceStatus();
    if (!status.availability || status.roaming)
      _widget.classList.add('error');
    else
      _widget.classList.remove('error');

    // Format and set
    // Check for low credit
    if (balance < CostControl.getLowLimitThreshold())
      _widget.classList.add('low-credit');
    else
      _widget.classList.remove('low-credit');

    // Format credit
    var formattedBalance;
    if (balance !== null) {
      var splitBalance = (balance.toFixed(2)).split('.');
      formattedBalance = '&i,&d'
        .replace('&i', splitBalance[0])
        .replace('&d', splitBalance[1]);
    } else {
      formattedBalance = '--';
    }
    _widgetCurrency.textContent = currency;
    _widgetCredit.textContent = formattedBalance;

    // Format time
    var now = new Date();
    var time = timestamp.toLocaleFormat('%H:%M');
    var date = timestamp.toLocaleFormat('%a');
    var dateDay = parseInt(timestamp.toLocaleFormat('%u'), 10);
    var nowDateDay = parseInt(now.toLocaleFormat('%u'), 10);
    if (nowDateDay === dateDay)
      date = _('today');
    else if ((nowDateDay === dateDay + 1) ||
              (nowDateDay === 1 && dateDay === 7))
      date = _('yesterday');

    var formattedTime = date + ', ' + time;
    _widgetTime.textContent = formattedTime;

    return { balance: formattedBalance, time: formattedTime };
  }

  _init();
};
