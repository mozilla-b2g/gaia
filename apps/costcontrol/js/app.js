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
function setupApp() {

  // Configure close current view buttons to close the current view
  // (i.e the info itself)
  function _configureCloseCurrentViewButtons() {
    var closeButtons = document.querySelectorAll('.close-current-view');
    [].forEach.call(closeButtons, function ccapp_eachCloseButton(button) {
      button.addEventListener('click', function ccapp_onCloseView() {
        ViewManager.closeCurrentView();
      });
    });
  }

  // Configure configuration buttons to display the application's settings
  function _configureSettingsButtons() {
    var configButtons = document.querySelectorAll('.settings-button');
    [].forEach.call(configButtons, function ccapp_eachConfigButton(button) {
      button.addEventListener('click', function ccapp_onConfig() {
        ViewManager.changeViewTo(VIEW_SETTINGS);
      });
    });
  }

  // Initializes the cost control module: basic parameters, automatic and manual
  // updates.
  function _init() {

    _configureSettingsButtons();
    _configureCloseCurrentViewButtons();

    // Initialize each tab (XXX: see them in /js/views/ )
    for (var tabname in Tabs) if (Tabs.hasOwnProperty(tabname))
      Tabs[tabname].init();

    // Handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/open':
            ViewManager.closeCurrentView();
            break;

          case 'costcontrol/topup':
            Tabs[TAB_BALANCE].showTopUp();
            break;
        }
      }
    );

    // Update UI when localized
    window.addEventListener('localized', function ccapp_onLocalized() {
      for (var tabname in Tabs) if (Tabs.hasOwnProperty(tabname))
        Tabs[tabname].updateUI();
    });

    // TODO: Add deccission depending on prepaid / postpaid
    ViewManager.changeViewTo(TAB_BALANCE);
  }

  _init();
}
