
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
 * For instance, you want to only close the overlay layer but not affecting the
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

  var costcontrol, initialized = false;
  var vmanager;

  // Set the application in waiting for SIM mode. During this mode, the
  // application shows a dialog informing about the current situation of the
  // SIM. Once ready, callback is executed.
  function waitForSIMReady(callback) {
    Common.loadDataSIMIccId(function _onIccId(iccid) {
      var iccid = Common.dataSimIccId;
      var dataSimIccInfo = Common.dataSimIcc;
      var cardState = dataSimIccInfo && dataSimIccInfo.cardState;

      // SIM not ready
      if (cardState !== 'ready') {
        showNonReadyScreen(cardState);
        debug('SIM not ready:', cardState);
        dataSimIccInfo.oncardstatechange = function() {
          waitForSIMReady(callback);
        };

      // SIM is ready, but ICC info is not ready yet
      } else if (!Common.isValidICCID(iccid)) {
        showNonReadyScreen(cardState);
        debug('ICC info not ready yet');
        dataSimIccInfo.oniccinfochange = function() {
          waitForSIMReady(callback);
        };

      // All ready
      } else {
        hideNotReadyScreen();
        debug('SIM ready. ICCID:', iccid);
        dataSimIccInfo.oncardstatechange = undefined;
        dataSimIccInfo.oniccinfochange = undefined;
        callback && callback();
      }

    // In case we can not get a valid ICCID.
    }, function _errorNoSim() {
        console.warn('Error when trying to get the ICC ID');
        showNonReadyScreen(null);
    });
  }

  // Displays a faked modal dialog that can be automatically close when the SIM
  // is ready. A second call if it is already shown will only update the
  // message.
  var nonReadyScreen;
  function showNonReadyScreen(cardState) {

    if (isApplicationLocalized) {
      realshowNonReadyScreen(cardState);
    } else {
      window.addEventListener('localized', function _onlocalized() {
        window.removeEventListener('localized', _onlocalized);
        realshowNonReadyScreen(cardState);
      });
    }

    function realshowNonReadyScreen(messageId) {
      debug('Showing non-ready screen.');
      if (!nonReadyScreen) {
        nonReadyScreen =
          new NonReadyScreen(document.getElementById('non-ready-screen'));
      }
      nonReadyScreen.updateForState(cardState);
      vmanager.changeViewTo(nonReadyScreen.id);
    }
  }

  function hideNotReadyScreen(status) {
    debug('Hiding non-ready screen.');
    vmanager.closeCurrentView();
    return;
  }

  // XXX: See the module documentation for details about URL schema
  var tabmanager, settingsVManager;
  function setupCardHandler() {
    // View managers for dialogs and settings
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

  function startApp(callback) {

    function _onNoICCID() {
      console.error('checkSIMChange() failed. Impossible to ensure consistent' +
                    'data. Aborting start up.');
      showSimErrorDialog('no-sim2');
    }

    Common.checkSIMChange(function _onSIMChecked() {
      CostControl.getInstance(function _onCostControlReady(instance) {
        if (ConfigManager.option('fte')) {
          startFTE();
          return;
        }
        costcontrol = instance;
        setupApp(callback);
      });
    }, _onNoICCID);
  }

  var isApplicationLocalized = false;
  window.addEventListener('localized', function _onLocalize() {
    isApplicationLocalized = true;
    if (initialized) {
      updateUI();
    }
  });

  window.addEventListener('message', function handler_finished(e) {
    if (e.origin !== Common.COST_CONTROL_APP) {
      return;
    }

    var type = e.data.type;

    if (type === 'fte_finished') {
      window.removeEventListener('message', handler_finished);

      document.getElementById('splash_section').
        setAttribute('aria-hidden', 'true');

      // Only hide the FTE view when everything in the UI is ready
      startApp(function() {
        document.getElementById('fte_view').classList.add('non-ready');
        document.getElementById('fte_view').src = '';
      });
    }
  });

  function setupApp(callback) {

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
    document.addEventListener('visibilitychange',
      function _onVisibilityChange(evt) {
        if (!document.hidden && initialized) {
          waitForSIMReady();
        }
      }
    );

    updateUI(callback);
    ConfigManager.observe('plantype', updateUI, true);

    // Avoid reload data sim info on the application startup
    var isFirstCall = true;
    // Refresh UI when the user changes the SIM for data connections
    SettingsListener.observe('ril.data.defaultServiceId', 0, function() {
      if (!isFirstCall) {
        Common.loadDataSIMIccId(updateUI);
      } else {
        isFirstCall = false;
      }
    });

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
  function updateUI(callback) {
    ConfigManager.requestSettings(function _onSettings(settings) {
      var mode = ConfigManager.getApplicationMode();
      debug('App UI mode: ', mode);

      // Layout
      if (mode !== currentMode) {
        currentMode = mode;

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

        // XXX: Break initialization to allow Gecko to render the animation on
        // time.
        setTimeout(function continueLoading() {
          if (typeof callback === 'function') {
            window.setTimeout(callback, 0);
          }
          document.getElementById('main').classList.remove('non-ready');

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
        });
      }
    });
  }

  function isDataUsageTabShown() {
    return window.location.hash.split('#')[1] === 'datausage-tab';
  }

  function startFTE() {
    var mode = ConfigManager.getApplicationMode();
    Common.startFTE(mode);
  }

  return {
    init: function() {
      vmanager = new ViewManager();
      waitForSIMReady(function _onSIMReady() {
        document
          .getElementById('message-handler').src = 'message_handler.html';
        Common.waitForDOMAndMessageHandler(window, startApp);
      });
      // XXX: See bug 944342 -[Cost control] move all the process related to the
      // network and data interfaces loading to the start-up process of CC
      Common.loadNetworkInterfaces();
    },
    reset: function() {
      costcontrol = null;
      initialized = false;
      vmanager = null;
      tabmanager = null;
      settingsVManager = null;
      currentMode = null;
      isApplicationLocalized = false;
      window.location.hash = '';
      nonReadyScreen = null;
    },
    showBalanceTab: function _showBalanceTab() {
      window.location.hash = '#balance-tab';
    },
    showDataUsageTab: function _showDataUsageTab() {
      window.location.hash = '#datausage-tab';
    }
  };
}());
