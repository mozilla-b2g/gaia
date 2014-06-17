/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global HtmlHelper, FxaModuleOverlay, LazyLoader, FxaModuleErrors,
   FxaModuleErrorOverlay */
/* exported FxaModule */

'use strict';

var FxaModule = (function() {

  var Module = {
    initialized: false,
    init: function fxam_init() {
      // override this to do initialization
      // l10n note: this method is called after mozL10n.once has fired. It is
      // safe to assume strings have loaded and mozL10n.readyState is 'complete'
      // inside this function and other Module functions.
    },

    onNext: function fxam_onNext(gotoNextStepCallback) {
      // override this to take care of when the user clicks on the "next"
      // button. Validate any inputs, talk with the backend, do processing.
      // When complete, call gotoNextStepCallback with the next state from
      // fxam_states.js
    },

    onBack: function fxam_onBack() {
      // handle "back" button presses.
    },

    onDone: function fxam_onDone(doneCallback) {
      doneCallback();
    },

    importElements: function fxam_importElements() {
      var args = [].slice.call(arguments);
      // context to import into is the first argument to importElements
      args.unshift(this);
      HtmlHelper.importElements.apply(null, args);
    },

    showErrorResponse: function fxam_showErrorResponse(response) {
      // special case: if a network error occurs during FTE,
      // we show a slightly different error message
      var resp = response;
      if (window.location.search.indexOf('isftu') != -1 &&
          resp == 'OFFLINE_ERROR') {
        resp = 'CONNECTION_ERROR';
      }

      FxaModuleOverlay.hide();
      LazyLoader.load('js/fxam_errors.js', function() {
        var config = FxaModuleErrors.responseToParams(resp);
        FxaModuleErrorOverlay.show(config.title, config.message);
      });
    }
  };

  return Module;

}());

