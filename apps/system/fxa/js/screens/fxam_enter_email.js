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
    this.fxaEmailInput.addEventListener('focus', function() {
      window.addEventListener('resize', function resize() {
        window.removeEventListener('resize', resize);
        // Need to wait till resize is done
        setTimeout(function() {
          var page = document.getElementById('fxa-email-section');
          var emailInput = document.getElementById('fxa-email-input');
          page.parentNode.scrollTop = emailInput.offsetTop;
        }, 30);
      });
    });

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
      if (this.entrySheet) {
        this.entrySheet.close();
        this.entrySheet = null;
      }
      this.entrySheet = new EntrySheet(
        window.top.document.getElementById('screen'),
        // Prefix url with LRM character
        // This ensures truncation occurs correctly in an RTL document
        // We can remove this when bug 1154438 is fixed.
        '\u200E' + url,
        new BrowserFrame({
          url: url,
          oop: true
        })
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

    window.addEventListener('holdhome', hideEntrySheet.bind(this));
    window.addEventListener('home', hideEntrySheet.bind(this));
    window.addEventListener('activityrequesting', hideEntrySheet.bind(this));

    function hideEntrySheet() {
      /*jshint validthis:true */
      if (this.entrySheet) {
        this.entrySheet.close();
        this.entrySheet = null;
      }
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

