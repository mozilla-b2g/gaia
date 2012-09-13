/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Retrieve CostControl service
var CostControl = getService(function ccapp_onServiceReady(evt) {
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
var APP;
function setupApp() {

  // Configure close dialog to close the current dialog. Dialog includes
  // promtps and settins.
  function _configureCloseDialog() {
    var closeButtons = document.querySelectorAll('.close-dialog');
    [].forEach.call(closeButtons, function ccapp_eachCloseButton(button) {
      button.addEventListener('click', function ccapp_onCloseView() {
        appVManager.closeCurrentView();
      });
    });
  }

  // Configure close dialog to close the current setting's  dialog.
  // Settings dialogs include all of thenm related with selecting values from
  // settings and warning prompts arising from the settings view.
  function _configureCloseSettingsDialog() {
    var closeButtons = document.querySelectorAll('.close-settings-dialog');
    [].forEach.call(closeButtons, function ccapp_eachCloseButton(button) {
      button.addEventListener('click', function ccapp_onCloseView() {
        settingsVManager.closeCurrentView();
      });
    });
  }

  // Configure configuration buttons to display the application's settings
  function _configureSettingsButtons() {
    var configButtons = document.querySelectorAll('.settings-button');
    [].forEach.call(configButtons, function ccapp_eachConfigButton(button) {
      button.addEventListener('click', function ccapp_onConfig() {
        appVManager.changeViewTo('settings-view');
      });
    });
  }

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {

    // Request the application
    navigator.mozApps.getSelf().onsuccess = function ccapp_getSelf(evt) {
      APP = evt.target.result;
    };

    _configureSettingsButtons();
    _configureCloseDialog();
    _configureCloseSettingsDialog();

    // Initialize each tab (XXX: see them in /js/views/ )
    for (var viewId in Views) if (Views.hasOwnProperty(viewId))
      Views[viewId].init();

    // Handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/open':
            appVManager.closeCurrentView();
            break;

          case 'costcontrol/topup':
            Views[TAB_BALANCE].showTopUp();
            break;
        }
      }
    );

    // Update UI when localized
    window.addEventListener('localized', function ccapp_onLocalized() {
      for (var viewid in Views) if (Views.hasOwnProperty(viewid))
        Views[viewid].localize();
    });

    var currentValue = CostControl.settings.option('plantype') ||
                       CostControl.PLAN_PREPAID;
    if (CostControl.settings.option('plantype') === CostControl.PLAN_PREPAID) {
      appVManager.changeViewTo(TAB_BALANCE);
    } else {
      appVManager.changeViewTo(TAB_TELEPHONY);
    }
  }

  _init();
}

// Selects balance view or telephony depending on plantype
// Actually only shows / hides the filter
function chooseView(plantype) {
  var balance = (plantype !== CostControl.PLAN_PREPAID) ? true : false;
  var telephony = !balance;
  document.getElementById('balance-tab-filter')
    .setAttribute('aria-hidden', balance);
  document.getElementById('telephony-tab-filter')
    .setAttribute('aria-hidden', telephony);
}
