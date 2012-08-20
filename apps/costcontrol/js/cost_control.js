/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = getService(function cc_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the CostControl object
  // again and setup the application.
  CostControl = evt.detail.service;
  setupApp();
});

// If the service is already initialized, just setup the widget
if (CostControl)
  setupApp();

function setupApp() {
  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var _isUpdating = false;

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    _updateUI(evt.detail.balance, evt.detail.timestamp);
  }

  // On balance updating error, if manual request, notificate
  function _onUpdateBalanceError(evt) {
    if (!isManualRequest)
      return;

    switch(evt.detail.reason) {
      case 'sending-error':
        alert(_('cannot-check-balance'));
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

  // On top up success, update UI with the new balance, notificate and post
  // result if there was an activity request. TODO: let a list of activity
  // request
  function _onTopUpSuccess(evt) {
    _requestUpdate();
  }

  // When starting a top up, change to the waiting screen
  function _onTopUpStart() {
    console.log('TODO: Change screen to waiting screen, wait 10s and return to the balance.');
  }

  function _onTopUpFinish() {
    _setUpdatingMode(false);
  }

  // On top up error, if manual request, notificate
  function _onTopUpError(evt) {
    switch(evt.detail.reason) {
      case 'sending-error':
        console.log('TODO: Error message, we cannot top up at the moment.');
        break;

      case 'incorrect-code':
        console.log('TODO: Change the top up screen and notificate!');
        break;
    }
  }

  function _requestUpdate() {
    if (_isUpdating)
      return;

    var status = CostControl.getServiceStatus();
    if (status.detail === 'no-coverage') {
      console.log('TODO: No coverage, open an alert and avoid to continue');
      return;
    }

    _setUpdatingMode(true);
    console.log('Update balance!');

    CostControl.requestBalance();
  }

  var _buttonRequestTopUp, _creditArea, _credit, _time, _updateIcon;
  function _configureBalanceTab() {
    _creditArea = document.getElementById('cost-control-credit-area');
    _credit = document.getElementById('cost-control-credit');
    _time = document.getElementById('cost-control-time');

    _buttonRequestTopUp = document.getElementById('buttonRequestTopUp');
    _buttonRequestTopUp.addEventListener('click', function cc_requestTopUp() {
      var status = CostControl.getServiceStatus();
      if (status.detail === 'no-coverage') {
        console.log('TODO: No coverage, open an alert and avoid to continue');
        return;
      }

      location.hash = 'topup';
    });

    _updateIcon = document.getElementById('cost-control-update-icon');
    _updateIcon.addEventListener('click', _requestUpdate);
  }

  var _inputTopUpCode, _buttonTopUp;
  function _configureTopUpScreen() {
    _inputTopUpCode = document.getElementById('inputTopUpCode');
    _buttonTopUp = document.getElementById('buttonTopUp');
    _buttonTopUp.addEventListener('click', function cc_onTopUp() {

      console.log('TopUp!');
      // Strip
      var code = _inputTopUpCode.value
        .replace(/^\s+/, '').replace(/\s+$/, '');

      if (!code)
        return;

      console.log('topping up with code: ' + code);
      CostControl.requestTopUp(code);
    });
  }

  // Attach event listeners for manual updates
  function _configureUI() {

    _configureBalanceTab();
    _configureTopUpScreen();

    // Callbacks for topping up
    CostControl.setTopUpCallbacks({
      onsuccess: _onTopUpSuccess,
      onerror: _onTopUpError,
      onstart: _onTopUpStart,
      onfinish: _onTopUpFinish
    });

    // Callbacks for update balance
    CostControl.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError,
      onstart: _onUpdateStart,
      onfinish: _onUpdateFinish
    });

    // Handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/open':
            // Go to that section and enable activity mode
            setTimeout(function cc_goToTopUp() {
              document.location.hash = 'left-panel';
            });
            break;
        }
      }
    );
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configureUI();
    _updateUI();
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;
    if (updating)
      _creditArea.classList.add('updating');
    else
      _creditArea.classList.remove('updating');
  }

  function _updateUI(balance, timestamp) {
    if (!arguments.length) {
      var lastBalance = CostControl.getLastBalance();
      balance = lastBalance ? lastBalance.balance : null;
      timestamp = lastBalance ? lastBalance.timestamp : null;
    }
    timestamp = timestamp || new Date();

    // Format and set
    // Check for low credit
    /* XXX: Does this apply to the cost control app?
    if (balance < 5) //TODO: Replace by some value not harcocded
      _widget.classList.add('low-credit');
    else
      _widget.classList.remove('low-credit');
    */

    // Format credit
    var formattedBalance;
    if (balance !== null) {
      var splitBalance = (balance.toFixed(2)).split('.');
      formattedBalance = 'R$ &i,&d' //TODO: Replace by some value not hardcoded
        .replace('&i', splitBalance[0])
        .replace('&d', splitBalance[1]);
    } else {
      formattedBalance = '--';
    }
    _credit.textContent = formattedBalance;

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
    _time.textContent = formattedTime;

    return { balance: formattedBalance, time: formattedTime };
  }

  _init();
}
