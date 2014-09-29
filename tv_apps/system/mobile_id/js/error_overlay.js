/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global HtmlHelper */
/* exported MobileIDErrorOverlay */

'use strict';

/*
 * MobileIDErrorOverlay shows an error prompt to the user with the info
 * retrieved after getting an error.
 * As params, we can define Title and Message.
 */

var MobileIDErrorOverlay = {
  init: function mobileid_error_overlay_init() {
    if (this.initialized) {
      return;
    }

    HtmlHelper.importElements(this,
      'mobileid-error-overlay',
      'mobileid-error-title',
      'mobileid-error-msg',
      'mobileid-error-ok'
    );

    this.mobileidErrorOverlay.addEventListener(
      'submit',
      this.prevent.bind(this)
    );

    this.initialized = true;
  },

  show: function mobileidm_error_overlay_show(title, message, cb) {
    this.init();

    this.mobileidErrorTitle.textContent = title || '';
    this.mobileidErrorMsg.innerHTML = message || '';
    this.mobileidErrorOk.onclick = function(event) {
      if (typeof cb === 'function') {
        cb();
      }
      this.hide();
    }.bind(this);

    this.mobileidErrorOverlay.classList.add('show');
  },

  hide: function mobileidm_overlay_hide() {
    this.mobileidErrorOk.onclick = null;
    this.mobileidErrorOverlay.classList.remove('show');
  },

  prevent: function mobileidm_prevent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
};
