
/*
 * The balance tab is in charge of show balance details and allows the use
 * to manually update or top up via USSD or code.
 *
 * It has four areas of drawing: balance, top up dialog, top up countdown and
 * error area. The update is done by demand when the application is shown or
 * when the user taps on the update button. Furthermore, the balance update
 * can be triggered by a successful top up request.
 */

var BalanceTab = (function() {
  'use strict';

  var view, updateButton;
  var topUpUSSD, topUp, topUpDialog, topUpCodeInput, sendCode;
  var costcontrol, tabmanager, vmanager, initialized;

  function setupTab(tmgr, vmgr) {
    if (initialized)
      return;

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;
      tabmanager = tmgr;
      vmanager = vmgr;

      // HTML entities
      view = document.getElementById('balance-tab');
      updateButton = document.getElementById('balance-tab-update-button');
      sendCode = document.getElementById('topup-send-button');
      topUpDialog = document.getElementById('topup-dialog');
      topUpUSSD = document.getElementById('balance-tab-topup-ussd-button');
      topUp = document.getElementById('balance-tab-topup-button');
      topUpCodeInput = document.getElementById('topup-code-input');

      window.addEventListener('localized', localize);

      // Configure showing tab
      var tabButton = document.getElementById('balance-tab-filter');
      tabButton.addEventListener('click', function _showTab() {
        tabmanager.changeViewTo('balance-tab');
      });

      // Configure updates
      document.addEventListener('mozvisibilitychange', updateWhenVisible);
      updateButton.addEventListener('click', lockAndUpdateUI);
      ConfigManager.observe('lowLimit', toogleLimits, true);
      ConfigManager.observe('lastBalance', onBalance, true);
      ConfigManager.observe('errors', onBalanceTimeout, true);

      // Configure top up
      topUpUSSD.addEventListener('click', topUpWithUSSD);
      topUp.addEventListener('click', topUpWithCode);
      topUpCodeInput.addEventListener('input', toogleSend);
      sendCode.addEventListener('click', requestTopUp);
      ConfigManager.observe('waitingForTopUp', onConfirmation, true);
      ConfigManager.observe('errors', onTopUpErrors, true);
      toogleSend();

      updateUI();
      initialized = true;
    });
  }

  function localize() {
    if (initialized)
      updateUI();
  }

  function finalize() {
    if (!initialized)
      return;

    document.removeEventListener('mozvisibilitychange', updateWhenVisible);
    updateButton.removeEventListener('click', lockAndUpdateUI);
    ConfigManager.removeObserver('lowLimit', toogleLimits);
    ConfigManager.removeObserver('lastBalance', onBalance);
    ConfigManager.removeObserver('errors', onBalanceTimeout);

    topUpUSSD.removeEventListener('click', topUpWithUSSD);
    topUp.removeEventListener('click', topUpWithCode);
    topUpCodeInput.removeEventListener('input', toogleSend);
    sendCode.removeEventListener('click', requestTopUp);
    ConfigManager.removeObserver('waitingForTopUp', onConfirmation);
    ConfigManager.removeObserver('errors', onTopUpErrors);

    initialized = false;
  }

  // BALANCE ACTIONS

  // On showing the application
  function updateWhenVisible() {
    if (!document.mozHidden && initialized)
      updateUI();
  }

  // On tapping update
  function lockAndUpdateUI() {
    updateButton.disabled = true;
    updateUI(true);
  }

  // On changing low limit alert
  function toogleLimits(isEnabled, old, key, settings) {
    updateBalance(settings.lastBalance,
                  isEnabled && settings.lowLimitThreshold);
  }

  // On balance update received
  function onBalance(balance, old, key, settings) {
    debug('Balance received:', balance);
    setBalanceMode('default');
    updateBalance(balance, settings.lowLimit && settings.lowLimitThreshold);
    debug('Balance updated!');
  }

  // On balance timeout
  function onBalanceTimeout(errors) {
    if (!errors['BALANCE_TIMEOUT'])
      return;
    debug('Balance timeout!');

    setBalanceMode('warning');
    setErrors('balance_timeout');

    // Error handled, disabling
    errors['BALANCE_TIMEOUT'] = false;
    ConfigManager.setOption({errors: errors});
  }

  // TOP UP ACTIONS

  // On tapping Top Up and Pay
  function topUpWithUSSD() {
    var dialing = new MozActivity({
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: ConfigManager.configuration.topup.ussd_destination
      }
    });
  }

  // On tapping Top Up with code
  function topUpWithCode() {
    vmanager.changeViewTo('topup-dialog');
    topUpCodeInput.focus();
  }

  // On typing the code
  function toogleSend(evt) {
    sendCode.disabled = !topUpCodeInput.value.trim();
  }

  // On tapping send code button
  var DIALOG_TIMEOUT = 10 * 1000; // 10s
  function requestTopUp() {
    sendCode.disabled = true;

    var code = topUpCodeInput.value.trim();
    var requestObj = { type: 'topup', data: code };
    costcontrol.request(requestObj, function _onTopUpRequest(result) {
      debug(result);
      sendCode.disabled = false;

      var status = result.status;
      if (status === 'success' || status === 'in_progress') {
        setTopUpMode('in_progress');
        setTimeout(function _hideDialog() {
          if (vmanager.isCurrentView(topUpDialog.id))
            vmanager.closeCurrentView();
        }, DIALOG_TIMEOUT);

      } else if (status === 'error') {
        setTopUpMode(result.details);
      }
    });
  }

  // On confirmation SMS for top up received
  function onConfirmation(isWaiting) {
    if (isWaiting !== null)
      return;

    debug('TopUp confirmed!');
    setTopUpMode('default');
    topUpCodeInput.value = '';
    updateButton.click(); // TODO: Check if free before
  }

  // On top up timeout or incorrect code
  function onTopUpErrors(errors) {
    debug('ERRORS:', errors);

    var mode;
    if (errors['TOPUP_TIMEOUT']) {
      errors['TOPUP_TIMEOUT'] = false;
      mode = 'timeout';
    }
    if (errors['INCORRECT_TOPUP_CODE']) {
      errors['INCORRECT_TOPUP_CODE'] = false;
      mode = 'incorrect_code';
    }
    debug('Most important error: ', mode);

    // XXX: Very important to call this only if something has changed. If not,
    // infinite events are triggered.
    if (mode) {
      setTopUpMode(mode);
      ConfigManager.setOption({errors: errors});
    }
  }

  // USER INTERFACE

  function updateUI(force) {
    ConfigManager.requestSettings(function _onSettings(settings) {

      // TODO: restore the clock
      updateBalance(settings.lastBalance,
                    settings.lowLimit && settings.lowLimitThreshold);

      var requestObj = { type: 'balance', force: !!force };
      costcontrol.request(requestObj, function _onRequest(result) {
        debug(result);
        updateButton.disabled = false;
        var status = result.status;
        var balance = result.data;
        setBalanceMode(status === 'error' ? 'warning' : 'updating');
        if (status === 'error')
          setErrors(status.details);
        updateBalance(balance,
                      settings.lowLimit && settings.lowLimitThreshold);
      });
    });
  }

  // Update the balance in balance view
  function updateBalance(balance, limit) {

    // Balance not available
    if (!balance) {
      debug('Balance not available');
      document.getElementById('balance-tab-credit')
        .innerHTML = _('not-available');
      document.getElementById('balance-tab-time').innerHTML = '';
      return;
    }

    // Balance available
    document.getElementById('balance-tab-credit').innerHTML =
      _('currency', {
        value: balance.balance,
        currency: ConfigManager.configuration.credit.currency
      });

    // Timestamp
    var timeContent = formatTimeHTML(balance.timestamp);
    if (view.classList.contains('updating'))
      timeContent = _('updating') + '...';
    document.getElementById('balance-tab-time').innerHTML = timeContent;

    // Limits: reaching zero / low limit
    if (balance.balance === 0) {
      view.classList.add('no-credit');

    } else {
      view.classList.remove('no-credit');

      if (limit && balance.balance < limit) {
        view.classList.add('low-credit');
      } else {
        view.classList.remove('low-credit');
      }
    }
  }

  // Set warning / updating modes
  var lastBalanceMode;
  function setBalanceMode(mode) {
    if (mode === lastBalanceMode)
      return;

    lastBalanceMode = mode;
    view.classList.remove('updating');
    view.classList.remove('warning');

    if (mode === 'warning')
      view.classList.add('warning');

    if (mode === 'updating')
      view.classList.add('updating');
  }

  // Control info messages in the top up dialog as well as the top up countdown
  // and error messages in the error area
  var lastTopUpMode;
  function setTopUpMode(mode) {
    if (lastTopUpMode === mode)
      return;

    lastTopUpMode = mode;

    // Messages in top up dialog
    var isShown;
    var defaultMessage = document.getElementById('topup-code-explanation');
    var inprogressMessage = document.getElementById('topup-in-progress');
    var errorMessage = document.getElementById('topup-error');
    var incorrectCodeMessage = document.getElementById('topup-incorrect-code');

    isShown = (mode === 'default' || mode === 'timeout');
    defaultMessage.setAttribute('aria-hidden', !isShown);

    isShown = (mode === 'in_progress');
    inprogressMessage.setAttribute('aria-hidden', !isShown);

    isShown = (mode === 'request_fail' || mode === 'no_service');
    errorMessage.setAttribute('aria-hidden', !isShown);

    isShown = (mode === 'incorrect_code');
    incorrectCodeMessage.setAttribute('aria-hidden', !isShown);

    // Count down
    var countdownArea = document.getElementById('cost-control-topup-countdown');
    isShown = (mode === 'in_progress');
    countdownArea.setAttribute('aria-hidden', !isShown);
    // TODO: Set the clock

    // Messages in error message area
    if (mode === 'timeout') {
      var errorMessageArea =
        document.getElementById('cost-control-message-area');
      errorMessageArea.setAttribute('aria-hidden', false);
      document.getElementById('on-roaming-message')
        .setAttribute('aria-hidden', true);
      document.getElementById('on-topup-not-confirmed')
        .setAttribute('aria-hidden', false);
      document.getElementById('balance-error-message')
        .setAttribute('aria-hidden', true);
    }
  }

  // Decide which error should be shown taking in count error priorities
  function setErrors(error) {
    debug('TODO: Error for', error);
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());
