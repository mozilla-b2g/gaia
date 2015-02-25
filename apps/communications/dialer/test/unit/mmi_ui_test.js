/* globals MmiUI, MockNavigatormozApps */

'use strict';

require('/dialer/js/mmi_ui.js');

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

suite('dialer/mmi UI', function() {
  var realMozApps;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    loadBodyHTML('/dialer/index.html');
    MmiUI.init(function() {});
  });

  suiteTeardown(function() {
    MockNavigatormozApps.mTeardown();
    navigator.mozApps = realMozApps;
  });

  suite('MMI sending success >', function() {
    var result = 'success';
    var title = 'Success Title';

    setup(function() {
      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
    });

    test('UI is modified properly', function() {
      MmiUI.success(result, title);

      // Response form is hidden
      sinon.assert.calledOnce(MmiUI.hideResponseForm);
      assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
      assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

      // Message is shown
      sinon.assert.calledOnce(MmiUI.showMessage);
      sinon.assert.calledOnce(MmiUI.showWindow);
      assert.isFalse(MmiUI.mmiScreen.hidden);
      // Header is set with title
      assert.equal(MmiUI.headerTitleNode.textContent, title);
      // Message is correct
      assert.equal(MmiUI.messageNode.textContent, result);
    });
  });

  suite('MMI error >', function() {
    var title = 'Error Title';
    var error = 'Error Type';

    setup(function() {
      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
    });

    test('UI is modified properly', function() {
      MmiUI.error(error, title);

      // Response form is hidden
      sinon.assert.calledOnce(MmiUI.hideResponseForm);
      assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
      assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

      // Message is shown
      sinon.assert.calledOnce(MmiUI.showMessage);
      sinon.assert.calledOnce(MmiUI.showWindow);
      assert.isFalse(MmiUI.mmiScreen.hidden);
      // Header is set with title
      assert.equal(MmiUI.headerTitleNode.textContent, title);
      // Message is correct
      assert.equal(MmiUI.messageNode.textContent, error);
    });
  });

  suite('MMI received >', function() {
    var message = 'received ui';
    var title = 'Received UI Title';

    setup(function() {
      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
    });

    test('UI is modified properly', function() {
      MmiUI.received({}, message, title);

      // Response form is shown
      sinon.assert.calledOnce(MmiUI.showResponseForm);
      assert.isFalse(MmiUI.sendNode.classList.contains('hide'));
      assert.isTrue(MmiUI.mmiScreen.classList.contains('responseForm'));

      // Message is shown
      sinon.assert.calledOnce(MmiUI.showMessage);
      sinon.assert.calledOnce(MmiUI.showWindow);
      assert.isFalse(MmiUI.mmiScreen.hidden);
      // Header is set with title
      assert.equal(MmiUI.headerTitleNode.textContent, title);
      // Message is correct
      assert.equal(MmiUI.messageNode.textContent, message);
    });

    test('Dialer is shown', function() {
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.equal(MockNavigatormozApps.mAppWasLaunchedWithEntryPoint,
                   'dialer');
    });

    test('UI is modified properly (session expired)', function() {
      MmiUI.received(null, message, title);

      // Response form is hidden
      sinon.assert.calledOnce(MmiUI.hideResponseForm);
      assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
      assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

      // Message is shown
      sinon.assert.calledOnce(MmiUI.showMessage);
      sinon.assert.calledOnce(MmiUI.showWindow);
      assert.isFalse(MmiUI.mmiScreen.hidden);
      // Header is set with title
      assert.equal(MmiUI.headerTitleNode.textContent, title);
      // Message is correct
      assert.equal(MmiUI.messageNode.textContent, message);
    });
  });

  suite('MMI loading >', function() {
    test('UI is modified properly', function() {
      MmiUI.loading();

      // Show loading panel
      assert.isFalse(MmiUI.loadingOverlay.classList.contains('hide'));
      // Response disabled
      assert.isTrue(MmiUI.responseTextNode.disabled);
      // Reply disabled
      assert.isTrue(MmiUI.sendNode.disabled);
    });
  });
});
