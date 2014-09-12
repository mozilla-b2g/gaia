/* globals MocksHelper, MmiUI, MockNavigatormozApps */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

var mocksHelperForMmiUI = new MocksHelper([
  'LazyL10n'
]).init();

suite('dialer/mmi UI', function() {
  var realMozApps;

  mocksHelperForMmiUI.attachTestHelpers();

  function waitForMMI(data) {
    return new Promise(function(resolve) {
      window.addEventListener('message', function mochaFilter(evt) {
        // Bug 874510 - Update mocha
        // Mocha uses message event so we're filtering them out
        if (evt.data.type != data.type) {
          return;
        }
        window.removeEventListener('message', mochaFilter);

        resolve();
      });

      window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
    });
  }

  suiteSetup(function(done) {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    loadBodyHTML('/dialer/index.html');
    requireApp('communications/dialer/js/mmi_ui.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozApps.mTeardown();
    navigator.mozApps = realMozApps;
  });

  suite('MMI sending success >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-success',
        result: 'success',
        title: 'Success Title'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
    });

    test('UI is modified properly', function(done) {
      waitForMMI(data).then(function() {
        // Response form is hidden
        assert.isTrue(MmiUI.hideResponseForm.calledOnce);
        assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
        assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.result);
      }).then(done, done);
    });
  });

  suite('MMI error >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-error',
        result: 'error',
        title: 'Error Title',
        error: 'Error Type'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
      this.sinon.spy(MmiUI, 'handleError');
    });

    test('UI is modified properly', function(done) {
      waitForMMI(data).then(function() {
        // Error handled
        assert.isTrue(MmiUI.handleError.calledOnce);
        // Response form is hidden
        assert.isTrue(MmiUI.hideResponseForm.calledOnce);
        assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
        assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.error);
      }).then(done, done);
    });
  });

  suite('MMI received >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-received-ui',
        message: 'received ui',
        title: 'Received UI Title'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
    });

    test('UI is modified properly ', function(done) {
      waitForMMI(data).then(function() {
        // Response form is shown
        assert.isTrue(MmiUI.showResponseForm.calledOnce);
        assert.isFalse(MmiUI.sendNode.classList.contains('hide'));
        assert.isTrue(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.message);
      }).then(done, done);
    });

    test('Dialer is shown', function(done) {
      waitForMMI(data).then(function() {
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        assert.equal(MockNavigatormozApps.mAppWasLaunchedWithEntryPoint,
                     'dialer');
        window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
      }).then(done, done);
    });

    test('UI is modified properly (session expired)', function(done) {
      data.sessionEnded = true;
      waitForMMI(data).then(function() {
        // Response form is hidden
        assert.isTrue(MmiUI.hideResponseForm.calledOnce);
        assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
        assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.message);
      }).then(done, done);
    });
  });

  suite('MMI loading >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-loading'
      };
    });

    test('UI is modified properly', function(done) {
      waitForMMI(data).then(function() {
        // Show loading panel
        assert.isFalse(MmiUI.loadingOverlay.classList.contains('hide'));
        // Response disabled
        assert.isTrue(MmiUI.responseTextNode.disabled);
        // Reply disabled
        assert.isTrue(MmiUI.sendNode.disabled);
      }).then(done, done);
    });
  });
});
