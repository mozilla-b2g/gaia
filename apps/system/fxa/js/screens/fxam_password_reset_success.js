/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Display the password reset success message to the user.
 */
var FxaModulePasswordResetSuccess = (function() {

  function getNextState(done) {
    return done(FxaModuleStates.DONE);
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    options = options || {};
    this.importElements(
      'fxa-summary-email'
    );
    this.fxaSummaryEmail.innerHTML = options.email;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    getNextState(gotoNextStepCallback);
  };

  return Module;

}());

