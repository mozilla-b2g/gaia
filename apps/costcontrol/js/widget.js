/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl;
window.addEventListener('message', function ccwidget_onApplicationReady(evt) {
  // Retrieve CostControl service once application is ready
  if (evt.data.type === 'applicationready') {
    CostControl = getService(function ccwidget_onServiceReady(evt) {
      // If the service is not ready, when ready it re-set the CostControl
      // object and setup the widget.
      CostControl = evt.detail.service;
      setupWidget();
    });
    if (CostControl)
      setupWidget();
  }
});

// Cost Control widget is placed in the bottom of the utility tray, over the
// quick settings buttons and is in charge of displaying current balance /
// telephony statistics (depends on the plantype) at the same time it provides
// a quick access to the Cost Control application.
function setupWidget() {

  var _widget;
  var _balanceView, _balanceCredit, _balanceCurrency, _balanceTime;
  var _telephonyView;
  var _isUpdating = false;
  var _onWarning = false; // warning state is true when automatic udpates are
                          // disabled or some update error occurs.

  // On balance updating success, update UI with the new balance
  function _onUpdateBalanceSuccess(evt) {
    var balance = evt.detail;
    _setWarningMode(false);
    _updateBalanceUI(balance);
  }

  // On balance updating error, set warning mode and interrumpt updating mode
  // Note we need to interrupt updating mode because no finish event is launched
  // when error.
  function _onUpdateBalanceError(evt) {
    _setWarningMode(true);
    _setUpdatingMode(false);
    _updateBalanceUI();
  }

  // On starting an update, enter into update mode
  // This shows the updating icon even when updating has been triggered from
  // another view such as the Cost Control application.
  function _onUpdateStart(evt) {
    _setUpdatingMode(true);
  }

  // On ending an update, exit from update mode
  function _onUpdateFinish(evt) {
    _setUpdatingMode(false);
  }

  // Open the cost control & data usage application
  function _openApp() {
    var activity = new MozActivity({ name: 'costcontrol/open' });
  }

  // Specific setup for the balance view
  function _configureBalanceView() {
    _balanceView = document.getElementById('balance-view');
    _balanceCredit = document.getElementById('balance-credit');
    _balanceCurrency = document.getElementById('balance-currency');
    _balanceTime = document.getElementById('balance-time');

    // Suscribe callbacks for balance updating success and error to the service
    CostControl.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError,
      onstart: _onUpdateStart,
      onfinish: _onUpdateFinish
    });

    // Callback fot service state changed
    CostControl.onservicestatuschange = function ccwidget_onStateChange(evt) {
      var status = evt.detail;
      if (status.availability && status.roaming)
        _setWarningMode(true);
    };

    _configureAutomaticUpdates();
  }

  // Specific setup for the teelphony view
  function _configureTelephonyView() {
    _telephonyView = document.getElementById('telephony-view');
    CostControl.settings.observe('smscount', _updateTelephonyUI);
    CostControl.settings.observe('calltime', _updateTelephonyUI);
    CostControl.settings.observe('lastreset', _updateTelephonyUI);

    window.addEventListener('message', function ccwidget_utilityTray(evt) {
      if (evt.data.type === 'utilitytrayshow')
        _updateTelephonyUI();
    });
  }

  // Attach event listeners for manual updates
  function _configureWidget() {
    _widget = document.getElementById('cost-control');

    // Listener to open application
    _widget.addEventListener('click', _openApp);

    _configureBalanceView();
    _configureTelephonyView();

    // Observer to see which cost control or telephony is enabled
    CostControl.settings.observe(
      'plantype',
      function ccwidget_onPlanTypeChange(plantype) {
        _switchView(plantype === 'prepaid' ? 'balance' : 'telephony');
      }
    );

    // Update UI when localized
    window.addEventListener('localized', function ccwidget_onLocalized() {
      _updateUI();
    });

    var plantype = CostControl.settings.option('plantype');
    _switchView(plantype === 'prepaid' ? 'balance' : 'telephony');

    _updateUI();
  }

  // Return True when automatic updates are allow:
  // service ready and not roaming
  function _automaticUpdatesAllowed() {
    var status = CostControl.getServiceStatus();
    return status.availability && !status.roaming;
  }

  // Attach event listeners for automatic updates
  //  * After showing the utility tray
  function _configureAutomaticUpdates() {
    window.addEventListener('message', function ccwidget_utilityTray(evt) {
      if (evt.data.type === 'utilitytrayshow')
        _automaticCheck(evt.data);
    });
  }

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  function _init() {
    _configureWidget();
  }

  // Request a balance update from the service
  function _requestUpdateBalance() {
    if (_isUpdating)
      return;

    CostControl.requestBalance();
  }

  // Handle the events that triggers automatic balance updates
  function _automaticCheck(evt) {
    debug('Event listened: ' + evt.type);

    // Ignore if the device is in roaming
    if (!_automaticUpdatesAllowed()) {
      console.warn('No automatic updates allowed');
      return;
    }

    switch (evt.type) {

      // When utility tray shows
      case 'utilitytrayshow':
        // Just if it have passed enough time since last update
        var balance = CostControl.getLastBalance();
        var lastUpdate = balance ? balance.timestamp : null;
        var now = (new Date()).getTime();
        if (lastUpdate === null ||
            (now - lastUpdate > CostControl.getRequestBalanceMaxDelay())) {

          _setUpdatingMode(true); // This is purely cosmetic to show the user
                                  // the updating starts as soon as he display
                                  // the utility tray.
          _requestUpdateBalance();
        }

        break;
    }
  }

  // Switch view to balance / telephony
  function _switchView(view) {
    _balanceView.setAttribute('aria-hidden', 'true');
    _telephonyView.setAttribute('aria-hidden', 'true');

    if (view === 'balance') {
      _balanceView.setAttribute('aria-hidden', 'false');
    } else {
      _telephonyView.setAttribute('aria-hidden', 'false');
    }

    _updateBalanceUI();
  }

  // Enable / disable warning mode for the UI
  function _setWarningMode(warning) {
    _onWarning = warning;
    if (warning) {
      _balanceView.classList.add('warning');
    } else {
      _balanceView.classList.remove('warning');
    }
  }

  // Enable / disable waiting mode for the UI
  function _setUpdatingMode(updating) {
    _isUpdating = updating;
    if (updating) {
      _balanceView.classList.add('updating');
      _balanceTime.textContent = _('updating') + '...';
    } else {
      _balanceView.classList.remove('updating');
    }
  }

  // Return a time string in format (Today|Yesterday|<WeekDay>), hh:mm
  // if timestamp is a valid date. If not, it returns Never.
  function _formatTime(timestamp) {
    if (!timestamp)
      return _('never');

    var time = timestamp.toLocaleFormat('%H:%M');
    var date = timestamp.toLocaleFormat('%a');
    var dateDay = parseInt(timestamp.toLocaleFormat('%u'), 10);
    var now = new Date();
    var nowDateDay = parseInt(now.toLocaleFormat('%u'), 10);

    if (nowDateDay === dateDay) {
      date = _('today');
    } else if ((nowDateDay === dateDay + 1) ||
              (nowDateDay === 1 && dateDay === 7)) {
      date = _('yesterday');
    }

    return date + ', ' + time;
  }

  // Updates the balance UI with the new balance if provided, else just update
  // the widget with the last updated balance.
  function _updateBalanceUI(balanceObject) {
    balanceObject = balanceObject || CostControl.getLastBalance();

    // Warning mode if roaming
    var status = CostControl.getServiceStatus();
    _setWarningMode(status.availability && status.roaming);

    // Low credit state
    var balance = balanceObject ? balanceObject.balance : null;
    if (balance && balance < CostControl.getLowLimitThreshold()) {
      _balanceView.classList.add('low-credit');
    } else {
      _balanceView.classList.remove('low-credit');
    }

    // Format credit
    var formattedBalance = '--';
    if (balance !== null) {
      var splitBalance = (balance.toFixed(2)).split('.');
      formattedBalance = '&i.&d'
        .replace('&i', splitBalance[0])
        .replace('&d', splitBalance[1]);
    }
    _balanceCurrency.textContent = balanceObject ? balanceObject.currency : '';
    _balanceCredit.textContent = formattedBalance;

    // Format time
    var timestamp = balanceObject ? balanceObject.timestamp : null;
    _balanceTime.textContent = _formatTime(timestamp);
  }

  // Updates the telephony UIs reading the sms count, call time and last reset
  // from the service.
  function _updateTelephonyUI() {
    function toMinutes(milliseconds) {
      return Math.ceil(milliseconds / (1000 * 60));
    }

    // Dates
    var formattedTime = _('never');
    var lastReset = CostControl.settings.option('lastreset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('telephony-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('telephony-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Counters
    document.getElementById('telephony-calltime').textContent =
      toMinutes(CostControl.settings.option('calltime'));
    document.getElementById('telephony-smscount').textContent =
      CostControl.settings.option('smscount');

    debug('SMSCount: ' + CostControl.settings.option('smscount'));
    debug('CallTime: ' + CostControl.settings.option('calltime'));
  }

  // Refresh all UIs
  function _updateUI() {
    _updateBalanceUI();
    _updateTelephonyUI();
  }

  _init();
}
