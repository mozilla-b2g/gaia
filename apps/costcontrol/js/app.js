
/*
 * The application is in charge of display detailed information about the usage.
 * Application has three tabs configured independently plus a settings view.
 *
 * This module is only in charge of manage the different tabs but the specific
 * behaviour is delegated to each tab (in /js/views directory).
 *
 * It is important to explain how the URL schema works. Cost Control
 * uses the concept of card to refer a tab or a view. There are two main layers:
 * the tab layer and the overlay layer. The first one is used to display tabs,
 * the second one is used to display settings or other overlaying dialogs.
 *
 * The URL schema is:
 * #tab-id[#overlay-id]
 *
 * So changing the hash to:
 * #balance-tab#settings-view
 * makes Cost Control to change to the balance view and show the settings.
 *
 * We can close the overlay layer by setting only the balance layer:
 * #datausage-tab
 * this makes Cost Control to change to the datausage tab at the same time it
 * closes the card in the overlay layer.
 *
 * If you want to preserve a layer but changing the other, use the empty string
 * as the id of the layer you want to preserve.
 * For intance, you want to only close the overlay layer but not affecting the
 * tab layer:
 * #
 *
 * Or you want to change tab layer but without affecting the overlay, use:
 * #telephony-tab#
 *
 * Remember: you cannot close the tab layer!
 */

var CostControlApp = (function() {

  'use strict';

  // XXX: This is the point of entry, check common.js for more info
  waitForDOMAndMessageHandler(window, onReady);

  var costcontrol, initialized = false;
  function onReady() {
    var mobileConnection = window.navigator.mozMobileConnection;
    var cardState = checkCardState();

    // SIM not ready
    if (cardState !== 'ready') {
      debug('SIM not ready:', cardState);
      mobileConnection.oncardstatechange = onReady;

    // SIM is ready
    } else {
      mobileConnection.oncardstatechange = undefined;
      startApp();
    }
  }

  // Check the card status. Return 'ready' if all OK or take actions for
  // special situations such as 'pin/puk locked' or 'absent'.
  function checkCardState() {
    var mobileConnection = window.navigator.mozMobileConnection;
    var state, cardState;
    state = cardState = mobileConnection.cardState;

    // SIM is absent
    if (cardState === 'absent') {
      debug('There is no SIM');
      showSimErrorDialog('no-sim2');

    // SIM is locked
    } else if (
      cardState === 'pinRequired' ||
      cardState === 'pukRequired'
    ) {
      showSimErrorDialog('sim-locked');
      state = 'locked';
    }

    return state;
  }

  function showSimErrorDialog(status) {
    var header = _('widget-' + status + '-heading');
    var msg = _('widget-' + status + '-meta');
    alert(header + '\n' + msg);
    window.close();
  }

  // XXX: See the module documentation for details about URL schema
  var vmanager, tabmanager, settingsVManager;
  function setupCardHandler() {
    // View managers for dialogs and settings
    vmanager = new ViewManager();
    tabmanager = new ViewManager(
      ['balance-tab', 'telephony-tab', { id: 'datausage-tab', tab: 'right' }]
    );
    settingsVManager = new ViewManager();

    // View handler
    window.addEventListener('hashchange', function _onHashChange(evt) {

      var parser = document.createElement('a');
      parser.href = evt.oldURL;
      var oldHash = parser.hash.split('#');
      parser.href = evt.newURL;
      var newHash = parser.hash.split('#');

      if (newHash.length > 3) {
        console.error('Cost Control bad URL schema');
        return;
      }

      debug('URL schema before normalizing:', newHash);

      var normalized = false;
      if (newHash[1] === '' && oldHash[1]) {
        newHash[1] = oldHash[1];
        normalized = true;
      }

      if (newHash.length === 3 && newHash[2] === '') {
        if (oldHash.length === 3) {
          newHash[2] = oldHash[2];
        } else {
          newHash = newHash.slice(0, 2);
        }
        normalized = true;
      }

      if (normalized) {
        debug('URL schema after normalization:', newHash);
        window.location.hash = newHash.join('#');
        return;
      }

      if (newHash[1]) {
        tabmanager.changeViewTo(newHash[1]);
      }

      if (newHash.length < 3) {
        vmanager.closeCurrentView();
      } else {
        vmanager.changeViewTo(newHash[2]);
      }
    });
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

  function setupApp() {
    setupCardHandler();

    // Configure settings buttons
    var settingsButtons = document.querySelectorAll('.settings-button');
    Array.prototype.forEach.call(settingsButtons,
      function _eachSettingsButton(button) {
        button.addEventListener('click', function _showSettings() {
          window.location.hash = '##settings-view';
        });
      }
    );

    // Handle 'open activity' sent by the user via the widget
    navigator.mozSetMessageHandler('activity',
      function _handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'costcontrol/balance':
            window.location.hash = '#balance-tab';
            break;
          case 'costcontrol/telephony':
            window.location.hash = '#telephony-tab';
            break;
          case 'costcontrol/data_usage':
            window.location.hash = '#datausage-tab';
            break;
        }
      }
    );

    // When a notification is received
    window.navigator.mozSetMessageHandler('notification',
      function _onNotification(notification) {
        if (!notification.clicked) {
          return;
        }

        debug('Notification was clicked!');

        navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
          var app = evt.target.result;
          app.launch();

          var type = notification.imageURL.split('?')[1];
          debug('Notification type:', type);
          handleNotification(type);
        };
      }
    );

    // Check card state when visible
    document.addEventListener('mozvisibilitychange',
      function _onVisibilityChange(evt) {
        if (!document.mozHidden && initialized) {
          checkCardState();
        }
      }
    );

    updateUI();
    ConfigManager.observe('plantype', updateUI, true);

    initialized = true;

    loadSettings();
  }

  // Load settings in background
  function loadSettings() {
    document.getElementById('settings-view-placeholder').src = 'settings.html';
  }

  function handleNotification(type) {
    switch (type) {
      case 'topUpError':
        BalanceTab.topUpWithCode(true);
        break;
      case 'lowBalance':
      case 'zeroBalance':
        window.location.hash = '#balance-tab';
        break;
      case 'dataUsage':
        tabmanager.changeViewTo('datausage-tab');
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

        if (mode === 'PREPAID') {
          if (typeof TelephonyTab !== 'undefined') {
            TelephonyTab.finalize();
          }
          if (typeof BalanceTab !== 'undefined') {
            BalanceTab.initialize();
          }
        } else if (mode === 'POSTPAID') {
          if (typeof BalanceTab !== 'undefined') {
            BalanceTab.finalize();
          }
          if (typeof TelephonyTab !== 'undefined') {
            TelephonyTab.initialize();
          }
        }

        // Stand alone mode when data usage only
        if (mode === 'DATA_USAGE_ONLY') {
          var tabs = document.getElementById('tabs');
          tabs.setAttribute('aria-hidden', true);

          var dataUsageTab = document.getElementById('datausage-tab');
          dataUsageTab.classList.add('standalone');
          window.location.hash = '#datausage-tab';

        // Two tabs mode
        } else {
          document.getElementById('balance-tab-filter')
            .setAttribute('aria-hidden', (mode !== 'PREPAID'));

          document.getElementById('telephony-tab-filter')
            .setAttribute('aria-hidden', (mode !== 'POSTPAID'));

          // If it was showing the left tab, force changing to the
          // proper left view
          if (!isDataUsageTabShown()) {
            window.location.hash = (mode === 'PREPAID') ?
                                   '#balance-tab#' : '#telephony-tab#';
          }
        }

      }
    });
  }

  function isDataUsageTabShown() {
    return window.location.hash.split('#')[1] === 'datausage-tab';
  }

  return {
    showBalanceTab: function _showBalanceTab() {
      window.location.hash = '#balance-tab';
    },
    showDataUsageTab: function _showDataUsageTab() {
      window.location.hash = '#datausage-tab';
    }
  };
}());
