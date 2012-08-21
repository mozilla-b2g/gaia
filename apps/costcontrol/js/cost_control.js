/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Retrieve CostControl service
var CostControl = getService(function cc_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the CostControl object
  // again and setup the application.
  CostControl = evt.detail.service;
  setupApp();
});
if (CostControl)
  setupApp();

// Cost Control application is in charge of offer detailed information
// about cost control and data ussage. At the same time it allows the user
// to configure some aspects about consumption limits and monitoring.
function setupApp() {

  // To highlight missed translations
  var _ = function cc_fallbackTranslation(keystring) {
    var r = navigator.mozL10n.get.apply(this, arguments);
    return r || '!!' + keystring;
  }

  var DELAY_TO_RETURN = 10 * 1000; // 10 seconds

  var _isUpdating = false;
  var _isWaitingTopUp = false;
  var _lastCodeIncorrect = false;
  var _confirmationReceived = true;
  var _returnTimeout = 0;

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    _updateUI(evt.detail.balance, evt.detail.timestamp);
  }

  // On balance updating error, if manual request, notificate
  function _onUpdateBalanceError(evt) {
    _setUpdatingMode(false);
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
  // result if there was an activity request.
  // request
  function _onTopUpSuccess(evt) {
    var notification = navigator.mozNotification.createNotification(
      'Cost Control',
      'Top Up completed.',
      '/icons/Clock.png'
    );
    _confirmationReceived = true;
    _lastCodeIncorrect = false;
    _setTopUpScreenMode(MODE_DEFAULT);
    _requestUpdate();
  }

  // When starting a top up, change to the waiting screen
  function _onTopUpStart() {
    debug('TODO: Change screen to waiting screen, wait 10s and return to the balance.');
  }

  function _onTopUpFinish() {
    _setUpdatingMode(false);
  }

  // On top up error, if manual request, notificate
  function _onTopUpError(evt) {
    clearTimeout(_returnTimeout);

    switch(evt.detail.reason) {
      case 'sending-error':
        _setTopUpScreenMode(MODE_ERROR);
        debug('TODO: Error message, we cannot top up at the moment.');
        break;

      case 'timeout':
        _confirmationReceived = false;
        break;

      case 'incorrect-code':
        _lastCodeIncorrect = true;
        _setTopUpScreenMode(MODE_INCORRECT_CODE);
        var notification = navigator.mozNotification.createNotification(
          'Cost Control',
          'Incorrect top up code entered. Please, try again.',
          '/icons/Clock.png'
        );
        notification.onclick = function () {
          var activity = new MozActivity({ name: 'costcontrol/topup' });
        };
        notification.show();
        debug('TODO: Change the top up screen and notificate!');
        break;
    }
  }

  function _requestUpdate() {
    if (_isUpdating)
      return;

    var status = CostControl.getServiceStatus();
    if (status.detail === 'no-coverage') {
      _changeViewTo(VIEW_NO_COVERAGE_INFO);
      return;
    }

    _setUpdatingMode(true);
    debug('Update balance!');

    CostControl.requestBalance();
  }

  var _buttonRequestTopUp, _creditArea, _credit, _time, _updateIcon, _balanceTab, _infoArea;
  function _configureBalanceTab() {
    _infoArea = document.getElementById('cost-control-info-area');
    _balanceTab = document.getElementById('balance-tab');
    _creditArea = document.getElementById('cost-control-credit-area');
    _credit = document.getElementById('cost-control-credit');
    _time = document.getElementById('cost-control-time');

    _buttonRequestTopUp = document.getElementById('buttonRequestTopUp');
    _buttonRequestTopUp.addEventListener('click', function cc_requestTopUp() {
      var status = CostControl.getServiceStatus();
      if (status.detail === 'no-coverage') {
        _changeViewTo(VIEW_NO_COVERAGE_INFO);
        return;
      }

      if (!_isWaitingTopUp && !_lastCodeIncorrect)
        _setTopUpScreenMode(MODE_DEFAULT);

      _changeViewTo(VIEW_TOPUP);
    });

    _updateIcon = document.getElementById('cost-control-update-button');
    _updateIcon.addEventListener('click', _requestUpdate);
  }

  var _noCoverageInfo, _noCoverageInfoButton;
  function _configureNoCoverageInfo() {
    _noCoverageInfo = document.getElementById('no-coverage-info');
    _noCoverageInfoButton = document.getElementById('no-coverage-info-button');
    _noCoverageInfoButton.addEventListener('click', function cc_onOK() {
      _closeCurrentView();
    });
  }

  var _inputTopUpCode, _buttonTopUp, _topUpArea, _closeButton;
  function _configureTopUpScreen() {
    _topUpArea = document.getElementById('topup');
    _inputTopUpCode = document.getElementById('topup-code-input');
    _closeButton = document.getElementById('topup-close-button');
    _closeButton.addEventListener('click', function() {
      _closeCurrentView();
    });
    _buttonTopUp = document.getElementById('buttonTopUp');
    _buttonTopUp.addEventListener('click', function cc_onTopUp() {

      debug('TopUp!');
      // Strip
      var code = _inputTopUpCode.value
        .replace(/^\s+/, '').replace(/\s+$/, '');

      if (!code)
        return;

      debug('topping up with code: ' + code);
      CostControl.requestTopUp(code);

      _setTopUpScreenMode(MODE_WAITING);
      _returnTimeout = setTimeout(function ccapp_toLeftPanel() {
        if (_currentView && _currentView.id === VIEW_TOPUP)
          _closeCurrentView();
      }, DELAY_TO_RETURN);

    });
  }

  var MODE_DEFAULT = 'mode-default';
  var MODE_WAITING = 'mode-waiting';
  var MODE_INCORRECT_CODE = 'mode-incorrect-code';
  var MODE_ERROR = 'mode-error';
  function _setTopUpScreenMode(mode) {
    clearTimeout(_returnTimeout);
    _isWaitingTopUp = false;

    var _explanation = document.getElementById('topup-code-explanation');
    var _confirmation =
      document.getElementById('topup-confirmation-explanation');
    var _incorrectCode = document.getElementById('topup-incorrect-code');
    var _error = document.getElementById('topup-error');
    var _progress = document.getElementById('topup-in-progress');
    var _input = document.getElementById('topup-code-input');

    switch(mode) {
      case MODE_DEFAULT:
        _explanation.setAttribute('aria-hidden', 'false');
        _confirmation.setAttribute('aria-hidden', 'true');
        _incorrectCode.setAttribute('aria-hidden', 'true');
        _error.setAttribute('aria-hidden', 'true');
        _progress.setAttribute('aria-hidden', 'true');
        _input.removeAttribute('disabled');
        if (_confirmationReceived)
          _input.value = '';
        break;

      case MODE_WAITING:
        _explanation.setAttribute('aria-hidden', 'true');
        _confirmation.setAttribute('aria-hidden', 'false');
        _incorrectCode.setAttribute('aria-hidden', 'true');
        _error.setAttribute('aria-hidden', 'true');
        _progress.setAttribute('aria-hidden', 'false');
        _input.setAttribute('disabled', 'disabled');
        _isWaitingTopUp = true;
        break;

      case MODE_INCORRECT_CODE:
        _explanation.setAttribute('aria-hidden', 'true');
        _confirmation.setAttribute('aria-hidden', 'true');
        _incorrectCode.setAttribute('aria-hidden', 'false');
        _error.setAttribute('aria-hidden', 'true');
        _progress.setAttribute('aria-hidden', 'true');
        _input.removeAttribute('disabled');
        break;

      case MODE_ERROR:
        _explanation.setAttribute('aria-hidden', 'true');
        _confirmation.setAttribute('aria-hidden', 'true');
        _incorrectCode.setAttribute('aria-hidden', 'true');
        _error.setAttribute('aria-hidden', 'false');
        _progress.setAttribute('aria-hidden', 'true');
        _input.removeAttribute('disabled');
        break;
    }
  }

  // Attach event listeners for manual updates
  function _configureUI() {

    _configureNoCoverageInfo();
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
            _closeCurrentView();
            break;
          case 'costcontrol/topup':
            // Go directly to 
            _changeViewTo(VIEW_TOPUP);
            break;
        }
      }
    );
  }

  var VIEW_TOPUP = 'topup';
  var VIEW_NO_COVERAGE_INFO = 'no-coverage-info';
  var _currentView = null;
  function _changeViewTo(viewId) {
    _closeCurrentView();

    var view = document.getElementById(viewId);
    _currentView = {
      id: viewId,
      defaultViewport: view.dataset.viewport
    };
    view.dataset.viewport = '';
  }

  function _closeCurrentView() {
    if (!_currentView)
      return;

    var view = document.getElementById(_currentView.id);
    view.dataset.viewport = _currentView.defaultViewport;
    _currentView = null;
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
    if (updating) {
      _infoArea.classList.add('updating');
      _time.textContent = _('updating...');
    } else {
      _infoArea.classList.remove('updating');
    }
  }

  function _updateUI(balance, timestamp) {
    if (!arguments.length) {
      var lastBalance = CostControl.getLastBalance();
      balance = lastBalance ? lastBalance.balance : null;
      timestamp = lastBalance ? lastBalance.timestamp : null;
    }
    timestamp = timestamp || new Date();

    // Check for low credit
    if (balance < CostControl.getLowLimitThreshold())
      _infoArea.classList.add('low-credit');
    else
      _infoArea.classList.remove('low-credit');

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
