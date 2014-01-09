
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
  var topUpUSSD, topUp, topUpDialog, topUpCodeInput, sendCode, countdownSpan;
  var balanceView, topUpLayoutView;
  var costcontrol, initialized;

  function showTopUpWithCode(evt) {
    topUpWithCode();
  }

  function setupTab() {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // we need to load topUpDialog to get elements from inside
      // it should be a separate function run on startup of the module
      // after HTML is generated
      topUpDialog = document.getElementById('topup-dialog');
      var vm = new ViewManager(); // XXX: used to eagerly load top up dialog
      vm.loadPanel(topUpDialog);

      // HTML entities
      view = document.getElementById('balance-tab');
      updateButton = document.getElementById('balance-tab-update-button');
      sendCode = document.getElementById('topup-send-button');
      topUpUSSD = document.getElementById('balance-tab-topup-ussd-button');
      topUp = document.getElementById('balance-tab-topup-button');
      topUpCodeInput = document.getElementById('topup-code-input');
      countdownSpan = document.getElementById('top-up-countdown');

      // Subviews
      topUpLayoutView = new TopUpLayoutView(topUpUSSD, topUp);
      var balanceConfig = ConfigManager.configuration.balance;
      balanceView = new BalanceView(
        document.getElementById('balance-tab-credit'),
        document.getElementById('balance-tab-time'),
        balanceConfig ? balanceConfig.minimum_delay : undefined
      );

      window.addEventListener('localized', localize);

      // Configure updates
      document.addEventListener('visibilitychange', updateWhenVisible);
      updateButton.addEventListener('click', lockAndUpdateUI);
      ConfigManager.observe('lowLimit', toogleLimits, true);
      ConfigManager.observe('lowLimitThreshold', resetNotification, true);
      ConfigManager.observe('lastBalance', onBalance, true);
      ConfigManager.observe('errors', onBalanceTimeout, true);

      // Configure top up
      topUpUSSD.addEventListener('click', topUpWithUSSD);
      topUp.addEventListener('click', showTopUpWithCode);
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
    if (initialized) {
      updateUI();
    }
  }

  function finalize() {
    if (!initialized) {
      return;
    }

    document.removeEventListener('visibilitychange', updateWhenVisible);
    updateButton.removeEventListener('click', lockAndUpdateUI);
    ConfigManager.removeObserver('lowLimit', toogleLimits);
    ConfigManager.removeObserver('lowLimitThreshold', resetNotification);
    ConfigManager.removeObserver('lastBalance', onBalance);
    ConfigManager.removeObserver('errors', onBalanceTimeout);

    topUpUSSD.removeEventListener('click', topUpWithUSSD);
    topUp.removeEventListener('click', showTopUpWithCode);
    topUpCodeInput.removeEventListener('input', toogleSend);
    sendCode.removeEventListener('click', requestTopUp);
    ConfigManager.removeObserver('waitingForTopUp', onConfirmation);
    ConfigManager.removeObserver('errors', onTopUpErrors);

    topUpLayoutSet = false;
    initialized = false;
  }

  // BALANCE ACTIONS

  // On showing the application
  function updateWhenVisible() {
    if (!document.hidden && initialized) {
      updateUI();
    } else {
      clearInterval(topUpCountdown);
    }
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

  // On changing the threshold for low limit
  function resetNotification() {
    ConfigManager.setOption({ 'lowLimitNotified': false });
  }

  // On balance update received
  function onBalance(balance, old, key, settings) {
    debug('Balance received:', balance);
    setBalanceMode();
    updateBalance(balance, settings.lowLimit && settings.lowLimitThreshold);
    debug('Balance updated!');
  }

  // On balance timeout
  function onBalanceTimeout(errors) {
    if (!errors['BALANCE_TIMEOUT']) {
      return;
    }
    debug('Balance timeout!');

    setBalanceMode('warning');
    setError('balance_error');

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
  function topUpWithCode(lastWasError) {
    window.location.hash = '##topup-dialog';
    if (lastWasError) {
      setTopUpMode('incorrect_code');
    }

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
        setTimeout(closeTopUp, DIALOG_TIMEOUT);

      } else if (status === 'error') {
        setTopUpMode(result.details);
      }
    });
  }

  function closeTopUp() {
    // Remove from hash
    if (isTopUpShown()) {
      window.location.hash = '#';
    }
  }

  function isTopUpShown() {
    return window.location.hash.split('#')[2] === topUpDialog.id;
  }

  // On confirmation SMS for top up received
  function onConfirmation(isWaiting) {
    if (isWaiting !== null) {
      return;
    }
    debug('TopUp confirmed!');
    setTopUpMode('default');
    topUpCodeInput.value = '';
    updateUI();
  }

  // On top up timeout or incorrect code
  function onTopUpErrors(errors) {
    debug('ERRORS:', errors);

    var mode;
    if (errors['TOPUP_TIMEOUT']) {
      errors['TOPUP_TIMEOUT'] = false;
      mode = 'topup_timeout';
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
  var topUpLayoutSet = false;
  function updateUI(force) {
    ConfigManager.requestAll(function _onSettings(configuration, settings) {

      if (!topUpLayoutSet) {
        topUpLayoutView.setupLayout(configuration.topup);
        topUpLayoutSet = true;
      }

      resetTopUpCountdown();
      updateBalance(settings.lastBalance,
                    settings.lowLimit && settings.lowLimitThreshold);

      var requestObj = { type: 'balance', force: !!force };
      costcontrol.request(requestObj, function _onRequest(result) {
        debug(result);
        updateButton.disabled = false;
        var status = result.status;
        var balance = result.data;
        var isError = status === 'error' && result.details !== 'minimum_delay';
        var isUpdating = status !== 'error';
        if (isError) {
          setBalanceMode('warning');
          setError(result.details);
        } else {
          setBalanceMode(isUpdating ? 'updating' : 'default');
          setError();
        }
        updateBalance(balance,
                      settings.lowLimit && settings.lowLimitThreshold);
      });
    });
  }

  // Update the balance in balance view
  function updateBalance(balance, limit) {

    if (!balance) {
      debug('Balance not available');
      balanceView.update();
      return;
    }

    var isUpdating = view.classList.contains('updating');
    balanceView.update(balance, isUpdating);

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
    if (mode === lastBalanceMode) {
      return;
    }

    lastBalanceMode = mode;
    view.classList.remove('updating');
    view.classList.remove('warning');

    if (mode === 'warning') {
      view.classList.add('warning');
    }

    if (mode === 'updating') {
      view.classList.add('updating');
    }
  }

  // Control info messages in the top up dialog as well as the top up countdown
  // and error messages in the error area
  var lastTopUpMode;
  function setTopUpMode(mode) {
    if (lastTopUpMode === mode) {
      return;
    }

    lastTopUpMode = mode;

    // Messages in top up dialog
    var isShown;
    var defaultMessage = document.getElementById('topup-code-explanation');
    var inprogressMessage = document.getElementById('topup-in-progress');
    var errorMessage = document.getElementById('topup-error');
    var incorrectCodeMessage = document.getElementById('topup-incorrect-code');

    isShown = (mode === 'default' || mode === 'topup_timeout');
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
    if (isShown) {
      resetTopUpCountdown();
    }

    // Messages in error message area
    if (mode === 'topup_timeout') {
      setError(mode);
    }
  }

  var topUpCountdown, countdown;
  function resetTopUpCountdown() {
    getTopUpTimeout(function(timeout) {
      if (!timeout) {
        return;
      }
      countdown = Math.floor((timeout.getTime() - Date.now()) / 1000);
      if (countdown < 0) {
        return;
      }
      clearInterval(topUpCountdown);
      topUpCountdown = setInterval(function _updateCountdown() {
        var minutes = Math.floor(countdown / 60);
        var seconds = (countdown % 60).toFixed(0);
        var padding = '';
        if (seconds < 10) {
          padding = '0';
        }
        countdownSpan.textContent = (minutes + ' : ' + padding + seconds);
        if (countdown > 0) {
          countdown -= 1;
        }
      }, 1000);
    });
  }

  var ERRORS = {
    'airplane_mode': { priority: 1, string: 'airplane-mode-error-message2' },
    'no_service': { priority: 2, string: 'no-coverage-error-message2' },
    'no_coverage': { priority: 2, string: 'no-coverage-error-message' },
    'topup_timeout': { priority: 3, string: 'top-up-timed-out2' },
    'balance_error': { priority: 4, string: 'balance-error-message2' },
    'non_free_in_roaming': { priority: 4, string: 'on-roaming-message2' }
  };
  var currentError = '';

  // Decide which error should be shown taking in count error priorities
  function setError(error) {
    // Ignore showing message if the message is not registered
    if (error && !ERRORS[error]) {
      return;
    }

    debug('Error mode:', error ? error : 'no error');
    var messageArea = document.getElementById('cost-control-message-area');
    var message = document.getElementById('error-message-placeholder');

    if (!error) {
      messageArea.setAttribute('aria-hidden', true);
    } else {
      messageArea.setAttribute('aria-hidden', false);
      var curPriority = currentError ? ERRORS[currentError].priority : 0;
      var newPriority = ERRORS[error] ? ERRORS[error].priority : 0;
      if (newPriority >= curPriority) {
        message.textContent = _(ERRORS[error].string);
        currentError = error;
      }
    }
  }

  return {
    topUpWithCode: topUpWithCode,
    initialize: function() {
      var SCRIPTS_NEEDED = [
        'js/views/TopUpLayoutView.js',
        'js/views/BalanceView.js'
      ];
      LazyLoader.load(SCRIPTS_NEEDED, setupTab);
    },
    finalize: finalize
  };
}());
BalanceTab.initialize();
