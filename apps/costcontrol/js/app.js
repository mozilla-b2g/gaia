
/*
 * The application is in charge of display detailed information about the usage.
 * Application has three tabs configured independently plus a settings view.
 *
 * This module is only in charge of manage the different tabs but the specific
 * behaviour is delegated to each tab (in /js/views directory).
 */

var CostControlApp = (function() {

  'use strict';

  // XXX: This is the point of entry, check common.js for more info
  waitForDOMAndMessageHandler(window, onReady);

  var vmanager;
  var costcontrol, initialized = false;
  function onReady() {
    vmanager = new ViewManager();
    var mobileConnection = window.navigator.mozMobileConnection;

    // SIM is absent
    if (mobileConnection.cardState === 'absent') {
      debug('There is no SIM');
      document.getElementById('no-sim-info-dialog')
        .addEventListener('click', function _close() {
        window.close();
      });
      vmanager.changeViewTo('no-sim-info-dialog');

    // SIM is not ready
    } else if (mobileConnection.cardState !== 'ready') {
      debug('SIM not ready:', mobileConnection.cardState);
      mobileConnection.oniccinfochange = onReady;

    // SIM is ready
    } else {
      mobileConnection.oniccinfochange = undefined;
      startApp();
    }
  }

  function startApp() {
    checkSIMChange(function _onSIMChecked() {
      CostControl.getInstance(function _onCostControlReady(instance) {
        if (ConfigManager.option('fte')) {
          window.location = '/fte.html';
          return;
        }
        costcontrol = instance;
        setupApp();
      });
    });
  }

  window.addEventListener('localized', function _onLocalize() {
    if (initialized) {
      updateUI();
    }
  });

  var tabmanager, settingsVManager;
  function setupApp() {
    // View managers for dialogs and settings
    tabmanager = new ViewManager(
      ['balance-tab', 'telephony-tab', 'datausage-tab']
    );
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

    // Handle 'open activity' sent by the user via the widget
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

    // When a notification is received
    window.navigator.mozSetMessageHandler('notification',
      function _onNotification(notification) {
        debug('Notification received!');
        navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
          var app = evt.target.result;
          app.launch();

          var type = notification.imageURL.split('?')[1];
          debug('Notification type:', type);
          handleNotification(type);
        };
      }
    );

    updateUI();
    ConfigManager.observe('plantype', updateUI, true);

    initialized = true;
  }

  function handleNotification(type) {
    switch (type) {
      case 'topUpError':
        BalanceTab.topUpWithCode(true);
        break;
      case 'lowBalance':
      case 'zeroBalance':
        tabmanager.changeViewTo('balance-tab');
        break;
    }
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
        if (mode === 'PREPAID') {
          TelephonyTab.finalize();
          BalanceTab.initialize(tabmanager, vmanager);
        } else if (mode === 'POSTPAID') {
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
          if (tabmanager.getCurrentTab() !== 'datausage-tab') {
            tabmanager.changeViewTo(mode === 'PREPAID' ? 'balance-tab' :
                                                         'telephony-tab');
          }
        }

      }
    });
  }

  return {
    showBalanceTab: function _showBalanceTab () {
      tabmanager.changeViewTo('balance-tab');
    }
  };

}());
