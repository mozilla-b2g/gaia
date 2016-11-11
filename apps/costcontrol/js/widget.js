/* global _, debug, BalanceView, checkDataUsageNotification,
         ConfigManager, Common, computeTelephonyMinutes, CostControl,
          formatTimeHTML, getDataLimit, MozActivity, roundData, SettingsListener
*/

/* exported activity */
/*
 * The widget is in charge of show balance, telephony data and data usage
 * statistics depending on the SIM inserted.
 *
 * It has three areas of drawing: balance, telephony and data usage.
 * The update is done by demand when the widget is shown or in reaction of
 * a balance update or timeout.
 */

var Widget = (function() {

  'use strict';

  var costcontrol;
  function checkSIMStatus() {

    var iccid = Common.dataSimIccId;
    var dataSimIccInfo = Common.dataSimIcc;
    var cardState = checkCardState();

    // SIM not ready
    if (cardState !== 'ready') {
      debug('SIM not ready:', dataSimIccInfo.cardState);
      initialized = false;
      dataSimIccInfo.oncardstatechange = checkSIMStatus;

    // SIM ready
    } else {
      debug('SIM ready. ICCID:', iccid);
      dataSimIccInfo.oncardstatechange = undefined;
      dataSimIccInfo.oniccinfochange = undefined;
      var SCRIPTS_NEEDED_TO_START = [
        'js/costcontrol.js',
        'js/config/config_manager.js'
      ];

      LazyLoader.load(SCRIPTS_NEEDED_TO_START, startWidget);
    }
  }

  // Check the card status. Return 'ready' if all OK or take actions for
  // special situations such as 'pin/puk locked' or 'absent'.
  function checkCardState() {
    var state, cardState;
    state = cardState = Common.dataSimIcc.cardState;

    // SIM is absent
    if (!cardState || cardState === 'absent') {
      debug('There is no SIM');
      showSimError('no-sim2');

    // SIM is locked
    } else if (
      cardState === 'pinRequired' ||
      cardState === 'pukRequired'
    ) {
      showSimError('sim-locked');
      state = 'locked';
    }

    return state;
  }

  function loadMessageHandler() {
    document.getElementById('message-handler').src = 'message_handler.html';
    if (ConfigManager.option('nextReset')) {
      window.addEventListener('messagehandlerready', function _setNextReset() {
        window.removeEventListener('messagehandlerready', _setNextReset);
        LazyLoader.load('js/settings/networkUsageAlarm.js', function() {
          Common.loadNetworkInterfaces(function() {
            setNextReset(ConfigManager.option('nextReset'));
          });
        });
      });
    }
  }

  function startWidget() {
    CostControl.getInstance(function _onCostControlReady(instance) {
      costcontrol = instance;
      loadMessageHandler();
      setupWidget();
    });
  }

  window.addEventListener('localized', function _onLocalize() {
    if (initialized) {
      updateUI();
    }
  });

  var initialized, widget, leftPanel, rightPanel, fte, views = {};
  var balanceView;
  function setupWidget() {
    var mode = ConfigManager.getApplicationMode();
    var isDataUsageOnly = (mode === 'DATA_USAGE_ONLY');
    var isBalanceEnabled = !isDataUsageOnly;

    // HTML entities
    widget = document.getElementById('cost-control');
    leftPanel = document.getElementById('left-panel');
    rightPanel = document.getElementById('right-panel');
    fte = document.getElementById('fte-view');
    views.dataUsage = document.getElementById('datausage-view');
    views.limitedDataUsage = document.getElementById('datausage-limit-view');
    views.telephony = document.getElementById('telephony-view');
    views.balance = document.getElementById('balance-view');

    if (isBalanceEnabled) {
      // Use observers to handle not on-demand updates
      ConfigManager.observe('lastBalance', onBalance, true);
      ConfigManager.observe('waitingForBalance', onErrors, true);
      ConfigManager.observe('errors', onErrors, true);

      LazyLoader.load('js/views/BalanceView.js', function() {
        // Subviews
        var balanceConfig = ConfigManager.configuration.balance;
        balanceView = new BalanceView(
          document.getElementById('balance-credit'),
          document.querySelector('#balance-credit + .meta'),
          balanceConfig ? balanceConfig.minimum_delay : undefined
        );
      });

      // Open application with the proper view
      views.balance.addEventListener('click',
        function _openCCBalance() {
          activity = new MozActivity({ name: 'costcontrol/balance' });
        }
      );
      views.telephony.addEventListener('click',
        function _openCCTelephony() {
          activity = new MozActivity({ name: 'costcontrol/telephony' });
        }
      );
    }
    // Use observers to handle not on-demand updates
    ConfigManager.observe('lastCompleteDataReset', onReset, true);
    ConfigManager.observe('lastTelephonyReset', onReset, true);

    // Update UI when visible
    document.addEventListener('visibilitychange',
      function _onVisibilityChange(evt) {
        if (!document.hidden && initialized) {
          checkCardState(Common.dataSimIccId);
          updateUI();
        }
      }
    );

    // Update data usage on network activity
    window.addEventListener('hashchange', function _onHashChange() {
      if (window.location.hash.split('#')[1] === 'update') {
        updateUI(true); // update only data usage
      }
    });

    // Open application with the proper view
    rightPanel.addEventListener('click',
      function _openCCDataUsage() {
        var activity = new MozActivity({ name: 'costcontrol/data_usage' });
      }
    );

    LazyLoader.load(['js/utils/formatting.js'], function() {
      updateUI();
    });

    // Avoid reload data sim info on the application startup
    var isFirstCall = true;
    // Refresh UI when the user changes the SIM for data connections
    SettingsListener.observe('ril.data.defaultServiceId', 0, function() {
      if (!isFirstCall) {
        Common.loadDataSIMIccId(updateUI.bind(null, true));
      } else {
        isFirstCall = false;
      }
    });

    initialized = true;
  }

  // BALANCE ACTIONS

  // On balance update received
  function onBalance(balance, old, key, settings) {
    debug('Balance received:', balance);
    setBalanceMode('default');
    updateBalance(balance, settings.lowLimit && settings.lowLimitThreshold);
    debug('Balance updated!');
  }

  // On balance update fail
  function onErrors(errors, old, key, settings) {
    if (!errors || !errors['BALANCE_TIMEOUT']) {
      return;
    }
    debug('Balance timeout!');

    setBalanceMode('warning');
    errors['BALANCE_TIMEOUT'] = false;
    ConfigManager.setOption({errors: errors});
  }

  // On reset telephony or data usage
  function onReset(value, old, key, settings) {
    updateUI();
  }

  // USER INTERFACE

  // Reuse fte panel to display errors
  function _showSimError(status) {
    // Wait to l10n resources are ready
    navigator.mozL10n.ready(function showErrorStatus() {
      var widget = document.getElementById('cost-control');
      var fte = document.getElementById('fte-view');
      var leftPanel = document.getElementById('left-panel');
      var rightPanel = document.getElementById('right-panel');

      widget.setAttribute('aria-hidden', false);
      fte.setAttribute('aria-hidden', false);
      leftPanel.setAttribute('aria-hidden', true);
      rightPanel.setAttribute('aria-hidden', true);

      var className = 'widget-' + status;
      document.getElementById('fte-icon').classList.add(className);
      Common.localize(fte.querySelector('p:first-child'), className +
        '-heading');
      Common.localize(fte.querySelector('p:last-child'), className + '-meta');
    });
  }

  function setupFte(provider, mode) {

    fte.setAttribute('aria-hidden', false);
    leftPanel.setAttribute('aria-hidden', true);
    rightPanel.setAttribute('aria-hidden', true);
    widget.setAttribute('aria-hidden', false);

    fte.addEventListener('click', function launchFte() {
      fte.removeEventListener('click', launchFte);
      var activity = new MozActivity({ name: 'costcontrol/balance' });
    });

    var keyLookup = {
        PREPAID: 'widget-authed-sim',
        POSTPAID: 'widget-authed-sim',
        DATA_USAGE_ONLY: 'widget-nonauthed-sim'
    };
    var simKey = keyLookup[mode];

    document.getElementById('fte-icon').className = 'icon ' + simKey;
    Common.localize(
      fte.querySelector('p:first-child'),
      simKey + '-heading',
      {provider: provider}
    );
    Common.localize(fte.querySelector('p:last-child'), simKey + '-meta');
  }

  var hashMark = 0;
  function updateUI(updateOnlyDataUsage) {

    ConfigManager.requestAll(function _onInfo(configuration, settings) {
      var mode = ConfigManager.getApplicationMode();
      debug('Widget UI mode:', mode);

      var isPrepaid = (mode === 'PREPAID');
      var isDataUsageOnly = (mode === 'DATA_USAGE_ONLY');

      // Show fte mode widget
      if (settings.fte) {
        setupFte(configuration.provider, mode);
        debug('Widget in FTE mode');
        return;
      }

      // Layout
      widget.setAttribute('aria-hidden', true);
      fte.setAttribute('aria-hidden', true);
      leftPanel.setAttribute('aria-hidden', false);
      rightPanel.setAttribute('aria-hidden', false);

      var isLimited = settings.dataLimit;
      views.dataUsage.setAttribute('aria-hidden', isLimited);
      views.limitedDataUsage.setAttribute('aria-hidden', !isLimited);

      // Always data usage
      leftPanel.setAttribute('aria-hidden', isDataUsageOnly);

      // And the other view if applies...
      if (isDataUsageOnly) {
        widget.classList.add('full');
        widget.setAttribute('aria-hidden', false);
      } else {
        widget.classList.remove('full');
        views.balance.setAttribute('aria-hidden', !isPrepaid);
        views.telephony.setAttribute('aria-hidden', isPrepaid);
        widget.setAttribute('aria-hidden', false);
      }

      // Content for data statistics
      var requestObj = { type: 'datausage' };
      costcontrol.request(requestObj, function _onDataStatistics(result) {
        debug(result);
        var stats = result.data;
        var data = roundData(stats.mobile.total);
        if (isLimited) {

          // UI elements
          var leftTag = views.limitedDataUsage.querySelector('dt.start');
          var leftValue = views.limitedDataUsage.querySelector('dd.start');
          var rightTag = views.limitedDataUsage.querySelector('dt.end');
          var rightValue = views.limitedDataUsage.querySelector('dd.end');
          var progress = views.limitedDataUsage.querySelector('progress');

          // Progress bar
          var current = stats.mobile.total;
          var limit = getDataLimit(settings);
          debug(limit);
          progress.setAttribute('value', Math.min(current, limit));
          progress.setAttribute('max', Math.max(current, limit));

          // State
          views.limitedDataUsage.classList.remove('nearby-limit');
          views.limitedDataUsage.classList.remove('reached-limit');

          // Limit trespassed
          var limitTresspased = (current > limit);
          if (limitTresspased) {
            views.limitedDataUsage.classList.add('reached-limit');

          //  Warning percentage of the limit reached
          } else if (current >= limit * costcontrol.getDataUsageWarning()) {
            views.limitedDataUsage.classList.add('nearby-limit');
          }

          // Texts
          var currentText = roundData(current);
          currentText = _('magnitude', {
            value: currentText[0],
            unit: currentText[1]
          });
          var limitText = roundData(limit);
          limitText = _('magnitude', {
            value: limitText[0],
            unit: limitText[1]
          });
          Common.localize(
            leftTag,
            limitTresspased ? 'limit-passed' : 'used'
          );
          leftValue.textContent = limitTresspased ? limitText : currentText;
          Common.localize(
            rightTag,
            limitTresspased ? 'used' : 'limit'
          );
          rightValue.textContent = limitTresspased ? currentText : limitText;

        } else {
          // Texts
          document.getElementById('mobile-usage-value').textContent =
            _('magnitude', { value: data[0], unit: data[1] });
          var meta = views.dataUsage.querySelector('.meta');
          meta.innerHTML = '';
          meta.appendChild(formatTimeHTML(stats.timestamp));
        }
        // inform driver in system we are finished to update the widget
        hashMark = 1 - hashMark; // toogle between 0 and 1
        window.location.hash = '#updateDone#' + hashMark;
      });

      // Content for balance or telephony
      if (!isDataUsageOnly && !updateOnlyDataUsage) {
        if (mode === 'PREPAID') {
          updateBalance(settings.lastBalance,
                        settings.lowLimit && settings.lowLimitThreshold);

          requestObj = { type: 'balance' };
          costcontrol.request(requestObj, function _onRequest(result) {
            debug(result);
            var status = result.status;
            var balance = result.data;
            setBalanceMode(status === 'error' ? 'warning' : 'updating');
            updateBalance(balance,
                          settings.lowLimit && settings.lowLimitThreshold);
          });

        } else if (mode === 'POSTPAID') {
          requestObj = { type: 'telephony' };
          costcontrol.request(requestObj, function _onRequest(result) {
            var activity = result.data;
            document.getElementById('telephony-calltime').textContent =
              _('magnitude', {
                value: computeTelephonyMinutes(activity),
                unit: 'min'
              }
            );
            document.getElementById('telephony-smscount').textContent =
              _('magnitude', {
                value: activity.smscount,
                unit: 'SMS'
              }
            );
            var meta = views.telephony.querySelector('.meta');
            meta.innerHTML = '';
            meta.appendChild(formatTimeHTML(activity.timestamp));
          });
        }
      }
    });
  }

  // Update the balance in balance view
  function updateBalance(balance, limit) {

    if (!balance) {
      debug('Balance not available');
      balanceView.update();
      return;
    }

    var isUpdating = views.balance.classList.contains('updating');
    balanceView.update(balance, isUpdating);

    // Limits: reaching zero / low limit
    if (balance.balance === 0) {
      views.balance.classList.add('no-credit');

    } else {
      views.balance.classList.remove('no-credit');

      if (limit && balance.balance < limit) {
        views.balance.classList.add('low-credit');
      } else {
        views.balance.classList.remove('low-credit');
      }
    }
  }


  // Set warning / updating modes
  var lastBalanceMode;
  function setBalanceMode(mode) {
    if (mode === lastBalanceMode) {
      return;
    }

    lastBalanceMode = mode;
    views.balance.classList.remove('updating');
    views.balance.classList.remove('warning');

    if (mode === 'warning') {
      views.balance.classList.add('warning');
    }

    if (mode === 'updating') {
      views.balance.classList.add('updating');
    }
  }

  function initWidget() {
    var isWaitingForIcc = false;
    function waitForIccAndCheckSim() {
      if (!isWaitingForIcc) {
        var iccManager = window.navigator.mozIccManager;
        iccManager.addEventListener('iccdetected',
          function _oniccdetected() {
            isWaitingForIcc = false;
            iccManager.removeEventListener('iccdetected', _oniccdetected);
            Common.loadDataSIMIccId(checkSIMStatus);
          }
        );
        isWaitingForIcc = true;
      }
    }
    Common.loadDataSIMIccId(checkSIMStatus, function _errorNoSim() {
      waitForIccAndCheckSim();
      console.warn('Error when trying to get the ICC ID');
      Widget.showSimError('no-sim2');
    });

    AirplaneModeHelper.addEventListener('statechange',
      function _onAirplaneModeChange(state) {
        if (state === 'enabled') {
          waitForIccAndCheckSim();
          Widget.showSimError('no-sim2');
        }
      }
    );
  }

  return {
    init: function() {
      var SCRIPTS_NEEDED = [
        'js/common.js',
        'js/utils/toolkit.js'
      ];
      // Check if the mandatory APIs to work exist.
      if (!window.navigator.mozMobileConnections ||
          !window.navigator.mozIccManager ||
          !window.navigator.mozNetworkStats) {
        LazyLoader.load(SCRIPTS_NEEDED, function _showError() {
          Widget.showSimError('no-sim2');
        });
      } else {
        SCRIPTS_NEEDED = [
          'js/common.js',
          'js/utils/toolkit.js',
          'js/utils/debug.js'
        ];
        LazyLoader.load(SCRIPTS_NEEDED, initWidget);
      }
    },
    showSimError: _showSimError
  };
}());

Widget.init();
