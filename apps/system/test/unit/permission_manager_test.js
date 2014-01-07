'use strict';

mocha.globals(['PermissionManager', 'dispatchEvent']);

require('/shared/js/template.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/permission_manager.js');

function sendChromeEvent(evt_type, evt_permission) {
  var permissions = {};
  permissions[evt_permission] = [''];
  var detail = {'type': evt_type, 'permissions': permissions,
                'origin': 'test', 'isApp': false };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });
  window.dispatchEvent(evt);
}

function sendMediaEvent(evt_type, evt_permissions) {
  var detail = {'type': evt_type,
                'permissions': evt_permissions,
                'origin': 'test', 'isApp': false
               };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });
  window.dispatchEvent(evt);
}


var mocksForLazyLoader = new MocksHelper([
    'LazyLoader'
  ]).init();

suite('system/permission manager', function() {
  var realL10n;

  mocksForLazyLoader.attachTestHelpers();

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
      PermissionManager.rememberSection = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      PermissionManager.moreInfoBox = document.createElement('div');
      stubPrompt = this.sinon.stub(PermissionManager, 'handlePermissionPrompt');

      sendChromeEvent('permission-prompt', 'test');
    });

    teardown(function() {
      stubPrompt.restore();
      PermissionManager.overlay = null;
      PermissionManager.rememberSection = null;
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

  suite('dispatchResponse', function() {
    var stubDispatchEvent;
    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    });

    teardown(function() {
      stubDispatchEvent.restore();
    });

    test('permission-allow', function() {
      PermissionManager.dispatchResponse(123, 'permission-allow', true);
      assert.equal(PermissionManager.responseStatus, 'permission-allow');
      assert.isTrue(stubDispatchEvent.called);
    });

    test('permission-deny', function() {
      PermissionManager.dispatchResponse(123, 'permission-deny', true);
      assert.equal(PermissionManager.responseStatus, 'permission-deny');
      assert.isTrue(stubDispatchEvent.called);
    });
  });

  suite('bug 907075 dismiss same permissions request from same origin',
   function() {
    var spyPrompt;
    var spyReq;
    var spyNext;
    var spyResponse;

    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      spyPrompt = this.sinon.spy(PermissionManager, 'handlePermissionPrompt');

      PermissionManager.remember = document.createElement('div');
      PermissionManager.rememberSection = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');
      PermissionManager.devices = document.createElement('div');

      PermissionManager.yes = document.createElement('div');
      PermissionManager.no = document.createElement('div');
      PermissionManager.moreInfoLink = document.createElement('div');
      PermissionManager.moreInfo = document.createElement('div');
      PermissionManager.message = document.createElement('div');
      PermissionManager.moreInfoBox = document.createElement('div');

      spyNext = this.sinon.spy(PermissionManager, 'showNextPendingRequest');

      spyResponse = this.sinon.spy(PermissionManager,
        'dispatchResponse');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    teardown(function() {
      spyResponse.restore();
      spyNext.restore();
      spyReq.restore();
      spyPrompt.restore();
      PermissionManager.overlay = null;
      PermissionManager.pending = [];
      PermissionManager.devices = null;
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
      assert.isTrue(spyResponse.called);
    });
  });

  // bug 935557 compatibility with old permission
  suite('compatibility with old detail.permission', function() {
    var spyReq;
    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'geolocation',
                'origin': 'test', 'isApp': false };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    teardown(function() {
      spyReq.restore();
      PermissionManager.overlay = null;
      PermissionManager.devices = null;
    });

    test('permission-prompt', function() {
      assert.equal(PermissionManager.currentPermission, 'geolocation');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'geolocation',
        sinon.match.string, 'perm-geolocation-more-info'));
    });
  });

// bug 952244 compatibility with old audio permission
  suite('compatibility with old audio detail.permission', function() {
    var spyReq;
    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      PermissionManager.remember = document.createElement('div');
      PermissionManager.rememberSection = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'audio-capture',
                'origin': 'test', 'isApp': false };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    teardown(function() {
      spyReq.restore();
      PermissionManager.overlay = null;
      PermissionManager.devices = null;
      PermissionManager.remember = null;
      PermissionManager.rememberSection = null;
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(PermissionManager.rememberSection.style.display, 'none');
    });
  });

  // test getUserMedia related permissions
  suite('audio capture permission', function() {
    var spyReq;
    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      PermissionManager.remember = document.createElement('div');
      PermissionManager.rememberSection = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    teardown(function() {
      spyReq.restore();
      PermissionManager.remember = null;
      PermissionManager.rememberSection = null;
    });

    test('permission-prompt', function() {
      assert.equal(PermissionManager.currentPermission, 'audio-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(PermissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(PermissionManager.currentChoices['video-capture'],
        undefined);
      assert.equal(PermissionManager.currentChoices['audio-capture'],
        '');
    });

  });

  suite('video capture permission', function() {
    var spyReq;
    setup(function() {
      PermissionManager.remember = document.createElement('div');
      PermissionManager.rememberSection = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']});
    });

    teardown(function() {
      spyReq.restore();
      PermissionManager.remember = null;
      PermissionManager.rememberSection = null;
      PermissionManager.devices = null;
    });

    test('permission-prompt', function() {
      assert.equal(PermissionManager.currentPermission, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(PermissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(PermissionManager.currentChoices['video-capture'],
        'back');
    });
  });

  suite('media capture permission', function() {
    var spyReq;
    setup(function() {
      PermissionManager.overlay = document.createElement('div');
      PermissionManager.remember = document.createElement('div');
      PermissionManager.rememberSection = document.createElement('div');
      PermissionManager.devices = document.createElement('div');
      spyReq = this.sinon.spy(PermissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {
          'video-capture': ['front', 'back'],
          'audio-capture': ['']
        });
    });

    teardown(function() {
      spyReq.restore();
      PermissionManager.remember = null;
      PermissionManager.rememberSection = null;
      PermissionManager.devices = null;
    });

    test('permission-prompt', function() {
      assert.equal(PermissionManager.currentPermission, 'media-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'media-capture',
        sinon.match.string, 'perm-media-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(PermissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(PermissionManager.currentChoices['video-capture'], 'front');
      assert.equal(PermissionManager.currentChoices['audio-capture'], '');
    });
  });
});
