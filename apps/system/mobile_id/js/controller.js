
/* exports Controller */
/* global UI */

(function(exports) {
  'use strict';

  function _localize(appName) {
    navigator.mozL10n.ready(function localized() {
      UI.localize(appName);
    });
  }

  var Controller = {
    init: function c_init() {
      window.addEventListener(
        'init',
        this
      );
      window.addEventListener(
        'shown',
        this
      );
      window.addEventListener(
        'onverifying',
        this
      );
      window.addEventListener(
        'onverified',
        this
      );
      window.addEventListener(
        'onerror',
        this
      );
      window.addEventListener(
        'onverificationcode',
        this
      );
    },
    handleEvent: function c_handleEvent(e) {
      switch(e.type) {
        case 'init':
          _localize(e.detail.appName);
          UI.render(e.detail.candidates);
          break;
        case 'shown':
          UI.setScroll();
          break;
        case 'onverifying':
          UI.onVerifying();
          break;
        case 'onverified':
          UI.onVerified(e.detail.phoneNumber);
          break;
        case 'onerror':
          UI.onerror(e.detail.error);
          break;
        case 'onverificationcode':
          UI.onVerificationCode(e.detail);
          break;
      }
    },
    requestCode: function c_requestCode() {
      window.parent.MobileIdManager.requestNewCode();
    },
    postIdentity: function c_postIdentity(params) {
      window.parent.MobileIdManager.sendMsisdn(params);
    },
    postVerificationCode: function c_postIdentity(params) {
      window.parent.MobileIdManager.sendVerificationCode(params);
    },
    postCloseAction: function c_postCloseAction(isVerified) {
      window.parent.MobileIdManager.close(isVerified);
    }
  };

  exports.Controller = Controller;

}(this));
