/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModule, FxaModuleStates */
/* exported FxaModuleSignupSuccess */

'use strict';

/**
 * Display the signup success message to the user.
 */
var FxaModuleSignupSuccess = (function() {

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    options = options || {};
    this.importElements('fxa-summary-email');
    this.fxaSummaryEmail.textContent = options.email;
  };

  Module.onNext = function onNext(done) {
    done(FxaModuleStates.DONE);
  };

  return Module;

}());

