/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleKeyNavigation */
/* global FxaModuleUI */
/* global HtmlHelper */
/* global KeyEvent */
/* global SharedUtils */
/* exported FxaModuleErrorOverlay */

'use strict';

/*
 * FxaModuleErrorOverlay shows an error prompt to the user with the info
 * retrieved after getting an error.
 * As params, we can define Title and Message.
 */

var FxaModuleErrorOverlay = {
  _deferred: null,

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

    this.fxaErrorOverlay.addEventListener('mouseup', this.hide.bind(this));
    this.fxaErrorOk.addEventListener('keydown', e => {
      if (e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaErrorOk.classList.add('active');
      }
    });
    this.fxaErrorOk.addEventListener('keyup', e => {
      if (e.keyCode &&
          (e.keyCode === KeyEvent.DOM_VK_RETURN || SharedUtils.isBackKey(e))) {
        this.fxaErrorOk.classList.remove('active');
        this.hide();
      }
    });
    this.fxaErrorOverlay.addEventListener('submit', this.prevent);

    this.initialized = true;
  },

  show: function fxam_error_overlay_show(titleL10n, messageL10n, resp) {
    var promise = new Promise((resolve, reject) => {
      FxaModuleErrorOverlay._deferred = {
        resolve: resolve,
        reject: reject
      };
    });

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

    document.activeElement.blur();
    this.fxaErrorOk.focus();

    FxaModuleUI.disableBackButton();

    return promise;
  },

  hide: function fxam_overlay_hide() {
    this.init();

    this.fxaErrorOverlay.classList.remove('show');
    FxaModuleKeyNavigation.enable();
    FxaModuleUI.enableBackButton();

    FxaModuleErrorOverlay._deferred.resolve();
    FxaModuleErrorOverlay._deferred = null;
  },

  prevent: function fxam_prevent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
};
