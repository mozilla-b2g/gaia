/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Service;
window.addEventListener('message', function ccwidget_onApplicationReady(evt) {
  // Retrieve the service once application is ready
  if (evt.data.type === 'applicationready') {
    Service = getService(function ccwidget_onServiceReady(evt) {
      // If the service is not ready, when ready it re-set the Service
      // object and setup the widget.
      Service = evt.detail.service;
      setupWidget();
    });
    if (Service)
      setupWidget();
  }
});

// Cost Control widget is placed in the bottom of the utility tray, over the
// quick settings buttons and is in charge of displaying current balance /
// telephony statistics (depends on the plantype) at the same time it provides
// a quick access to the Cost Control application.
function setupWidget() {

  var _widget, _leftPanel, _rightPanel;
  var _balanceView, _balanceCredit, _balanceCurrency, _balanceTime;
  var _telephonyView;
  var _dataUsageView, _dataUsageLimitView;
  var _plantype;
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
    Service.setBalanceCallbacks({
      onsuccess: _onUpdateBalanceSuccess,
      onerror: _onUpdateBalanceError,
      onstart: _onUpdateStart,
      onfinish: _onUpdateFinish
    });

    // Callback fot service state changed
    Service.onservicestatuschange = function ccwidget_onStateChange(evt) {
      var status = evt.detail;
      if (status.availability && status.roaming)
        _setWarningMode(true);
    };

    _configureAutomaticUpdates();
  }

  // Specific setup for the teelphony view
  function _configureTelephonyView() {
    _telephonyView = document.getElementById('telephony-view');

    // Update UI when some of these values change or...
    Service.settings.observe('smscount', _updateTelephonyUI);
    Service.settings.observe('calltime', _updateTelephonyUI);
    Service.settings.observe('lastreset', _updateTelephonyUI);

    // ...when the utility tray shows.
    window.addEventListener('message', function ccwidget_utilityTray(evt) {
      if (evt.data.type === 'utilitytrayshow')
        _updateTelephonyUI();
    });
  }

  // Specific setup for the data usage view
  function _configureDataUsageView() {
    _dataUsageLimitView = document.getElementById('datausage-limit-view');
    _dataUsageView = document.getElementById('datausage-view');

    // Update UI when some of these values change or...
    Service.settings.observe('data_limit', _updateDataUsageUI);
    Service.settings.observe('data_limit_value', _updateDataUsageUI);
    Service.settings.observe('lastdatausage', _updateDataUsageUI);

    // Hide / show limit bar where limit disabled / enabled
    Service.settings.observe('data_limit',
      function ccwidget_onDataLimit(enabled) {
        _dataUsageLimitView.setAttribute('aria-hidden', !enabled + '');
      }
    );

    // ...when the utility tray shows.
    window.addEventListener('message', function ccwidget_utilityTray(evt) {
      if (evt.data.type === 'utilitytrayshow')
        _updateDataUsageUI();
    });
  }

  // Attach event listeners for manual updates
  function _configureWidget() {

    function onPlanTypeChange(plantype) {
      _plantype = plantype;
      _switchView(plantype === Service.PLAN_PREPAID ?
                  'balance' : 'telephony');
    }

    _widget = document.getElementById('cost-control');
    _leftPanel = document.getElementById('left-panel');
    _rightPanel = document.getElementById('right-panel');

    // Listener to open application
    _widget.addEventListener('click', _openApp);

    _configureBalanceView();
    _configureTelephonyView();
    _configureDataUsageView();

    // Observer to see which cost control or telephony is enabled
    Service.settings.observe('plantype', onPlanTypeChange);

    // Observer to detect changes on threshold limits
    Service.settings.observe('lowlimit_threshold', _updateUI);
    Service.settings.observe('lowlimit', _updateUI);

    // Update UI when localized: wrapped in a function to avoid sending an
    // incorrect first parameter.
    window.addEventListener('localized', function ccwidget_onLocalized() {
      _updateUI();
    });

    // Full mode for data usage when only data is available
    Service.onservicestatuschange = function ccwidget_adaptLayout(evt) {

      _widget.classList.remove('full');
      _leftPanel.setAttribute('aria-hidden', 'false');

      var status = evt.detail;
      if (!status.enabledFunctionalities.balance &&
          !status.enabledFunctionalities.telephony) {

        _widget.classList.add('full');
        _leftPanel.setAttribute('aria-hidden', 'true');
      }
    };

    _updateUI();
  }

  // Return True when automatic updates are allow:
  // service ready and not roaming
  function _automaticUpdatesAllowed() {
    var status = Service.getServiceStatus();
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

    // I prefer this check in the VIEWS to keep the service as simple as
    // possible
    if (_plantype !== Service.PLAN_PREPAID) {
      debug('Not in prepaid, ignoring.');
      return;
    }

    // Ignore if the device is in roaming
    if (!_automaticUpdatesAllowed()) {
      console.warn('No automatic updates allowed');
      return;
    }

    if (_isUpdating)
      return;

    _setUpdatingMode(true); // This is purely cosmetic to show the user
                            // the updating starts as soon as he display
                            // the utility tray.

    Service.requestBalance();
  }

  // Handle the events that triggers automatic balance updates
  function _automaticCheck(evt) {
    debug('Event listened: ' + evt.type);

    switch (evt.type) {

      // When utility tray shows
      case 'utilitytrayshow':
        // Just if it have passed enough time since last update
        var balance = Service.getLastBalance();
        var lastUpdate = balance ? balance.timestamp : null;
        var now = (new Date()).getTime();
        if (lastUpdate === null ||
            (now - lastUpdate > Service.getRequestBalanceMaxDelay())) {

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
      _updateBalanceUI();
    } else {
      _telephonyView.setAttribute('aria-hidden', 'false');
      _updateTelephonyUI();
    }
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

  // Updates the balance UI with the new balance if provided, else just update
  // the widget with the last updated balance.
  function _updateBalanceUI(balanceObject) {
    balanceObject = balanceObject || Service.getLastBalance();

    // Warning mode if roaming
    var status = Service.getServiceStatus();
    _setWarningMode(status.availability && status.roaming);

    // Low credit and no credit states
    _balanceView.classList.remove('no-credit');
    _balanceView.classList.remove('low-credit');

    var balance = balanceObject ? balanceObject.balance : null;
    if (Service.settings.option('lowlimit') && balance) {
      if (balance === 0) {
        _balanceView.classList.add('no-credit');
      } else if (balance < Service.settings.option('lowlimit_threshold')) {
        _balanceView.classList.add('low-credit');
      }
    }

    // Format credit
    _balanceCurrency.textContent = balanceObject ? balanceObject.currency : '';
    _balanceCredit.textContent = formatBalance(balance);

    // Format time
    var timestamp = balanceObject ? balanceObject.timestamp : null;
    _balanceTime.textContent = formatTime(timestamp);
  }

  // Updates the telephony UIs reading the sms count, call time and last reset
  // from the service.
  function _updateTelephonyUI() {
    function toMinutes(milliseconds) {
      return Math.ceil(milliseconds / (1000 * 60));
    }

    // Dates
    var formattedTime = _('never');
    var lastReset = Service.settings.option('lastreset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('telephony-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('telephony-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Counters
    document.getElementById('telephony-calltime').textContent =
      toMinutes(Service.settings.option('calltime'));
    document.getElementById('telephony-smscount').textContent =
      Service.settings.option('smscount');

  }

  // Updates the limit bar
  function _renderLimitBar() {

    // Get UI elements
    var leftTag = _dataUsageLimitView.querySelector('dt.start');
    var leftValue = _dataUsageLimitView.querySelector('dd.start');
    var rightTag = _dataUsageLimitView.querySelector('dt.end');
    var rightValue = _dataUsageLimitView.querySelector('dd.end');
    var progress = _dataUsageLimitView.querySelector('progress');

    // Get current total and limit
    var currentLimit = Service.dataLimitInBytes;
    var currentWarning = currentLimit * Service.getDataUsageWarning();

    var currentUsage = 0;
    var dataUsage = Service.settings.option('lastdatausage');
    if (dataUsage)
      currentUsage = dataUsage.mobile.total;

    // Determine mode
    _dataUsageLimitView.classList.remove('nearby-limit');
    _dataUsageLimitView.classList.remove('reached-limit');

    // Normal mode
    if (currentUsage <= currentLimit) {
      leftTag.textContent = _('used');
      rightTag.textContent = _('limit');
      leftValue.textContent = roundData(currentUsage).join(' ');
      rightValue.textContent = roundData(currentLimit).join(' ');
      progress.setAttribute('max', currentLimit);
      progress.setAttribute('value', currentUsage);

      // Warning mode
      if (currentUsage > currentWarning) {
        _dataUsageLimitView.classList.add('nearby-limit');
      }

    // Limit exceeded mode
    } else {
      leftTag.textContent = _('limit-passed');
      rightTag.textContent = _('used');
      leftValue.textContent = roundData(currentLimit).join(' ');
      rightValue.textContent = roundData(currentUsage).join(' ');
      progress.setAttribute('max', currentUsage);
      progress.setAttribute('value', currentLimit);

      _dataUsageLimitView.classList.add('reached-limit');
    }
  }

  // Show current usage
  function _showCurrentUsage() {
    var currentUsage = 0;
    var dataUsage = Service.settings.option('lastdatausage');
    if (dataUsage)
      currentUsage = dataUsage.mobile.total;
    var formatted = roundData(currentUsage);

    var valueSpan = _dataUsageView.querySelector('span:first-of-type');
    valueSpan.textContent = formatted[0];
    var unitSpan = _dataUsageView.querySelector('span.unit');
    unitSpan.textContent = formatted[1];
  }

  // Updates widget's data usage UI
  function _updateDataUsageUI() {
    if (Service.settings.option('data_limit'))
      _renderLimitBar();
    else
      _showCurrentUsage();
  }

  // Refresh all UIs
  function _updateUI() {
    _updateBalanceUI();
    _updateTelephonyUI();
    _updateDataUsageUI();
  }

  _init();
}
