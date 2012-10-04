/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Balance Tab is in charge of offer detailed information about current
// credit as well as allow the user to top up.
var TAB_BALANCE = 'balance-tab';
viewManager.tabs[TAB_BALANCE] = (function cc_setUpBalanceTab() {

  var ONE_SECOND = 1000;
  var DELAY_TO_RETURN = 10 * 1000; // 10 seconds
  var NO_SERVICE_ERRORS = {'no-coverage': true, 'carrier-unknown': true};

  // Views and dialogs IDs
  var VIEW_TOPUP = 'topup-view';
  var DIALOG_SERVICE_UNAVAILABLE = 'service-unavailable-info-dialog';
  var DIALOG_APPLICATION_ERROR = 'application-error-info-dialog';
  var DIALOG_UNSUPPORTED_CARRIER = 'unsupported-carrier';

  // Update balance control
  var _plantype;
  var _isUpdating = false;
  var _onWarning = false; // warning state is true when roaming, or some
                          // inconvenient during updating process.

  // Top up control
  var _isWaitingTopUp = false;
  var _lastTopUpIncorrect = false;
  var _lastTopUpConfirmed = true;
  var _returnTimeout = 0;
  var _countdownInterval = 0;

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    var balance = evt.detail;
    _setWarningMode(false);
    _updateUI(balance);
  }

  // On balance updating error, if manual request, notificate
  // Note we exit the updating mode because no finish event is raised when
  // error.
  function _onUpdateBalanceError(evt) {
    _setUpdatingMode(false);
    _setWarningMode(true);
    _updateUI();
    _setBalanceScreenMode(MODE_ERROR); // order is important here, it needs to
                                       // be after _updateUI()
  }

  // On starting an update, enter into update mode
  // As in widget.js this let us enter into updating mode when starting the
  // updating process from other places.
  function _onUpdateStart(evt) {
    _setUpdatingMode(true);
  }

  // On ending an update, exit from update mode
  function _onUpdateFinish(evt) {
    _setUpdatingMode(false);
  }

  // On top up success, notificate and request update balance
  function _onTopUpSuccess(evt) {
    var notification = navigator.mozNotification.createNotification(
      _('topup-confirmation-title'),
      _('topup-confirmation-message'),
      APP_ICON
    );
    notification.show();

    _lastTopUpConfirmed = true;
    _lastTopUpIncorrect = false;

    var status = CostControl.getServiceStatus();
    if (status.availability && !status.roaming)
      _requestUpdateBalance();
  }

  // On top up error, several cases, see comments inline:
  function _onTopUpError(evt) {
    clearTimeout(_returnTimeout);
    _onTopUpFinish();

    switch (evt.detail.reason) {
      case 'sending-error':
        // Display error in the top up screen
        _setTopUpScreenMode(MODE_ERROR);
        break;

      case 'timeout':
        // Inform in the balance screen about the timeout
        _lastTopUpConfirmed = false;
        _setBalanceScreenMode(MODE_TOP_UP_TIMEOUT);
        break;

      case 'incorrect-code':
        // Inform in the top up screen and notificate
        _lastTopUpIncorrect = true;
        _setTopUpScreenMode(MODE_INCORRECT_CODE);
        var notification = navigator.mozNotification.createNotification(
          _('topup-incorrectcode-title'),
          _('topup-incorrectcode-message'),
          APP_ICON
        );
        notification.onclick = function ccapp_onNotificationClick() {
          var activity = new MozActivity({ name: 'costcontrol/topup' });
        };
        notification.show();
        break;
    }
    _updateUI();
  }

  // When starting the top up, show and start the top up countdown
  function _onTopUpStart() {
    _setTopUpCountdown(true);
    _startTopUpCountdown();
  }

  // When finished the top up, hide and clear the top up countdown
  function _onTopUpFinish() {
    _setTopUpCountdown(false);
    _stopTopUpCountdown();
  }

  var _balanceTab;
  var _btCredit; // bt stands for Balance Tab
  var _btTime;
  var _btCurrency;

  // Configures the balance tab: get interactive elements and set callbacks
  function _configureBalanceTab() {
    _balanceTab = document.getElementById('balance-tab');
    _btCurrency = document.getElementById('balance-tab-currency');
    _btCredit = document.getElementById('balance-tab-credit');
    _btTime = document.getElementById('balance-tab-time');

    var balanceFilter = document.getElementById('balance-tab-filter');
    balanceFilter.addEventListener('click', function ccapp_onBalanceTab() {
      viewManager.changeViewTo(TAB_BALANCE);
    });

    var btRequestUpdateButton =
      document.getElementById('balance-tab-update-button');
    btRequestUpdateButton.addEventListener('click', _requestUpdateBalance);

    var btRequestTopUpButton =
      document.getElementById('balance-tab-topup-button');
    btRequestTopUpButton.addEventListener('click', _requestTopUp);

    var btRequestUSSDTopUpButton =
      document.getElementById('balance-tab-topup-ussd-button');
    btRequestUSSDTopUpButton.addEventListener('click', _requestUSSDTopUp);
  }

  // TODO: remove when autofocus became available from B2G
  // Give the focus to the top up code input
  function _focusCodeInput() {
    document.getElementById('topup-code-input').focus();
  }

  // Configure the top up screen, the close button and the send button
  function _configureTopUpScreen() {

    var input = document.getElementById('topup-code-input');
    var buttonTopUp = document.getElementById('topup-send-button');
    buttonTopUp.addEventListener('click', function ccapp_onSend() {

      // Get and clean the code
      var code = input.value.replace(/^\s+/, '').replace(/\s+$/, '');
      if (!code)
        return;

      debug('topping up with code: ' + code);
      CostControl.requestTopUp(code);

      // Change the top up screen to enter waiting mode and add a timeout to
      // return in a while.
      _isWaitingTopUp = true;
      _setTopUpScreenMode(MODE_WAITING);
      _returnTimeout = setTimeout(function ccapp_backToBalance() {
        if (viewManager.isCurrentView(VIEW_TOPUP))
          viewManager.closeCurrentView();
      }, DELAY_TO_RETURN);

    });
  }

  // Automatic updates when showing the application
  function _configureAutomaticUpdates() {
    document.addEventListener('mozvisibilitychange',
      function ccapp_visibility(evt) {
        var status = CostControl.getServiceStatus();
        // In roaming, no automatic updates are allowed
        if (!document.mozHidden && status.availability && !status.roaming)
          _requestUpdateBalance();
      }
    );
  }

  // Attach event listeners for manual updates
  function _configureUI() {

    function onPlanTypeChange(plantype) {
      _plantype = plantype;
    }

    function justUpdateUI() {
      _updateUI();
    }

    _configureBalanceTab();
    _configureTopUpScreen();

    // Callbacks for update balance
    CostControl.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError,
      onstart: _onUpdateStart,
      onfinish: _onUpdateFinish
    });

    // Callbacks for topping up
    CostControl.setTopUpCallbacks({
      onsuccess: _onTopUpSuccess,
      onerror: _onTopUpError,
      onstart: _onTopUpStart,
      onfinish: _onTopUpFinish
    });

    // Callback fot service state changed
    CostControl.onservicestatuschange = function ccapp_onStateChange(evt) {
      var status = evt.detail;
      if (status.availability && status.roaming) {
        _setWarningMode(true);
        _setBalanceScreenMode(MODE_ROAMING);
      }
    };

    // Observer to see which cost control or telephony is enabled
    CostControl.settings.observe('plantype', onPlanTypeChange);
    onPlanTypeChange(CostControl.settings.option('plantype'));

    // Observer to detect changes on threshold limits
    CostControl.settings.observe('lowlimit_threshold', justUpdateUI);
    CostControl.settings.observe('lowlimit', justUpdateUI);
  }

  var MODE_DEFAULT = 'mode-default';
  var MODE_WAITING = 'mode-waiting';
  var MODE_INCORRECT_CODE = 'mode-incorrect-code';
  var MODE_ERROR = 'mode-error';
  var MODE_ROAMING = 'mode-roaming';
  var MODE_TOP_UP_TIMEOUT = 'mode-top-up-timeout';

  // Set the topscreen mode:
  //  DEFAULT: invites the user to enter the top up code
  //  WAITING: displays the spinner and tell the user we are topping up
  //  INCORRECT_CODE: remember the user last code was incorrect and invites him
  //                  to retype the code
  //  ERROR: tell the user we could not top up at the moment
  function _setTopUpScreenMode(mode) {
    clearTimeout(_returnTimeout);

    var explanation = document.getElementById('topup-code-explanation');
    var confirmation =
      document.getElementById('topup-confirmation-explanation');
    var incorrectCode = document.getElementById('topup-incorrect-code');
    var error = document.getElementById('topup-error');
    var progress = document.getElementById('topup-in-progress');
    var input = document.getElementById('topup-code-input');

    // Reset the screen (hide everything)
    explanation.setAttribute('aria-hidden', 'true');
    confirmation.setAttribute('aria-hidden', 'true');
    incorrectCode.setAttribute('aria-hidden', 'true');
    error.setAttribute('aria-hidden', 'true');
    progress.setAttribute('aria-hidden', 'true');
    input.removeAttribute('disabled');

    debug(mode);
    switch (mode) {
      case MODE_DEFAULT:
        explanation.setAttribute('aria-hidden', 'false');
        if (_lastTopUpConfirmed)
          input.value = '';

        break;

      case MODE_WAITING:
        confirmation.setAttribute('aria-hidden', 'false');
        progress.setAttribute('aria-hidden', 'false');
        input.setAttribute('disabled', 'disabled');
        break;

      case MODE_INCORRECT_CODE:
        incorrectCode.setAttribute('aria-hidden', 'false');
        break;

      case MODE_ERROR:
        error.setAttribute('aria-hidden', 'false');
        break;
    }
  }

  // Add zeros if length of the number is lower than 2
  function _pad(number) {
    number = number + '';
    if (number.length < 2)
      number = '0' + number;

    return number;
  }

  // Using a closure, setup the countdown for the top up waiting.
  function _startTopUpCountdown() {
    var seconds = Math.floor(CostControl.getTopUpTimeout() / 1000);
    var countdownHolder = document.getElementById('top-up-countdown');

    _stopTopUpCountdown();
    _countdownInterval = setInterval(function ccapp_renderCountdown() {
      var remainingSeconds = seconds % 60;
      var minutes = Math.floor(seconds / 60);
      countdownHolder.textContent = _pad(minutes) + ':' +
                                    _pad(remainingSeconds);
      if (seconds === 0)
        clearInterval(_countdownInterval);
      seconds -= 1;
    }, ONE_SECOND);
  }

  // Stops the countdown fot the top up waiting
  function _stopTopUpCountdown() {
    var seconds = Math.floor(CostControl.getTopUpTimeout() / 1000);
    var remainingSeconds = seconds % 60;
    var minutes = Math.floor(seconds / 60);
    var countdownHolder = document.getElementById('top-up-countdown');
    countdownHolder.textContent = _pad(minutes) + ':' + _pad(remainingSeconds);
    clearTimeout(_countdownInterval);
  }

  // Enable / disable the countdown area for the top up and disable / enable
  // the top up button respectively.
  function _setTopUpCountdown(enabled) {
    var topUpButton = document.getElementById('balance-tab-topup-button');
    var countdown = document.getElementById('cost-control-topup-countdown');
    countdown.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    if (enabled) {
      topUpButton.setAttribute('disabled', 'disabled');
    } else {
      topUpButton.removeAttribute('disabled');
    }
  }

  // Set the balance screen mode:
  //  DEFAULT: the error area keeps hidden
  //  ERROR: inform the user about an error in the service
  //  ROAMING: inform the user that he is on roaming
  //
  // TODO: Avoid the following situation:
  // Please note if you need to call _setBalanceScreenMode() in addition with
  // _updateUI(), please call the latter first because it calls this
  // function too and the effect will be override.
  function _setBalanceScreenMode(mode) {
    var _messageArea = document.getElementById('cost-control-message-area');
    var _roaming = document.getElementById('on-roaming-message');
    var _error = document.getElementById('balance-error-message');
    var _topupTimeout = document.getElementById('on-topup-not-confirmed');

    // By default hide both errors but show the message area.
    // This force us to explicitly add a case for MODE_DEFAULT
    _roaming.setAttribute('aria-hidden', 'true');
    _error.setAttribute('aria-hidden', 'true');
    _topupTimeout.setAttribute('aria-hidden', 'true');
    _messageArea.setAttribute('aria-hidden', 'false');

    switch (mode) {
      case MODE_DEFAULT:
        _messageArea.setAttribute('aria-hidden', 'true');
        break;

      case MODE_ERROR:
        _error.setAttribute('aria-hidden', 'false');
        break;

      case MODE_ROAMING:
        _roaming.setAttribute('aria-hidden', 'false');
        break;

      case MODE_TOP_UP_TIMEOUT:
        _topupTimeout.setAttribute('aria-hidden', 'false');
        break;
    }
  }

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {
    debug('Initializing Balance Tab');
    _configureUI();

    if (CostControl.checkEnableConditions()) {
      _configureAutomaticUpdates();
    }

    _updateUI();
  }

  // Request a balance update to the service
  function _requestUpdateBalance() {

    // I prefer this check in the VIEWS to keep the service as simple as
    // possible
    if (_plantype !== CostControl.PLAN_PREPAID) {
      debug('Not in prepaid, ignoring.');
      return;
    }

    if (_isUpdating)
      return;

    // Check for service availability and inform and abort if not present
    var status = CostControl.getServiceStatus();
    if (status.detail in NO_SERVICE_ERRORS) {
      viewManager.changeViewTo(DIALOG_SERVICE_UNAVAILABLE);
      return;
    }

    if (!CostControl.checkEnableConditions()) {
      viewManager.changeViewTo(DIALOG_UNSUPPORTED_CARRIER);
      return;
    }

    _setUpdatingMode(true); // this is cosmetic, as in the widget.js, this is
                            // only to produce the illusion that updating starts
                            // as soon as the button is pressed.
    CostControl.requestBalance();
  }


  // Actually it does not request anything, just sends the user to the top up
  // screen.
  function _requestTopUp() {
    var status = CostControl.getServiceStatus();
    if (status.detail in NO_SERVICE_ERRORS) {
      viewManager.changeViewTo(DIALOG_SERVICE_UNAVAILABLE);
      return;
    }

    if (!_isWaitingTopUp && !_lastTopUpIncorrect)
      _setTopUpScreenMode(MODE_DEFAULT);

    viewManager.changeViewTo(VIEW_TOPUP, _focusCodeInput);
  }

  // Check for system availability. If so, ask for USSD topup.
  function _requestUSSDTopUp() {
    var status = CostControl.getServiceStatus();
    if (status.detail in NO_SERVICE_ERRORS) {
      viewManager.changeViewTo(DIALOG_SERVICE_UNAVAILABLE);
      return;
    }
    CostControl.requestUSSDTopUp();
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;
    if (updating) {
      _balanceTab.classList.add('updating');
      _btTime.textContent = _('updating') + '...';
    } else {
      _balanceTab.classList.remove('updating');
    }
  }

  // Enables / disables warning mode
  function _setWarningMode(warning) {
    _onWarning = warning;
    if (warning) {
      _balanceTab.classList.add('warning');
    } else {
      _balanceTab.classList.remove('warning');
    }
  }

  // Updates the UI with the new balance if provided, else just update the
  // balance screen with the last updated value.
  function _updateUI(balanceObject) {
    balanceObject = balanceObject || CostControl.getLastBalance();


    // Warning if roaming
    var status = CostControl.getServiceStatus();
    var onRoaming = status.availability && status.roaming;
    _setWarningMode(onRoaming);
    if (onRoaming)
      _setBalanceScreenMode(MODE_ROAMING);

    // Check for low credit
    var balance = balanceObject ? balanceObject.balance : null;
    if (CostControl.settings.option('lowlimit') &&
        balance &&
        balance < CostControl.settings.option('lowlimit_threshold')) {

      _balanceTab.classList.add('low-credit');
    } else {
      _balanceTab.classList.remove('low-credit');
    }

    // Format balance
    _btCurrency.textContent = balanceObject ? balanceObject.currency : '';
    _btCredit.textContent = formatBalance(balance);

    // Format time
    var timestamp = balanceObject ? balanceObject.timestamp : null;
    _btTime.textContent = formatTime(timestamp);
  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  return {
    init: _init,
    updateUI: _updateUI,
    localize: _localize,
    showTopUp: function ccapp_showTopUp() {
      viewManager.changeViewTo(VIEW_TOPUP, _focusCodeInput);
    }
  };
}());

Views[TAB_BALANCE] = viewManager.tabs[TAB_BALANCE];
