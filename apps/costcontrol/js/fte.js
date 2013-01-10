/*
 * First time experience is in charge of set up the application.
 */

(function() {

  'use strict';

  var costcontrol;
  window.addEventListener('DOMContentLoaded', function _onDOMReady() {
    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;
      setupFTE();
    });
  });

  var wizard, vmanager;
  var toStep2, step = 0;
  function setupFTE() {
    ConfigManager.requestAll(function _onSettings(configuration, settings) {
      wizard = document.getElementById('firsttime-view');
      vmanager = new ViewManager();
      AutoSettings.addType('data-limit', dataLimitConfigurer);

      // Currency is set by config as well
      if (configuration && configuration.credit
          && configuration.credit.currency) {

        document.getElementById('currency').textContent =
          configuration.credit.currency;
      }

      var mode = costcontrol.getApplicationMode(settings);
      if (mode === 'DATA_USAGE_ONLY') {
        debug('FTE for non supported SIM');
        reset(['non-vivo-step-1', 'non-vivo-step-2']);
        AutoSettings.initialize(ConfigManager, vmanager, '#non-vivo-step-1');
        AutoSettings.initialize(ConfigManager, vmanager, '#non-vivo-step-2');

      } else {
        AutoSettings.initialize(ConfigManager, vmanager, '#step-1');

        // Plantype selection
        toStep2 = document.getElementById('to-step-2');
        toStep2.disabled = true;

        document.getElementById('prepaid-plan')
          .addEventListener('click', selectTrack);
        document.getElementById('postpaid-plan')
          .addEventListener('click', selectTrack);
      }

      // Navigation
      var next = document.querySelectorAll('[data-navigation=next]');
      [].forEach.call(next, function cc_eachNext(nextButton) {
        nextButton.addEventListener('click', onNext);
      });

      var prev = document.querySelectorAll('[data-navigation=back]');
      [].forEach.call(prev, function cc_eachPrev(prevButton) {
        prevButton.addEventListener('click', onBack);
      });

      var finish = document.querySelectorAll('[data-navigation=finish]');
      [].forEach.call(finish, function cc_eachFinish(finishButton) {
        finishButton.addEventListener('click', onFinish);
      });
    });
  }

  // TRACK SETUP

  var currentTrack = ['step-1'];
  function selectTrack(evt) {
    if (evt.target.value === 'prepaid') {
      currentTrack = ['step-1', 'prepaid-step-2', 'prepaid-step-3'];
      AutoSettings.initialize(ConfigManager, vmanager, '#prepaid-step-2');
      AutoSettings.initialize(ConfigManager, vmanager, '#prepaid-step-3');
      ConfigManager.setOption({ dataLimitValue: 40, dataLimitUnit: 'MB' });
    } else if (evt.target.value === 'postpaid') {
      currentTrack = ['step-1', 'postpaid-step-2', 'postpaid-step-3'];
      AutoSettings.initialize(ConfigManager, vmanager, '#postpaid-step-2');
      AutoSettings.initialize(ConfigManager, vmanager, '#postpaid-step-3');
      ConfigManager.setOption({ dataLimitValue: 2, dataLimitUnit: 'GB' });
    }

    ConfigManager.setOption({ plantype: evt.target.value }, function _onSet() {
      toStep2.disabled = false;
    });
  }

  // NAVIGATION

  function reset(track) {
    // Set wizard progess section
    wizard.classList.add('total-steps-' + track.length);
    wizard.classList.remove('step-' + (step + 1));
    wizard.classList.add('step-1');

    // Reposition screens
    var currentScreen = document.getElementById(currentTrack[step]);
    var newStartScreen = document.getElementById(track[0]);

    currentScreen.dataset.viewport = 'left';
    newStartScreen.dataset.viewport = 'right';
    delete newStartScreen.dataset.viewport;

    for (var i = 1, id; id = track[i]; i += 1) {
      var screen = document.getElementById(id);
      screen.dataset.viewport = 'right';
    }

    // Reset state
    step = 0;
    currentTrack = track;
  }

  function onNext() {
    if (step === currentTrack.length - 1)
      return;

    var currentId = currentTrack[step];
    var currentScreen = document.getElementById(currentId);

    var nextScreenId = currentTrack[step + 1];
    var nextScreen = document.getElementById(nextScreenId);

    // Enter the next screen
    delete nextScreen.dataset.viewport;
    currentScreen.dataset.viewport = 'left';

    // Advance progress bar
    wizard.classList.remove('step-' + (step + 1));
    wizard.classList.add('step-' + (step + 2));

    step += 1;
  }

  function onBack() {
    if (step === 0)
      return;

    var currentId = currentTrack[step];
    var currentScreen = document.getElementById(currentId);

    var prevScreenId = currentTrack[step - 1];
    var prevScreen = document.getElementById(prevScreenId);

    // Enter the previous screen
    delete prevScreen.dataset.viewport;
    currentScreen.dataset.viewport = 'right';

    // Back progress bar
    wizard.classList.remove('step-' + (step + 1));
    wizard.classList.add('step-' + step);

    step -= 1;
  }

  function onFinish() {
    ConfigManager.requestSettings(function _onSettings(settings) {
      updateNextReset(settings.trackingPeriod, settings.resetTime);
      ConfigManager.setOption({ fte: false }, function _returnToApp() {
        window.location = 'index.html';
      });
    });
  }

}());
