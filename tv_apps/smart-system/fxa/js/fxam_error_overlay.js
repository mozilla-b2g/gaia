/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleKeyNavigation */
/* global FxaModuleUI */
/* global HtmlHelper */
/* global KeyEvent */
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
      'fxa-error-ok'
    );

    this.fxaErrorOk.addEventListener('mouseup', this.hide.bind(this));
    this.fxaErrorOk.addEventListener('keydown', e => {
      if (e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaErrorOk.classList.add('active');
      }
    });
    this.fxaErrorOk.addEventListener('keyup', e => {
      if (e.keyCode &&
          (e.keyCode === KeyEvent.DOM_VK_RETURN ||
          e.keyCode === KeyEvent.DOM_VK_ESCAPE ||
          e.keyCode === KeyEvent.DOM_VK_BACK_SPACE)) {
        this.fxaErrorOk.classList.remove('active');
        this.hide();
      }
    });
    this.fxaErrorOverlay.addEventListener('submit', this.prevent);

    this.initialized = true;
  },

  show: function fxam_error_overlay_show(titleL10n, messageL10n) {
    this.init();

    this.fxaErrorTitle.setAttribute('data-l10n-id', titleL10n);
    if (typeof(messageL10n) === 'object') {
      this.fxaErrorMsg.innerHTML = messageL10n.html;
    } else {
      this.fxaErrorMsg.setAttribute('data-l10n-id', messageL10n);
    }

    this.fxaErrorOverlay.classList.add('show');

    document.activeElement.blur();
    this.fxaErrorOk.focus();

    FxaModuleUI.disableBack();
  },

  hide: function fxam_overlay_hide() {
    this.init();

    this.fxaErrorOverlay.classList.remove('show');
    FxaModuleKeyNavigation.enable();
    FxaModuleUI.enableBack();
  },

  prevent: function fxam_prevent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
};
