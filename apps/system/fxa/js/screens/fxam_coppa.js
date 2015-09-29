/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This module allow the user to select her age from a date picker and checks
 * that she is old enough to create a Firefox account. Otherwise, it shows an
 * error.
 */

/* global FxaModuleUI, FxaModule, FxaModuleStates, FxaModuleNavigation */
/* exported FxaModuleCoppa */

var FxaModuleCoppa = (function() {

  var MINIMUM_AGE = 13;

  function _populateSelect(select) {
    var currentYear = new Date().getFullYear();
    var start = currentYear - MINIMUM_AGE;
    for (var year = start; year <= currentYear; year++) {
      var option = document.createElement('option');
      option.value= year;
      if (year == start) {
        option.setAttribute('data-l10n-id', 'fxa-age-earlier');
        option.setAttribute('data-l10n-args', '{ "year": "' + year + '" }');
      } else {
        option.textContent = year;
      }
      select.appendChild(option);
    }
  }

  function _enableNext(age) {
    if (age === '0') {
      FxaModuleUI.disableNextButton();
      return;
    }
    FxaModuleUI.enableNextButton();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.importElements('fxa-age-select');

    this.isFTU = !!(options && options.isftu);

    // Initially we only have one value ("Year of birth") in the age
    // selection element.
    if (this.fxaAgeSelect.length == 1) {
      _populateSelect(this.fxaAgeSelect);
    }

    _enableNext(this.fxaAgeSelect.value);

    // If COPPA is part of the sign up flow, then we need to add a step to the
    // progress bar. Don't increment if the user is moving backwards, though.
    if (!FxaModuleNavigation.backAnim) {
      FxaModuleUI.increaseMaxStepsBy(1);
    }

    if (this.initialized) {
      return;
    }

    this.fxaAgeSelect.addEventListener('change', () => {
      _enableNext(this.fxaAgeSelect.value);
    });

    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    if (new Date().getFullYear() - this.fxaAgeSelect.value < MINIMUM_AGE) {
      this.showErrorResponse({
        error: this.isFTU ? 'COPPA_FTU_ERROR' : 'COPPA_ERROR'
      });
      return;
    }
    gotoNextStepCallback(FxaModuleStates.SET_PASSWORD);
  };

  Module.onBack = function onBack() {
    FxaModuleUI.decreaseMaxStepsBy(1);
  };

  return Module;
})();
