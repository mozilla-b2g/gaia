/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
var VIEW_SETTINGS = 'settings-view';
Views[VIEW_SETTINGS] = (function cc_setUpDataSettings() {

  var DIALOG_PLAN_SETUP = 'plantype-setup-dialog';
  var DIALOG_TRACKING_PERIOD_SETUP = 'tracking-period-setup-dialog';
  var DIALOG_RESET_WEEKDAY_SETUP = 'reset-weekday-setup-dialog';
  var DIALOG_RESET_MONTHDAY_SETUP = 'reset-monthday-setup-dialog';

  var _planTypeHasChanged = false;

  // Plantype can be PLAN_POSTPAID or PLAN_PREPAID. The general layout
  // of the application and setings depend on this option.
  function _configurePlanTypeSetup() {
    // Get the widget
    var planSetup = document.getElementById('settings-view-plantype-setup');

    // Configure to enter the dialog with options
    planSetup.addEventListener('click', function cc_onclickPlanSetup() {
      settingsVManager.changeViewTo(DIALOG_PLAN_SETUP);
    });

    // Configure an observer to detect when the plantype setting change
    CostControl.settings.observe(
      'plantype',
      function ccapp_onPlanTypeChange(value, oldValue) {
        value = value || CostControl.PLAN_PREPAID;
        _planTypeHasChanged = (value !== oldValue);
        chooseView(value);
        _updateUI();
      }
    );

    // When accepting the dialog to select plan type, sets the proper value
    var id = '#' + DIALOG_PLAN_SETUP;
    var okButton = document.querySelector(id + ' button');
    okButton.addEventListener('click', function cc_onclickOk() {
      var selected = document
        .querySelector(id + ' [type="radio"]:checked');

      CostControl.settings.option('plantype', selected.value);
    });
  }

  // Low limit allows the user enable a visual feedback when he is running
  // out of credit.
  function _configureLowLimitSetup() {

    // Keep a passive view of the current credit
    function onBalanceSuccess(balanceObject) {
      // Format credit
      var balance = balanceObject ? balanceObject.balance : null;
      var currency = balanceObject ? balanceObject.currency : '';
      settingsCurrency.textContent = currency;
      settingsLowLimitCurrency.textContent = currency;
      settingsCredit.textContent = formatBalance(balance);

      // Format time
      var timestamp = balanceObject ? balanceObject.timestamp : null;
      settingsTime.textContent = formatTime(timestamp);
    }

    // Enable / disable the settings entry for low limit value
    function switchLowLimit() {
      lowLimitSetup.setAttribute(
        'aria-disabled', (!lowLimitSwitch.checked) + '');
      lowLimitValue.disabled = !lowLimitSwitch.checked;

      CostControl.settings.option('lowlimit', lowLimitSwitch.checked);
    }

    var settingsCurrency = document.getElementById('settings-currency');
    var settingsLowLimitCurrency =
      document.getElementById('settings-low-limit-currency');
    var settingsCredit = document.getElementById('settings-credit');
    var settingsTime = document.getElementById('settings-time');

    // Keep updated the balance view
    CostControl.setBalanceCallbacks({ onsuccess: onBalanceSuccess });
    onBalanceSuccess(CostControl.getLastBalance());

    var lowLimitSwitch = document.getElementById('settings-low-limit-switch');
    var lowLimitSetup = document.getElementById('setting-item-low-limit-setup');
    var lowLimitValue = document.getElementById('settings-low-limit-value');

    // Set initial values
    lowLimitValue.value =
      CostControl.settings.option('lowlimit_threshold') || 0;
    lowLimitSwitch.checked = CostControl.settings.option('lowlimit') || false;

    // The switch enable / disable alarm and the input sets the threshold
    lowLimitSwitch.addEventListener('click', switchLowLimit);
    lowLimitValue.addEventListener('change', function ccapp_setLowLimit() {
      var value = parseFloat(lowLimitValue.value);
      CostControl.settings.option(
        'lowlimit_threshold', 
        isNaN(value) ? 0 : value
      );
    });

    // Sync input and switch states
    switchLowLimit();
  }

  // The tracking period is the same for PLAN_PREPAID and PLAN_POSTPAID.
  // Differences are not visible from the view, just in the service.
  // This is a combination of two fields, period and time.
  function _configureTrackingPeriodSetup() {
    // Get thw widgets
    var trackingPeriod =
      document.getElementById('settings-view-tracking-period-setup');
    var resetTime =
      document.getElementById('settings-view-reset-time-setup');

    // Configure to enter dialog with tracking periods options
    trackingPeriod.addEventListener('click', function ccapp_onclickPeriod() {
      settingsVManager.changeViewTo(DIALOG_TRACKING_PERIOD_SETUP);
    });

    // Configure to enter dialog with weekdays or month day
    resetTime.addEventListener('click', function ccapp_onclickTime() {
      var trackingPeriod = CostControl.settings.option('tracking_period');
      var target = trackingPeriod === CostControl.TRACKING_WEEKLY ?
        DIALOG_RESET_WEEKDAY_SETUP : DIALOG_RESET_MONTHDAY_SETUP;

      settingsVManager.changeViewTo(target);
    });

    // Configure the tracking period dialog
    var resetTimeItem =
      document.getElementById('setting-item-reset-time-setup');

    // Change option
    var trackingPeriodOk = document.getElementById('tracking-period-ok');
    trackingPeriodOk.addEventListener(
      'click',
      function ccapp_onTrackingPeriodOk() {
        var selected = document.querySelector(
          '#' + DIALOG_TRACKING_PERIOD_SETUP + ' [type="radio"]:checked');

        // Disable reset time when tracking period is never
        resetTimeItem.setAttribute(
          'aria-disabled',
          (selected.value === CostControl.TRACKING_NEVER) + ''
        );
        resetTime.disabled = (selected.value === CostControl.TRACKING_NEVER);

        CostControl.settings.option('tracking_period', selected.value);
      }
    );

    // Return to previous value
    var trackingPeriodCancel = document.getElementById('tracking-period-cancel');
    trackingPeriodCancel.addEventListener(
      'click',
      function ccapp_onTrackingPeriodCancel() {
        var currentValue = CostControl.settings.option('tracking_period');
        document.querySelector(
          '#' + DIALOG_TRACKING_PERIOD_SETUP + 
          ' [type="radio"][value="' + currentValue + '"]'
        ).checked = true;
        console.log('ey!');
      }
    );

    // Observers for the settings
    CostControl.settings.observe('tracking_period', _updateUI);
    CostControl.settings.observe('reset_time', _updateUI);
  }

  // Configures the UI
  function _configureUI() {
    _configurePlanTypeSetup();
    _configureLowLimitSetup();
    _configureTrackingPeriodSetup();
  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configureUI();

    // To close settings depending on plantype
    var closeSettings = document.getElementById('close-settings');
    closeSettings.addEventListener('click', function cc_closeSettings() {

      // If plan has changed and we are not hiding data usage
      // show the proper view
      if (_planTypeHasChanged &&
          appVManager.getCurrentView() !== TAB_DATA_USAGE) {

        if (CostControl.settings.option('plantype') ===
            CostControl.PLAN_PREPAID) {

          appVManager.changeViewTo(TAB_BALANCE);
        } else {
          appVManager.changeViewTo(TAB_TELEPHONY);
        }

        _planTypeHasChanged = false;

      // If not, just close the current view
      } else {
        appVManager.closeCurrentView();
      }
    });

    _updateUI();
  }

  // Repaint settings interface reading from local settings and localizing
  function _updateUI() {

    // Keep the synchronization between selection buttons and secelting dialogs
    function syncSetting(option, defaultValue, from, to) {

      // Convert parameters into id and actual options values
      from = '#' + from;
      to = '#' + to;
      option = CostControl.settings.option(option);

      var template = from + ' [type="radio"][value="&value"]';
      var query = template.replace(
        '&value',
        option !== null ? option : defaultValue
      );

      var radio = document.querySelector(query);
      if (!radio)
        query = template.replace('&value', defaultValue);
      radio = document.querySelector(query);
      radio.setAttribute('checked', 'checked');
      var valueTag = document.querySelector(query + ' + span');
      var tag = document.querySelector(to + ' .tag');
      tag.textContent = valueTag.textContent;
    }

    // Plantype
    syncSetting(
      'plantype',
      CostControl.PLAN_PREPAID,
      DIALOG_PLAN_SETUP,
      'settings-view-plantype-setup'
    );

    // Tracking period
    syncSetting(
      'tracking_period',
      CostControl.TRACKING_MONTHLY,
      DIALOG_TRACKING_PERIOD_SETUP,
      'settings-view-tracking-period-setup'
    );

    // Reset time
    var trackingPeriod = CostControl.settings.option('tracking_period');
    if (trackingPeriod !== CostControl.TRACKING_NEVER) {
      syncSetting(
        'reset_time',
        '1',
        trackingPeriod === CostControl.TRACKING_WEEKLY ? 
        DIALOG_RESET_WEEKDAY_SETUP : DIALOG_RESET_MONTHDAY_SETUP,
        'settings-view-reset-time-setup'
      );
    }
  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  return {
    init: _init,
    localize: _localize,
    updateUI: _updateUI
  };

}());
