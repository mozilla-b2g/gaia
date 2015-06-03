/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxaModuleNavigation,
   FxModuleServerRequest, FxaModuleOverlay, FxaModuleManager,
   BroadcastChannel */
/* exported FxaModuleEnterEmail */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

var FxaModuleEnterEmail = (function() {

  var _ = null;
  var termsUrl = 'https://accounts.firefox.com/legal/terms';
  var privacyUrl = 'https://accounts.firefox.com/legal/privacy';

  var channel = new BroadcastChannel('fxa');
  function broadcast(message) {
    channel.postMessage(message);
  }

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

    // Cache static HTML elements
    this.importElements(
      'fxa-email-input',
      'fxa-logo',
      'fxa-notice'
    );

    // Blocks the navigation until check the condition
    _enableNext(this.fxaEmailInput);

    if (this.initialized) {
      return;
    }

    // dynamically construct and localize ToS/PN notice
    // XXX This relies on the current l10n fallback mechanism which will change
    // in the future;  a real solution involves DOM overlays:
    // https://bugzil.la/994357
    var noticeText = _('fxa-notice');
    var tosReplaced = noticeText.replace(
      /{{\s*tos\s*}}/,
      '<a id="fxa-terms" href="' + termsUrl + '">Terms of Service</a>'
    );
    var tosPnReplaced = tosReplaced.replace(
      /{{\s*pn\s*}}/,
      '<a id="fxa-privacy" href="' + privacyUrl + '">Privacy Notice</a>'
    );
    this.fxaNotice.innerHTML = tosPnReplaced;

    // manually import a few elements after innerHTMLing
    this.fxaPrivacy = document.getElementById('fxa-privacy');
    this.fxaPrivacy.setAttribute('data-l10n-id', 'fxa-pn');
    this.fxaTerms = document.getElementById('fxa-terms');
    this.fxaTerms.setAttribute('data-l10n-id', 'fxa-tos');

    this.isFTU = !!(options && options.isftu);

    // Add listeners
    this.fxaEmailInput.addEventListener(
      'input',
      function onInput(event) {
        _enableNext(event.target);
      }
    );
    this.fxaEmailInput.addEventListener(
      'focus',
      function onFocus() {
        this.fxaLogo.setAttribute('hidden', true);
      }.bind(this)
    );
    this.fxaEmailInput.addEventListener(
      'blur',
      function onBlur() {
        this.fxaLogo.removeAttribute('hidden');
      }.bind(this)
    );

    this.fxaTerms.addEventListener('click', onExternalLinkClick.bind(this));
    this.fxaPrivacy.addEventListener('click', onExternalLinkClick.bind(this));

    function onExternalLinkClick(e) {
      /*jshint validthis:true */
      e.stopPropagation();
      e.preventDefault();
      if (!navigator.onLine) {
        return this.showErrorResponse({error: 'OFFLINE'});
      }
      var url = e.target.href;
      broadcast(['EntrySheet:instantiate', '\u200E' + url, url]);
    }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange.bind(this)
    );

    function onVisibilityChange() {
      /*jshint validthis:true */
      if (document.hidden) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        broadcast(['EntrySheet:close']);
      }
    }

    window.addEventListener('holdhome', hideEntrySheet.bind(this));
    window.addEventListener('home', hideEntrySheet.bind(this));
    window.addEventListener('activityrequesting', hideEntrySheet.bind(this));

    function hideEntrySheet() {
      /*jshint validthis:true */
      broadcast(['EntrySheet:close']);
      window.removeEventListener('holdhome', hideEntrySheet);
      window.removeEventListener('home', hideEntrySheet);
      window.removeEventListener('activityrequesting', hideEntrySheet);
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
    FxaModuleOverlay.show('fxa-connecting');

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

