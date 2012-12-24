
/*
 * The widget is in charge of show balance, telephony data and data usage
 * statistics depending on the SIM inserted.
 *
 * It has three areas of drawing: balance, telephony and data usage.
 * The update is done by demand when the widget is shown or in reaction of
 * a balance update or timeout.
 */

(function() {

  'use strict';

  var costcontrol;
  window.addEventListener('DOMContentLoaded', function _onDOMReady() {
    checkSIMChange();

    CostControl.getInstance(function _onCostControlReady(instance) {
      costcontrol = instance;
      setupWidget();
    });
  });

  window.addEventListener('localized', function _onLocalize() {
    if (initialized)
      updateUI();
  });

  var initialized, widget, leftPanel, rightPanel, views = {};
  function setupWidget() {
    // HTML entities
    widget = document.getElementById('cost-control');
    leftPanel = document.getElementById('left-panel');
    rightPanel = document.getElementById('right-panel');
    views.dataUsage = document.getElementById('datausage-view');
    views.limitedDataUsage = document.getElementById('datausage-limit-view');
    views.telephony = document.getElementById('telephony-view');
    views.balance = document.getElementById('balance-view');

    // Use observers to handle not on-demand updates
    ConfigManager.observe('lastBalance', onBalance, true);
    ConfigManager.observe('waitingForBalance', onErrors, true);
    ConfigManager.observe('errors', onErrors, true);

    // Update UI when visible
    document.addEventListener('mozvisibilitychange',
      function _onVisibilityChange(evt) {
        if (!document.mozHidden && initialized)
          updateUI();
      }
    );

    // Open application with the proper view
    views.balance.addEventListener('click',
      function _openCCBalance() {
        var activity = new MozActivity({ name: 'costcontrol/balance' });
      }
    );
    views.telephony.addEventListener('click',
      function _openCCTelephony() {
        var activity = new MozActivity({ name: 'costcontrol/telephony' });
      }
    );
    rightPanel.addEventListener('click',
      function _openCCDataUsage() {
        var activity = new MozActivity({ name: 'costcontrol/data_usage' });
      }
    );

    updateUI();
    initialized = true;
  }

  // BALANCE ACTIONS

  // On balance update received
  function onBalance(balance, old, key, settings) {
    debug('Balance received: ' + JSON.stringify(balance) + '!');
    setBalanceMode('default');
    updateBalance(balance, settings.lowLimit && settings.lowLimitThreshold);
    debug('Balance updated!');
  }

  // On balance update fail
  function onErrors(errors, old, key, settings) {
    if (!errors['BALANCE_TIMEOUT'])
      return;
    debug('Balance timeout!');

    setBalanceMode('warning');
    errors['BALANCE_TIMEOUT'] = false;
    ConfigManager.setOption({errors: errors});
  }

  // USER INTERFACE

  var currentMode;
  function updateUI() {
    ConfigManager.requestAll(function _onInfo(configuration, settings) {
      var mode = costcontrol.getApplicationMode(settings);
      debug('Widget UI mode: ' + mode);

      var isPrepaid = (mode === 'PREPAID');
      var isDataUsageOnly = (mode === 'DATA_USAGE_ONLY');

      // Layout
      var isLimited = settings.dataLimit;
      views.dataUsage.setAttribute('aria-hidden', isLimited);
      views.limitedDataUsage.setAttribute('aria-hidden', !isLimited);

      if (currentMode !== mode) {
        // Always data usage
        leftPanel.setAttribute('aria-hidden', isDataUsageOnly);

        // And the other view if applies...
        if (isDataUsageOnly) {
          widget.classList.add('full');

        } else {
          widget.classList.remove('full');
          views.balance.setAttribute('aria-hidden', !isPrepaid);
          views.telephony.setAttribute('aria-hidden', isPrepaid);
        }
        currentMode = mode;
      }

      // Content for data statistics
      var requestObj = { type: 'datausage' };
      costcontrol.request(requestObj, function _onDataStatistics(result) {
        debug(JSON.stringify(result));
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

          //  80% of the limit reached
          } else if (current >= limit * 0.8) {
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
          leftTag.innerHTML = limitTresspased ? _('limit-passed') : _('used');
          leftValue.innerHTML = limitTresspased ? limitText : currentText;
          rightTag.innerHTML = limitTresspased ? _('used') : _('limit');
          rightValue.innerHTML = limitTresspased ? currentText : limitText;

        } else {
          // Texts
          document.getElementById('mobile-usage-value').innerHTML =
            _('magnitude', { value: data[0], unit: data[1] });
          views.dataUsage.querySelector('.meta').innerHTML =
            formatTimeHTML(stats.timestamp);
        }
      });

      // Content for balance or telephony
      if (!isDataUsageOnly) {
        if (currentMode === 'PREPAID') {
          updateBalance(settings.lastBalance,
                        settings.lowLimit && settings.lowLimitThreshold);

          requestObj = { type: 'balance' };
          costcontrol.request(requestObj, function _onRequest(result) {
            debug(JSON.stringify(result));
            var status = result.status;
            var balance = result.data;
            setBalanceMode(status === 'error' ? 'warning' : 'updating');
            updateBalance(balance,
                          settings.lowLimit && settings.lowLimitThreshold);
          });
        }
      }
    });
  }

  // Update the balance in balance view
  function updateBalance(balance, limit) {

    // Balance not available
    if (balance === null) {
      debug('Balance not available');
      document.getElementById('balance-credit').innerHTML = _('not-available');
      views.balance.querySelector('.meta').innerHTML = '';
      return;
    }

    // Balance available
    document.getElementById('balance-credit').innerHTML = _('currency', {
      value: balance.balance,
      currency: ConfigManager.configuration.credit.currency
    });

    // Timestamp
    var timeContent = formatTimeHTML(balance.timestamp);
    if (views.balance.classList.contains('updating'))
      timeContent = _('updating') + '...';
    views.balance.querySelector('.meta').innerHTML = timeContent;

    // Limits: reaching zero / low limit
    if (balance.balance === 0) {
      views.balance.classList.add('no-credit');

    } else {
      views.balance.classList.remove('no-credit');

      if (limit && balance.balance < limit)
        views.balance.classList.add('low-credit');
      else
        views.balance.classList.remove('low-credit');
    }
  }


  // Set warning / updating modes
  var lastBalanceMode;
  function setBalanceMode(mode) {
    if (mode === lastBalanceMode)
      return;

    lastBalanceMode = mode;
    views.balance.classList.remove('updating');
    views.balance.classList.remove('warning');

    if (mode === 'warning')
      views.balance.classList.add('warning');

    if (mode === 'updating')
      views.balance.classList.add('updating');
  }

}());
