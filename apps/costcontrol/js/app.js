
/*
 * The application is in charge of display detailed information about the usage.
 * Application has three tabs configured independently plus a settings view.
 *
 * This module is only in charge of manage the different tabs but the specific
 * behaviour is delegated to each tab (in /js/views directory).
 */

var CostControlApp = (function() {

  'use strict';

  var costcontrol, initialized = false;
  window.addEventListener('DOMContentLoaded', function _onDOMReady() {
    var mobileConnection = window.navigator.mozMobileConnection;

    // No SIM
    if (!mobileConnection || mobileConnection.cardState === 'absent') {
      //TODO: Add a message saying there is no functionality when no SIM
      // then close
      window.close();
      return;

    // SIM is not ready
    } else if (mobileConnection.cardState !== 'ready') {
      debug('SIM not ready:', mobileConnection.cardState);
      mobileConnection.oniccinfochange = _onDOMReady;

    // SIM is ready
    } else {
      mobileConnection.oniccinfochange = undefined;
      _startApp();
    }
  });

  function _startApp() {
    checkSIMChange();
    CostControl.getInstance(function _onCostControlReady(instance) {
      if (ConfigManager.option('fte')) {
        window.location = '/fte.html';
        return;
      }
      costcontrol = instance;
      setupApp();
    });
  }

  window.addEventListener('localized', function _onLocalize() {
    if (initialized)
      updateUI();
  });

  var tabmanager, vmanager, settingsVManager;
  function setupApp() {
    // View managers for dialogs and settings
    tabmanager = new ViewManager(
      ['balance-tab', 'telephony-tab', 'datausage-tab']
    );
    vmanager = new ViewManager();
    settingsVManager = new ViewManager();

    // Configure settings
    var settingsButtons = document.querySelectorAll('.settings-button');
    Array.prototype.forEach.call(settingsButtons,
      function _eachSettingsButton(button) {
        button.addEventListener('click', function _showSettings() {
          settingsVManager.changeViewTo('settings-view');
        });
      }
    );

    var close = document.getElementById('close-settings');
    close.addEventListener('click', function _onClose() {
      settingsVManager.closeCurrentView();
    });

    Settings.initialize();

    // Configure dialogs
    var closeButtons = document.querySelectorAll('.close-dialog');
    [].forEach.call(closeButtons, function(closeButton) {
      closeButton.addEventListener('click', function() {
        vmanager.closeCurrentView();
      });
    });

    // Handle open sent by the user via the widget
    navigator.mozSetMessageHandler('activity',
      function _handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/balance':
            tabmanager.changeViewTo('balance-tab');
            break;
          case 'costcontrol/telephony':
            tabmanager.changeViewTo('telephony-tab');
            break;
          case 'costcontrol/data_usage':
            tabmanager.changeViewTo('datausage-tab');
            break;
        }
      }
    );

    updateUI();
    ConfigManager.observe('plantype', updateUI, true);

    initialized = true;
  }


  var currentMode;
  function updateUI() {
    ConfigManager.requestSettings(function _onSettings(settings) {
      var mode = costcontrol.getApplicationMode(settings);
      debug('App UI mode: ', mode);

      // Layout
      if (mode !== currentMode) {
        currentMode = mode;

        // Initialize on demand
        DataUsageTab.initialize(tabmanager);
        if (mode === 'PREPAID')
          TelephonyTab.finalize();
          BalanceTab.initialize(tabmanager, vmanager);
        if (mode === 'POSTPAID') {
          BalanceTab.finalize();
          TelephonyTab.initialize(tabmanager);
        }

        // Stand alone mode when data usage only
        if (mode === 'DATA_USAGE_ONLY') {
          var tabs = document.getElementById('tabs');
          tabs.setAttribute('aria-hidden', true);

          var dataUsageTab = document.getElementById('datausage-tab');
          vmanager.changeViewTo('datausage-tab');
          dataUsageTab.classList.add('standalone');

        // Two tabs mode
        } else {
          document.getElementById('balance-tab-filter')
            .setAttribute('aria-hidden', (mode !== 'PREPAID'));

          document.getElementById('telephony-tab-filter')
            .setAttribute('aria-hidden', (mode !== 'POSTPAID'));

          // If it was showing the left tab, force changing to the
          // proper left view
          if (tabmanager.getCurrentTab() !== 'datausage-tab')
            tabmanager.changeViewTo(mode === 'PREPAID' ? 'balance-tab' :
                                                         'telephony-tab');
        }

      }
    });
  }

}());
