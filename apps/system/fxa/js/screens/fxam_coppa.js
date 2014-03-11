/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This module allow the user to select her age from a date picker and checks
 * that she is old enough to create a Firefox account. Otherwise, it shows an
 * error.
 */

/* global FxaModuleUI, FxaModule, FxaModuleStates */
/* exported FxaModuleCoppa */

var FxaModuleCoppa = (function() {

  var MINIMUM_AGE = 13;

  function _enableNext(age) {
    if (age === '0') {
      FxaModuleUI.disableNextButton();
      return;
    }
    FxaModuleUI.enableNextButton();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init() {
    this.importElements('fxa-age-select');

    _enableNext(this.fxaAgeSelect.value);

    if (this.initialized) {
      return;
    }

    // By default, the sign in flow has 3 steps. If the login flow turns into a
    // a sign up one, we need to increment the number of steps in one because
    // of the introduction of the COPPA screen.
    FxaModuleUI.increaseMaxStepsBy(1);

    this.fxaAgeSelect.addEventListener('change', (function onSelectChange(e) {
      _enableNext(this.fxaAgeSelect.value);
    }).bind(this));

    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    if (new Date().getFullYear() - this.fxaAgeSelect.value < MINIMUM_AGE) {
      this.showErrorResponse({
        error: 'COPPA_ERROR'
      });
      return;
    }
    gotoNextStepCallback(FxaModuleStates.SET_PASSWORD);
  };

  return Module;
})();
