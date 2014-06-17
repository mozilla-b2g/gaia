/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxaModuleNavigation,
   FxModuleServerRequest, FxaModuleOverlay, FxaModuleManager, EntrySheet,
   BrowserFrame */
/* exported FxaModuleEnterEmail */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

var FxaModuleEnterEmail = (function() {

  var _ = null;
  var localize = null;
  var termsUrl = 'https://accounts.firefox.com/legal/terms';
  var privacyUrl = 'https://accounts.firefox.com/legal/privacy';

  function _isEmailValid(emailEl) {
    return emailEl && emailEl.value && emailEl.validity.valid;
  }

  function _loadSignIn(done) {
    done(FxaModuleStates.ENTER_PASSWORD);
  }

  function _loadSignUp(done) {
    done(FxaModuleStates.SET_PASSWORD);
  }

  function _loadCoppa(done) {
    done(FxaModuleStates.COPPA);
  }

  function _enableNext(emailEl) {
    if (_isEmailValid(emailEl)) {
      FxaModuleUI.enableNextButton();
    } else {
      FxaModuleUI.disableNextButton();
    }
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    _ = navigator.mozL10n.get;
    localize = navigator.mozL10n.localize;

    // Cache static HTML elements
    this.importElements(
      'fxa-email-input',
      'fxa-notice'
    );

    // Blocks the navigation until check the condition
    _enableNext(this.fxaEmailInput);

    if (this.initialized) {
      return;
    }

    // dynamically construct and localize ToS/PN notice
    var noticeText = _('fxa-notice');
    var tosReplaced = noticeText.replace(
      '{{tos}}',
      '<a id="fxa-terms" href="' + termsUrl + '">Terms of Service</a>'
    );
    var tosPnReplaced = tosReplaced.replace(
      '{{pn}}',
      '<a id="fxa-privacy" href="' + privacyUrl + '">Privacy Notice</a>'
    );
    this.fxaNotice.innerHTML = tosPnReplaced;

    // manually import a few elements after innerHTMLing
    this.fxaPrivacy = document.getElementById('fxa-privacy');
    localize(this.fxaPrivacy, 'fxa-pn');
    this.fxaTerms = document.getElementById('fxa-terms');
    localize(this.fxaTerms, 'fxa-tos');

    this.isFTU = !!(options && options.isftu);

    // Add listeners
    this.fxaEmailInput.addEventListener(
      'input',
      function onInput(event) {
        _enableNext(event.target);
      }
    );

    this.fxaTerms.addEventListener('click', onExternalLinkClick.bind(this));
    this.fxaPrivacy.addEventListener('click', onExternalLinkClick.bind(this));

    function onExternalLinkClick(e) {
      /*jshint validthis:true */
      e.stopPropagation();
      e.preventDefault();
      var url = e.target.href;
      if (this.entrySheet) {
        this.entrySheet = null;
      }
      this.entrySheet = new EntrySheet(
        window.top.document.getElementById('dialog-overlay'),
        url,
        new BrowserFrame({url: url})
      );
      this.entrySheet.open();
    }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange.bind(this)
    );

    function onVisibilityChange() {
      /*jshint validthis:true */
      if (document.hidden) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (this.entrySheet) {
          this.entrySheet.close();
          this.entrySheet = null;
        }
      }
    }

    // Ensure that pressing 'ENTER' (keycode 13) we send the form
    // as expected
    this.fxaEmailInput.addEventListener(
      'keypress',
      function onKeypress(event) {
        if (_isEmailValid(this.fxaEmailInput) && event.keyCode === 13) {
          document.activeElement.blur();
          FxaModuleNavigation.next();
        }
      }.bind(this)
    );

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    FxaModuleOverlay.show(_('fxa-connecting'));

    var email = this.fxaEmailInput.value;

    FxModuleServerRequest.checkEmail(
      email,
      function onSuccess(response) {
        FxaModuleOverlay.hide();
        FxaModuleManager.setParam('email', email);
        if (response && response.registered) {
          _loadSignIn(gotoNextStepCallback);
        } else if (this.isFTU) {
          // XXX Skip COPPA verification during FTU: if a child has a mobile
          // device, we assume a parent/guardian has given it to them, which
          // implies parental consent. So, we skip to the next step in the
          // signup flow, the set-password screen. See also bug 1010598.
          _loadSignUp(gotoNextStepCallback);
        } else {
          _loadCoppa(gotoNextStepCallback);
        }
      }.bind(this),
      this.showErrorResponse);
  };

  Module.onBack = function onBack() {
    FxaModuleUI.enableNextButton();
  };

  return Module;

}());

