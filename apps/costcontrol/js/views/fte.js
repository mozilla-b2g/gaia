/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Retrieve service
var Service = getService(function ccapp_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the Service object
  // again and setup the application.
  Service = evt.detail.service;
  setupFTE();
});
if (Service)
  setupFTE();

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
function setupFTE() {
  var _wizard = document.getElementById('firsttime-view');

  var _toStep2, _wizardMode = '', _step = 0;
  var _currentTrack = ['step-1'];

  function _track(track) {
    if (typeof track === 'undefined')
      return _currentTrack;

    _currentTrack = track;
  }

  function _reset(track) {
    // Set wizard progess section
    _wizard.classList.add('total-steps-' + track.length);
    _wizard.classList.remove('step-' + (_step + 1));
    _wizard.classList.add('step-1');

    // Reposition screens
    var currentScreen = document.getElementById(_currentTrack[_step]);
    var newStartScreen = document.getElementById(track[0]);

    currentScreen.dataset.viewport = 'left';
    newStartScreen.dataset.viewport = 'right';
    delete newStartScreen.dataset.viewport;

    for (var i = 1, id; id = track[i]; i += 1) {
      var screen = document.getElementById(id);
      screen.dataset.viewport = 'right';
    }

    // Reset state
    _step = 0;
    _track(track);
  }

  function _next() {
    if (_step === _currentTrack.length - 1)
      return;

    var currentId = _currentTrack[_step];
    var currentScreen = document.getElementById(currentId);

    var nextScreenId = _currentTrack[_step + 1];
    var nextScreen = document.getElementById(nextScreenId);

    // Enter the next screen
    delete nextScreen.dataset.viewport;
    currentScreen.dataset.viewport = 'left';

    // Advance progress bar
    _wizard.classList.remove('step-' + (_step + 1));
    _wizard.classList.add('step-' + (_step + 2));

    _step += 1;
  }

  function _back() {
    if (_step === 0)
      return;

    var currentId = _currentTrack[_step];
    var currentScreen = document.getElementById(currentId);

    var prevScreenId = _currentTrack[_step - 1];
    var prevScreen = document.getElementById(prevScreenId);

    // Enter the previous screen
    delete prevScreen.dataset.viewport;
    currentScreen.dataset.viewport = 'right';

    // Back progress bar
    _wizard.classList.remove('step-' + (_step + 1));
    _wizard.classList.add('step-' + _step);

    _step -= 1;
  }

  function _finish() {
    Service.settings.option('fte', false);
    parent.settingsVManager.closeCurrentView();
    window.close();
  }

  function _onPlanSelect(e) {
    if (e.target.value === 'prepaid') {
      _track(['step-1', 'prepaid-step-2', 'prepaid-step-3']);
      Service.settings.option('data_limit_value', 40);
      Service.settings.option('data_limit_unit', 'MB');
    } else if (e.target.value === 'postpaid') {
      _track(['step-1', 'postpaid-step-2', 'postpaid-step-3']);
      Service.settings.option('data_limit_value', 2);
      Service.settings.option('data_limit_unit', 'GB');
    }

    Service.settings.option('plantype', e.target.value);
    _toStep2.disabled = false;

    debug(_wizardMode);
  }

  function _setupPlanSelection() {
    _toStep2 = document.getElementById('to-step-2');
    _toStep2.disabled = true;

    document.getElementById('prepaid-plan')
      .addEventListener('click', _onPlanSelect);
    document.getElementById('postpaid-plan')
      .addEventListener('click', _onPlanSelect);
  }

  function _setupNavigation() {
    var next = document.querySelectorAll('[data-navigation=next]');
    [].forEach.call(next, function cc_eachNext(nextButton) {
      nextButton.addEventListener('click', _next);
    });

    var prev = document.querySelectorAll('[data-navigation=back]');
    [].forEach.call(prev, function cc_eachPrev(prevButton) {
      prevButton.addEventListener('click', _back);
    });

    var finish = document.querySelectorAll('[data-navigation=finish]');
    [].forEach.call(finish, function cc_eachFinish(finishButton) {
      finishButton.addEventListener('click', _finish);
    });
  }

  function _configureUI() {
    var autoSettings = new AutoSettings(Service.settings, new ViewManager());
    autoSettings.customRecognizer = dataLimitRecognizer;
    autoSettings.addType('data-limit', dataLimitConfigurer);
    autoSettings.configure();
    _setupPlanSelection();
    _setupNavigation();

    var status = Service.getServiceStatus();

    // Adapt tab visibility according to available functionality
    if (!status.enabledFunctionalities.balance &&
        !status.enabledFunctionalities.telephony) {

      debug('FTE for non supported SIM');
      _reset(['non-vivo-step-1', 'non-vivo-step-2']);
    }

  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configureUI();
  }

  _init();

}
