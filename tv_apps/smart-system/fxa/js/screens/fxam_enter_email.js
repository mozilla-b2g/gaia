/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global BrowserFrame */
/* global EntrySheet */
/* global ERROR_INVALID_SYNC_ACCOUNT */
/* global FxaModule */
/* global FxaModuleKeyNavigation */
/* global FxaModuleManager */
/* global FxaModuleNavigation */
/* global FxaModuleOverlay */
/* global FxModuleServerRequest */
/* global FxaModuleStates */
/* global FxaModuleUI */
/* global KeyEvent */

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

  function _isEmailValid(emailEl) {
    return emailEl && emailEl.value && emailEl.validity.valid;
  }

  function _loadSignIn(done) {
    done(FxaModuleStates.ENTER_PASSWORD);
  }

  function _loadSignUp(done) {
    done(FxaModuleStates.SET_PASSWORD);
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
      'fxa-email-clean-btn',
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
        if(this.fxaEmailInput.value) {
          this.fxaEmailCleanBtn.classList.add('show');
        } else {
          this.fxaEmailCleanBtn.classList.remove('show');
        }
        _enableNext(event.target);
      }.bind(this)
    );
    this.fxaEmailInput.addEventListener(
      'focus',
      function onFocus() {
        this.fxaLogo.setAttribute('hidden', true);
        if(this.fxaEmailInput.value) {
          this.fxaEmailCleanBtn.classList.add('show');
          // The input can only be selected at the next event queue
          setTimeout(this.fxaEmailInput.select.bind(this.fxaEmailInput));
        }
      }.bind(this)
    );
    this.fxaEmailInput.addEventListener(
      'blur',
      function onBlur() {
        this.fxaLogo.removeAttribute('hidden');
      }.bind(this)
    );

    this.fxaEmailCleanBtn.addEventListener(
      'click',
      function onMouseDown(e) {
        if(e.button === 0 ||
          (e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN)) {
          this.fxaEmailInput.value = '';
        }
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

    // There are 3 reasons why using setTimeout at this place:
    // 1. Focus() only works in the setTimeout callback here
    // 2. The input will be focused first and the keyboard will be brought
    //    up. We need to do this after the slide up animation of the parent
    //    fxa_dialog. But the fxa iframe has no way to know when the slide up
    //    animation is finished.
    // 3. Put the FxaModuleKeyNavigation.add in the onanimate callback in
    //    fxam_navigation.js doesn't work, since there is no animation for the
    //    first page in the flow.
    setTimeout(() => {
      FxaModuleKeyNavigation.add(
        ['#fxa-email-input', '#fxa-email-clean-btn', '#fxa-module-next']);
    }, 500);

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onAnimate = function onAnimate() {
    FxaModuleKeyNavigation.add(
      ['#fxa-email-input', '#fxa-email-clean-btn', '#fxa-module-next']);
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    FxaModuleOverlay.show('fxa-connecting');

    var email = this.fxaEmailInput.value;

    FxModuleServerRequest.checkEmail(email, response => {
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
      } else if (response && !response.registered) {
        // XXX On the TV we don't allow the creation of new FxA users because
        //     we only use FxA on Sync and we are unable to create new Sync
        //     users. So we show an error to the user, asking her to go to
        //     Desktop or Android to do the creation flow.
        this.showErrorResponse({error: ERROR_INVALID_SYNC_ACCOUNT});
      } else {
        this.showErrorResponse({error: 'OFFLINE'});
      }
      FxaModuleKeyNavigation.remove(
        ['#fxa-email-input', '#fxa-email-clean-btn', '#fxa-module-next']);
    }, this.showErrorResponse);
  };

  Module.onBack = function onBack() {
    FxaModuleUI.enableNextButton();
  };

  return Module;

}());

