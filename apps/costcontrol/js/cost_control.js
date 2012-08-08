/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var CostControl = getService();
  var _topUpButton, _topUpInput;
  var _isUpdating = false;
  var _activityRequest = null;

  // On top up success, update UI with the new balance, notificate and post
  // result if there was an activity request. TODO: let a list of activity
  // request
  function _onTopUpSuccess(evt) {
//  var output = _updateUI(evt.detail.newBalance);
//    _setUpdatingMode(false);

    navigator.mozNotification.createNotification(
      _('topup-confirmation-title'),
      // TODO: Replace evt.detail.newB by output.b
      _('topup-confirmation-message', { credit: evt.detail.newBalance })
    ).show();

    // If there was an activity request, send the new balance as result
    if (_activityRequest) {
      _activityRequest.postResult({ newBalance: evt.detail.newBalance });
      _activityRequest = null;
    }
  }

  // On top up error, if manual request, notificate
  function _onTopUpError(evt) {
//    _setUpdatingMode(false);

    switch(evt.detail.reason) {
      case 'parse-error':
        navigator.mozNotification.createNotification(
          _('topup-parsing-error-title'),
          _('topup-parsing-error-description')
        ).show();
        break;

      case 'sending-error':
//        alert(_('cannot-check-balance'));
        break;
    }
  }

  // Attach event listeners for manual updates
  function _configureUI() {

    // callbacks for topping up
    CostControl.setTopUpCallbacks({
      onsuccess: _onTopUpSuccess,
      onerror: _onTopUpError
    });

    // program top up
    _topUpButton = document.getElementById('topUpButton');
    _topUpInput = document.getElementById('topUpInput');
    _topUpButton.addEventListener('click', function cc_onTopUp() {
      if (_isUpdating)
        return;
//      _setUpdatingMode(true);

      var code = _topUpInput.value.replace(/^\s+/, '').replace(/\s+$/, '');
      if (!code)
        return;

      CostControl.requestTopUp(code);
    });

    // handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/topup':
            // Go to that section and enable activity mode
            setTimeout(function cc_goToTopUp() {
              _activityRequest = activityRequest;
              document.location.hash = 'topup';
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
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;
    if (updating)
      _widget.classList.add('updating');
    else
      _widget.classList.remove('updating');
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
