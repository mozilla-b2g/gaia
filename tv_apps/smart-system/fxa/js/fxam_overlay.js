/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global HtmlHelper */
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

      HtmlHelper.importElements(this,
        'fxa-overlay',
        'fxa-overlay-msg'
      );

      this.initialized = true;
    },

    show: function fxam_overlay_show(l10nId) {
      this.init();

      this.fxaOverlayMsg.setAttribute('data-l10n-id', l10nId);
      this.fxaOverlay.classList.add('show');
    },

    hide: function fxam_overlay_hide() {
      this.init();

      this.fxaOverlay.classList.remove('show');
    }
};
