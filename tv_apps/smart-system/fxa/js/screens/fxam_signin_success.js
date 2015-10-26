/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModule, FxaModuleStates, FxaModuleUI */
/* exported FxaModuleSigninSuccess */

'use strict';

/**
 * Display the signup success message to the user.
 */
var FxaModuleSigninSuccess = (function() {

  var Module = Object.create(FxaModule);

  Module.init = function init() {
    FxaModuleUI.focusDoneButton();
  };

  Module.onNext = function onNext(done) {
    done(FxaModuleStates.DONE);
  };

  return Module;

}());

