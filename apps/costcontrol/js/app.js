/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Request the application icon.
// XXX: It is only used in balance view but I prefer to leave it here as
// balance is a subview of the cost control application.
var APP_ICON;
navigator.mozApps.getSelf().onsuccess = function ccapp_getSelf(evt) {
  var app = evt.target.result;
  var icons = app.manifest.icons;
  if (!icons)
    return null;

  var sizes = Object.keys(icons).map(function parse(str) {
    return parseInt(str, 10);
  });
  sizes.sort(function(x, y) { return y - x; });

  var HVGA = document.documentElement.clientWidth < 480;
  var index = sizes[HVGA ? sizes.length - 1 : 0];

  APP_ICON = app.installOrigin + icons[index];
};

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
function setupApp() {

  var SETTINGS_VIEW = 'settings-view';

  // Set the left tab depending on plantype
  function _setLeftTab(plantype) {

    // Return true if the tab is one of those placed on the left
    function isLeftTab(tab) {
      return [TAB_BALANCE, TAB_TELEPHONY].indexOf(tab) !== -1;
    }

    var balance = (plantype === CostControl.PLAN_PREPAID);
    var telephony = !balance;

    // Enable / disable the filter
    document.getElementById('balance-tab-filter')
      .setAttribute('aria-hidden', !balance);
    document.getElementById('telephony-tab-filter')
      .setAttribute('aria-hidden', !telephony);

    // If the current tab is the left one, enable it
    var currentTab = viewManager.getCurrentTab();
    if (currentTab === null || isLeftTab(currentTab))
      viewManager.changeViewTo(balance ? TAB_BALANCE : TAB_TELEPHONY);

  }

  // Configure close dialog to close the current dialog. Dialog includes
  // prompts and settings.
  function _configureCloseDialog() {
    var closeButtons = document.querySelectorAll('.close-dialog');
    [].forEach.call(closeButtons, function ccapp_eachCloseButton(button) {
      button.addEventListener('click', function ccapp_onCloseView() {
        viewManager.closeCurrentView();
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
        settingsVManager.changeViewTo(SETTINGS_VIEW);
      });
    });
  }

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {

    _configureSettingsButtons();
    _configureCloseDialog();
    _configureCloseSettingsDialog();

    // Initialize each tab (XXX: see them in /js/views/ )
    for (var viewId in Views)
        Views[viewId].init();

    // Handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/open':
            viewManager.closeCurrentView();
            break;

          case 'costcontrol/topup':
            Views[TAB_BALANCE].showTopUp();
            break;
        }
      }
    );

    // Keep the left tab synchronized with the plantype
    CostControl.settings.observe('plantype', _setLeftTab);

    // Update UI when localized
    window.addEventListener('localized', function ccapp_onLocalized() {
      for (var viewid in Views) if (Views.hasOwnProperty(viewid))
        Views[viewid].localize();
    });

  }

  _init();
}
