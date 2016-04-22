/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global BrowserDialog */
/* global expect */
/* global MocksHelper */
/* global MockL10n */

'use strict';

require('/shared/js/smart-screen/shared_utils.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l20n.js');
requireApp('browser/js/browser_dialog.js');
requireApp('browser/test/unit/mocks/mock_browser.js');
requireApp('browser/test/unit/mocks/mock_awesomescreen.js');
requireApp('browser/test/unit/mocks/mock_fxos_tv_modal_dialog.js');

var mocksForBrowserDialog = new MocksHelper([
  'Awesomescreen',
  'Browser',
  'FxosTvModalDialog',
  'FxosTvInputDialog'
]).init();

suite('Browser Dialog >', function() {
  var subject;
  var realL10n;

  mocksForBrowserDialog.attachTestHelpers();

  suiteSetup(function() {
    realL10n = document.l10n;
    document.l10n = MockL10n;

    loadBodyHTML('fixtures/browser_dialog.html');

    subject = BrowserDialog;
    subject.init();
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
  });

  suite('Initial state', function() {
    test('should init DOM elements', function() {
      ['browserDialogBase'].forEach(element => {
        expect(subject[element]).to.be.an('object');
      });
    });
  });

  suite('Sign out dialog', function() {
    var openDialogSpy;

    setup(function() {
      this.sinon.stub(subject, 'cancelDialog');
      openDialogSpy = this.sinon.spy(subject, 'openDialog');
    });

    teardown(function() {
      openDialogSpy.restore();
    });

    test('signout_confirm dialog should be opened', function() {
      var promise = subject.createDialog('signout_confirm');
      sinon.assert.calledOnce(openDialogSpy);
      sinon.assert.calledWithMatch(openDialogSpy, {
        titleL10nId: 'fxsync-confirm-sign-out-title',
        messageL10nId: 'fxsync-confirm-sign-out-detail',
        buttonL10nId: 'fxsync-sign-out',
        buttonClass: 'danger'
      });
      expect(promise instanceof Promise).to.be.true;
    });
  });
});
