/* global PermissionManager, MocksHelper, MockL10n*/
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/template.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_l10n.js');

// to emulate permission events
function sendChromeEvent(evt_type, evt_permission) {
  var permissions = {};
  permissions[evt_permission] = [''];
  var detail = {'type': evt_type, 'permissions': permissions,
                'origin': 'test', 'isApp': false };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });
  window.dispatchEvent(evt);
}

// to emulate getUserMedia events
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
  var permissionManager;
  var realL10n;

  mocksForLazyLoader.attachTestHelpers();

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    requireApp('system/js/permission_manager.js', function() {
      permissionManager = new PermissionManager();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    permissionManager.start();
  });

  teardown(function() {
    permissionManager.stop();
  });

  suite('default value', function() {
    test('default values', function() {
      assert.equal(permissionManager.fullscreenRequest, undefined);
      assert.equal(permissionManager.pending, '');
      assert.equal(permissionManager.nextRequestID, 0);
      assert.equal(permissionManager.currentRequestId, undefined);
      assert.equal(permissionManager.currentOrigin, undefined);
      assert.equal(permissionManager.permissionType, undefined);
    });
  });

  suite('permission-prompt Handler', function() {
    var stubPrompt;

    setup(function() {
      stubPrompt = this.sinon.stub(permissionManager, 'handlePermissionPrompt');
      sendChromeEvent('permission-prompt', 'test');
    });

    teardown(function() {
      stubPrompt.restore();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.overlay.dataset.type, 'test');
      assert.isTrue(stubPrompt.called);
    });
  });

  suite('cancel-permission-prompt Handler', function() {
    var stubDiscard;

    setup(function() {
      stubDiscard = this.sinon.stub(permissionManager,
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
      stubChange = this.sinon.stub(permissionManager,
        'handleFullscreenOriginChange');
      sendChromeEvent('fullscreenoriginchange', '');
    });

    teardown(function() {
      stubChange.restore();
    });

    test('fullscreenoriginchange', function() {
      assert.isTrue(stubChange.called);
    });
  });

  suite('discardPermissionRequest', function() {
    var stubResponse;
    var stunPrompt;

    setup(function() {
      stubResponse = this.sinon.stub(permissionManager,
        'dispatchResponse');
      stunPrompt = this.sinon.stub(permissionManager,
        'hidePermissionPrompt');
    });

    teardown(function() {
      stubResponse.restore();
      stunPrompt.restore();
    });

    test('no currentRequestId', function() {
      permissionManager.discardPermissionRequest();
      assert.isFalse(stubResponse.called);
      assert.isFalse(stunPrompt.called);
    });

    test('has currentRequestId', function() {
      permissionManager.currentRequestId = 123;
      permissionManager.discardPermissionRequest();
      assert.isTrue(stubResponse.called);
      assert.isTrue(stunPrompt.called);
    });
  });

  suite('handlePermissionPrompt', function() {
    var detail = {'type': 'permission-prompt', 'permission': 'geolocation'};
    var stubReq;
    setup(function() {
      stubReq = this.sinon.stub(permissionManager, 'requestPermission');
      sendChromeEvent('permission-prompt', 'test');
    });

    teardown(function() {
      stubReq.restore();
    });

    test('permission-prompt', function() {
      permissionManager.handlePermissionPrompt(detail);

      assert.equal(permissionManager.remember.checked, false);
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
      permissionManager.dispatchResponse(123, 'permission-allow', true);
      assert.equal(permissionManager.responseStatus, 'permission-allow');
      assert.isTrue(stubDispatchEvent.called);
    });

    test('permission-deny', function() {
      permissionManager.dispatchResponse(123, 'permission-deny', true);
      assert.equal(permissionManager.responseStatus, 'permission-deny');
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
      spyPrompt = this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');
      spyNext = this.sinon.spy(permissionManager, 'showNextPendingRequest');
      spyResponse = this.sinon.spy(permissionManager,
        'dispatchResponse');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    teardown(function() {
      spyResponse.restore();
      spyNext.restore();
      spyReq.restore();
      spyPrompt.restore();
    });

    test('prompt called twice', function() {
      assert.equal(permissionManager.currentOrigin, 'test');
      assert.equal(permissionManager.permissionType, 'audio-capture');

      assert.isTrue(spyPrompt.calledTwice);
      assert.isTrue(spyReq.called);
      assert.equal(permissionManager.pending.length, 2);
    });

    test('handle pending', function() {
      permissionManager.remember.checked = true;
      permissionManager.clickHandler({target: permissionManager.yes});
      assert.equal(permissionManager.pending.length, 1);
    });

    test('dismiss same permissions request from same origin', function() {
      permissionManager.remember.checked = true;
      permissionManager.clickHandler({target: permissionManager.yes});
      assert.isTrue(spyNext.called);
      assert.isTrue(spyResponse.called);
    });
  });

  // bug 935557 compatibility with old permission
  suite('compatibility with old detail.permission', function() {
    var spyReq;
    setup(function() {
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'geolocation',
                'origin': 'test', 'isApp': false };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    teardown(function() {
      spyReq.restore();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'geolocation');
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
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'audio-capture',
                'origin': 'test', 'isApp': false };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    teardown(function() {
      spyReq.restore();
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });
  });

  // test getUserMedia related permissions
  suite('audio capture permission', function() {
    var spyReq;
    setup(function() {
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    teardown(function() {
      spyReq.restore();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'audio-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'],
        undefined);
      assert.equal(permissionManager.currentChoices['audio-capture'],
        '');
    });

  });

  suite('video capture permission', function() {
    var spyReq;
    setup(function() {
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']});
    });

    teardown(function() {
      spyReq.restore();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'],
        'back');
    });
  });

  suite('media capture permission', function() {
    var spyReq;
    setup(function() {
      spyReq = this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {
          'video-capture': ['front', 'back'],
          'audio-capture': ['']
        });
    });

    teardown(function() {
      spyReq.restore();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'media-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(spyReq.calledWithMatch('test', 'media-capture',
        sinon.match.string, 'perm-media-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'], 'front');
      assert.equal(permissionManager.currentChoices['audio-capture'], '');
    });
  });

  suite('bug 981550 Apps can cause permissions prompts in other apps',
   function() {
    setup(function() {
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      permissionManager.currentRequestId = 123;
      sendMediaEvent('permission-prompt', {'video-capture': ['']});
      permissionManager.discardPermissionRequest();
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'video-capture': ['']});
    });

    test('should have 1 pending', function() {
      assert.equal(permissionManager.pending.length, 1);
    });
  });

  suite('Toggle more/hide info in permission dialog',
    function() {
      var spyToggleInfo;
      var spyHidePermissionPrompt;

      setup(function() {
        spyToggleInfo = this.sinon.spy(permissionManager, 'toggleInfo');
        spyHidePermissionPrompt = this.sinon.spy(permissionManager,
                                  'hidePermissionPrompt');
      });

      teardown(function() {
        spyToggleInfo.restore();
        spyHidePermissionPrompt.restore();
      });

      test('should toggle info when more info is clicked', function() {
        permissionManager.clickHandler({
          target: permissionManager.moreInfoLink
        });
        assert.isTrue(spyToggleInfo.called);
        assert.isFalse(spyHidePermissionPrompt.called);
        assert.isFalse(
          permissionManager.moreInfoBox.classList.contains('hidden'));
      });

      test('should toggle info when hide info is clicked', function() {
        permissionManager.clickHandler({
          target: permissionManager.hideInfoLink
        });
        assert.isTrue(spyToggleInfo.called);
        assert.isFalse(spyHidePermissionPrompt.called);
        assert.isTrue(
          permissionManager.moreInfoBox.classList.contains('hidden'));
      });
  });

});
