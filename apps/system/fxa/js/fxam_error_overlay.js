/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global Utils */
/* exported FxaModuleErrorOverlay */

'use strict';

/*
 * FxaModuleErrorOverlay shows an error prompt to the user with the info
 * retrieved after getting an error.
 * As params, we can define Title and Message.
 */

var FxaModuleErrorOverlay = {
  init: function fxam_error_overlay_init() {
    if (this.initialized) {
      return;
    }

    Utils.importElements(this,
      'fxa-error-overlay',
      'fxa-error-title',
      'fxa-error-msg',
      'fxa-error-ok'
    );

    this.fxaErrorOk.addEventListener('click', this.hide.bind(this));
    this.fxaErrorOverlay.addEventListener('submit', this.prevent);

    this.initialized = true;
  },

  show: function fxam_error_overlay_show(title, message) {
    this.init();

    this.fxaErrorTitle.textContent = title || '';
    this.fxaErrorMsg.textContent = message || '';

    this.fxaErrorOverlay.classList.add('show');
  },

  hide: function fxam_overlay_hide() {
    this.init();

    this.fxaErrorOverlay.classList.remove('show');
  },

  prevent: function fxam_prevent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
};
