'use strict';

mocha.globals(['PermissionManager']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/permission_manager.js');

function sendChromeEvent(evt_type, evt_permission) {
  var detail = {'type': evt_type, 'permission': evt_permission,
                'origin': 'test', 'isApp': false };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });

  window.dispatchEvent(evt);
}

suite('system/permission manager', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('init()', function() {
    test('default values', function() {
      assert.equal(PermissionManager.fullscreenRequest, undefined);
      assert.equal(PermissionManager.pending, '');
      assert.equal(PermissionManager.nextRequestID, 0);
      assert.equal(PermissionManager.currentRequestId, undefined);
      assert.equal(PermissionManager.currentOrigin, undefined);
      assert.equal(PermissionManager.currentPermission, undefined);
    });
  });

  suite('permission-prompt Handler', function() {
    var stubPrompt;

    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      stubPrompt = this.sinon.stub(PermissionManager, 'handlePermissionPrompt');

      sendChromeEvent('permission-prompt', 'test');
    });

    teardown(function() {
      stubPrompt.restore();
      PermissionManager.overlay = null;
    });

    test('permission-prompt', function() {
      assert.equal(PermissionManager.overlay.dataset.type, 'test');
      assert.isTrue(stubPrompt.called);
    });
  });

  suite('cancel-permission-prompt Handler', function() {
    var stubDiscard;

    setup(function() {
      stubDiscard = this.sinon.stub(PermissionManager,
        'discardPermissionRequest');

      sendChromeEvent('cancel-permission-prompt', '');
    });

    teardown(function() {
      stubDiscard.restore();
    });

    test('cancel-permission-prompt', function() {
      assert.isTrue(stubDiscard.called);
    });
  });

  suite('fullscreenoriginchange Handler', function() {
    var stubChange;

    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      stubChange = this.sinon.stub(PermissionManager,
        'handleFullscreenOriginChange');

      sendChromeEvent('fullscreenoriginchange', '');
    });

    teardown(function() {
      stubChange.restore();
      PermissionManager.overlay = null;
    });

    test('fullscreenoriginchange', function() {
      assert.isTrue(stubChange.called);
    });
  });

  suite('discardPermissionRequest', function() {
    var stubResponse;
    var stunPrompt;

    setup(function() {
      stubResponse = this.sinon.stub(PermissionManager,
        'dispatchResponse');
      stunPrompt = this.sinon.stub(PermissionManager,
        'hidePermissionPrompt');
    });

    teardown(function() {
      stubResponse.restore();
      stunPrompt.restore();
    });

    test('no currentRequestId', function() {
      PermissionManager.discardPermissionRequest();
      assert.isFalse(stubResponse.called);
      assert.isFalse(stunPrompt.called);
    });

    test('has currentRequestId', function() {
      PermissionManager.currentRequestId = 123;
      PermissionManager.discardPermissionRequest();
      assert.isTrue(stubResponse.called);
      assert.isTrue(stunPrompt.called);
    });
  });

  suite('handlePermissionPrompt', function() {
    var detail = {'type': 'permission-prompt', 'permission': 'geolocation'};
    var stubReq;
    setup(function() {
      PermissionManager.remember = document.createElement('div');
      stubReq = this.sinon.stub(PermissionManager, 'requestPermission');
    });

    teardown(function() {
      stubReq.restore();
      PermissionManager.remember = null;
    });

    test('permission-prompt', function() {
      PermissionManager.handlePermissionPrompt(detail);

      assert.equal(PermissionManager.remember.checked, false);
      assert.isTrue(stubReq.called);
    });
  });

  suite('bug 907075 dismiss same permissions request from same origin',
   function() {
    var spyPrompt;
    var spyReq;
    var spyNext;
    var stubResponse;

    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      spyPrompt = this.sinon.spy(PermissionManager, 'handlePermissionPrompt');

      PermissionManager.remember = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      PermissionManager.yes = document.createElement('div');
      PermissionManager.no = document.createElement('div');
      PermissionManager.moreInfoLink = document.createElement('div');
      PermissionManager.moreInfo = document.createElement('div');
      PermissionManager.message = document.createElement('div');
      PermissionManager.moreInfoBox = document.createElement('div');

      spyNext = this.sinon.spy(PermissionManager, 'showNextPendingRequest');

      stubResponse = this.sinon.stub(PermissionManager,
        'dispatchResponse');
      sendChromeEvent('permission-prompt', 'audio-capture');
      sendChromeEvent('permission-prompt', 'audio-capture');
    });

    teardown(function() {
      stubResponse.restore();
      spyNext.restore();
      spyReq.restore();
      spyPrompt.restore();
      PermissionManager.overlay = null;
      PermissionManager.pending = [];
    });

    test('prompt called twice', function() {
      assert.equal(PermissionManager.currentOrigin, 'test');
      assert.equal(PermissionManager.currentPermission, 'audio-capture');

      assert.isTrue(spyPrompt.calledTwice);
      assert.isTrue(spyReq.called);
      assert.equal(PermissionManager.pending.length, 2);
    });

    test('handle pending', function() {
      PermissionManager.remember.checked = true;
      PermissionManager.clickHandler({target: PermissionManager.yes});
      assert.equal(PermissionManager.pending.length, 1);
    });

    test('dismiss same permissions request from same origin', function() {
      PermissionManager.remember.checked = true;
      PermissionManager.clickHandler({target: PermissionManager.yes});
      assert.isTrue(spyNext.called);
      assert.isTrue(stubResponse.called);
    });
  });
});
