/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global HtmlHelper */
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

    HtmlHelper.importElements(this,
      'fxa-error-overlay',
      'fxa-error-title',
      'fxa-error-msg',
      'fxa-error-msg-coppa',
      'fxa-error-ok'
    );

    this.fxaErrorOk.addEventListener('click', this.hide.bind(this));
    this.fxaErrorOverlay.addEventListener('submit', this.prevent);

    this.initialized = true;
  },

  show: function fxam_error_overlay_show(titleL10n, messageL10n, resp) {
    this.init();

    this.fxaErrorTitle.setAttribute('data-l10n-id', titleL10n);

    if (resp && resp.error === 'COPPA_ERROR') {
      this.fxaErrorMsg.style.display = 'none';
      this.fxaErrorMsgCoppa.style.display = 'inline';
      this.fxaErrorMsgCoppa.setAttribute('data-l10n-id', messageL10n);
    } else {
      this.fxaErrorMsg.style.display = 'inline';
      this.fxaErrorMsgCoppa.style.display = 'none';
      this.fxaErrorMsg.setAttribute('data-l10n-id', messageL10n);
    }


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
