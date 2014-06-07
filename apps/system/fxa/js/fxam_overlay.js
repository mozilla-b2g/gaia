/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global Utils */
/* exported FxaModuleOverlay */

'use strict';

/*
 * FxaModuleOverlay shows an loading prompt to the user.
 * As params, we can only a message which will be shown with
 * a spinner of 'loading'.
 */

var FxaModuleOverlay = {
    init: function fxam_overlay_init() {
      if (this.initialized) {
        return;
      }

      Utils.importElements(this,
        'fxa-overlay',
        'fxa-overlay-msg'
      );

      this.initialized = true;
    },

    show: function fxam_overlay_show(string) {
      this.init();

      this.fxaOverlayMsg.textContent = string;
      this.fxaOverlay.classList.add('show');
    },

    hide: function fxam_overlay_hide() {
      this.init();

      this.fxaOverlay.classList.remove('show');
    }
};
