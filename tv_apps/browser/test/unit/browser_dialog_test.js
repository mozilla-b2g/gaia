/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global BrowserDialog */
/* global expect */
/* global MocksHelper */
/* global MockL10n */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('browser/js/browser_dialog.js');
requireApp('browser/test/unit/mocks/mock_browser.js');
requireApp('browser/test/unit/mocks/mock_awesomescreen.js');

var mocksForBrowserDialog = new MocksHelper([
  'Awesomescreen',
  'Browser'
]).init();

suite('Browser Dialog >', function() {
  var subject;
  var realL10n;

  mocksForBrowserDialog.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('fixtures/browser_dialog.html');

    subject = BrowserDialog;
    subject.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Initial state', function() {
    test('should init DOM elements', function() {
      [
        'browserDialogBase',
        'browserDialog',
        'browserDialogTitle',
        'browserDialogMsg',
        'browserDialogInput',
        'browserDialogInputArea',
        'browserDialogInputClear',
        'browserDialogButton',
        'browserDialogButton1',
        'browserDialogButton2'].forEach(element => {
        expect(subject[element]).to.be.an('object');
      });
    });

    test('should not have pending deferred actions', function() {
      expect(subject.deferredActions.size).to.equals(0);
    });
  });

  suite('Sign out dialog', function() {
    var promise;

    setup(function() {
      this.sinon.stub(subject, 'cancelDialog');
      window._ = navigator.mozL10n.get;
    });

    test('signout_confirm dialog should add a deferred action',
         function(done) {
      promise = subject.createDialog('signout_confirm');
      expect(subject.browserDialogMsg.innerHTML)
        .to.equals('fxsync-confirm-disconnect');
      expect(subject.browserDialogButton1.textContent)
        .to.equals('LT_CANCEL');
      expect(subject.browserDialogButton1.dataset.type)
        .to.equals('signout_confirm');
      expect(subject.browserDialogButton1.classList.contains('visible'))
        .to.equals(true);
      expect(subject.browserDialogButton2.textContent)
        .to.equals('fxsync-disconnect');
      expect(subject.browserDialogButton2.dataset.type)
        .to.equals('signout_confirm');
      expect(subject.browserDialogButton2.classList.contains('visible'))
        .to.equals(true);
      expect(subject.deferredActions.size).to.equals(1);
      done();
    });

    test('click on signout_confirm button 2 should resolve deferred action',
         function(done) {
      promise.then(() => {
        expect(subject.deferredActions.size).to.equals(0);
        done();
      });
      subject.dialogButton2({
        preventDefault() {},
        currentTarget: {
          addEventListener() {},
          removeEventListener() {}
        }
      });
    });

    test('click on signout_confirm button 1 should reject deferred action',
         function(done) {
      subject.createDialog('signout_confirm').catch(() => {
        expect(subject.deferredActions.size).to.equals(0);
        done();
      });
      subject.dialogButton1({
        preventDefault() {},
        currentTarget: {
          addEventListener() {},
          removeEventListener() {}
        }
      });
    });
  });
});
