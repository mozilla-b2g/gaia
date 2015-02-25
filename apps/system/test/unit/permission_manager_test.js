/* global PermissionManager, MocksHelper, MockL10n, MockApplications, Service */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/template.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');

// to emulate permission events
function sendChromeEvent(evt_type, evt_permission, remember) {
  var permissions = {};
  permissions[evt_permission] = [''];
  var detail = {'type': evt_type, 'permissions': permissions,
                'origin': 'test', 'isApp': false, 'remember': remember,
                'id': 'perm1' };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });
  window.dispatchEvent(evt);
}

// to emulate getUserMedia events
function sendMediaEvent(evt_type, evt_permissions, app, isGranted) {
  var detail = {'type': evt_type,
                'permissions': evt_permissions,
                'origin': 'test', 'isApp': app,
                'remember': true,
                'isGranted': isGranted,
                'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
                'id': 'perm1'
               };
  var evt = new CustomEvent('mozChromeEvent', { detail: detail });
  window.dispatchEvent(evt);
}


var mocksForLazyLoader = new MocksHelper([
    'LazyLoader',
    'Applications',
    'ManifestHelper',
    'Service'
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

  test('dispatch event when hidden', function() {
    var dispatched = false;
    window.addEventListener('permissiondialoghide', function onhide() {
      window.removeEventListener('permissiondialoghide', onhide);
      dispatched = true;
    });
    permissionManager.hidePermissionPrompt();
    assert.isTrue(dispatched);
  });

  suite('default value', function() {
    test('default values', function() {
      assert.equal(permissionManager.fullscreenRequest, undefined);
      assert.equal(permissionManager.pending, '');
      assert.equal(permissionManager.currentRequestId, undefined);
      assert.equal(permissionManager.currentOrigin, undefined);
      assert.equal(permissionManager.permissionType, undefined);
    });
  });

  suite('permission-prompt Handler', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'handlePermissionPrompt');
      sendChromeEvent('permission-prompt', 'test');
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.overlay.dataset.type, 'test');
      assert.isTrue(permissionManager.handlePermissionPrompt.called);
    });
  });

  suite('cancel-permission-prompt Handler', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
      sendChromeEvent('cancel-permission-prompt', '');
    });

    test('cancel-permission-prompt', function() {
      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });
  });

  suite('attentionopening Handler', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
    });

    test('discardPermissionRequest is called', function() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('attentionopening', true, true, {origin: ''});
      permissionManager.currentOrigin = 'app://fakecall.com';
      window.dispatchEvent(evt);
      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });

    test('discardPermissionRequest should not be called' +
      ' if it comes from the same origin', function() {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('attentionopening', true, true,
          {origin: 'app://fakecall.com'});
        permissionManager.currentOrigin = 'app://fakecall.com';
        window.dispatchEvent(evt);
        assert.isFalse(permissionManager.discardPermissionRequest.called);
      });
  });

  suite('attentionopened Handler', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
    });

    test('discardPermissionRequest is called', function() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('attentionopened', true, true, {origin: ''});
      permissionManager.currentOrigin = 'app://fakecall.com';
      window.dispatchEvent(evt);
      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });

    test('discardPermissionRequest should not be called' +
      ' if it comes from the same origin', function() {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('attentionopened', true, true,
          {origin: 'app://fakecall.com'});
        permissionManager.currentOrigin = 'app://fakecall.com';
        window.dispatchEvent(evt);
        assert.isFalse(permissionManager.discardPermissionRequest.called);
      });
  });

  suite('fullscreenoriginchange Handler', function() {
    setup(function() {
      Service.currentApp = {
        origin: ''
      };
      permissionManager.fullscreenRequest = undefined;
      this.sinon.stub(permissionManager, 'cleanDialog');
      this.sinon.stub(permissionManager, 'cancelRequest');
      this.sinon.stub(permissionManager, 'requestPermission');
    });

    test('fullscreenoriginchange', function() {
      this.sinon.stub(permissionManager, 'handleFullscreenOriginChange');
      sendChromeEvent('fullscreenoriginchange', '');
      assert.isTrue(permissionManager.cleanDialog.called);
      assert.isTrue(permissionManager.handleFullscreenOriginChange.called);
    });

    test('requestPermission sould be called with constant id', function() {
      sendChromeEvent('fullscreenoriginchange', '');
      assert.isTrue(permissionManager.requestPermission
        .calledWith('fullscreen'));
    });

    test('previous dialog should be cancelled', function() {
      sendChromeEvent('fullscreenoriginchange', '');
      assert.isFalse(permissionManager.cancelRequest.called);

      permissionManager.fullscreenRequest = 'fullscreen';
      sendChromeEvent('fullscreenoriginchange', '');
      assert.isTrue(permissionManager.cancelRequest.calledWith('fullscreen'));
    });
  });

  suite('lockscreen-appopened Handler', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
    });

    test('discardPermissionRequest is called', function() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('lockscreen-appopened', true, true, {});
      permissionManager.currentRequestId = 'fullscreen';
      window.dispatchEvent(evt);
      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });

    test('discardPermissionRequest should not be called ' +
        'if currentRequestId is not \'fullscreen\'', function() {

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('lockscreen-appopened', true, true, {});
      permissionManager.currentRequestId = 123;
      window.dispatchEvent(evt);
      assert.isFalse(permissionManager.discardPermissionRequest.called);
    });
  });

  suite('discardPermissionRequest', function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'dispatchResponse');
      this.sinon.stub(permissionManager, 'hidePermissionPrompt');
    });

    test('no currentRequestId', function() {
      permissionManager.discardPermissionRequest();
      assert.isFalse(permissionManager.dispatchResponse.called);
      assert.isFalse(permissionManager.hidePermissionPrompt.called);
    });

    test('has currentRequestId', function() {
      permissionManager.currentRequestId = 123;
      permissionManager.discardPermissionRequest();
      assert.isTrue(permissionManager.dispatchResponse.called);
      assert.isTrue(permissionManager.hidePermissionPrompt.called);
    });

    test('currentRequestId is \'fullscreen\'', function() {
      permissionManager.currentRequestId = 'fullscreen';
      permissionManager.fullscreenRequest = 'fullscreen';
      permissionManager.no.callback = this.sinon.stub();
      permissionManager.discardPermissionRequest();
      assert.isTrue(permissionManager.no.callback.called);
      assert.isUndefined(permissionManager.fullscreenRequest);
    });
  });

  suite('handlePermissionPrompt', function() {
    var detail;
    setup(function() {
      detail = {'type': 'permission-prompt', 'permission': 'geolocation'};
      this.sinon.stub(permissionManager, 'requestPermission');
    });

    teardown(function() {
      detail = null;
    });

    test('permission-prompt', function() {
      sendChromeEvent('permission-prompt', 'test');
      permissionManager.handlePermissionPrompt(detail);

      assert.equal(permissionManager.remember.checked, false);
      assert.isTrue(permissionManager.requestPermission.called);
    });

    test('permission-prompt remember', function() {
      sendChromeEvent('permission-prompt', 'test', true);
      detail.remember = true;
      permissionManager.handlePermissionPrompt(detail);

      assert.equal(permissionManager.remember.checked, true);
      assert.isTrue(permissionManager.requestPermission.called);
    });
  });

  suite('dispatchResponse', function() {
    setup(function() {
      this.sinon.stub(window, 'dispatchEvent');
    });

    test('permission-allow', function() {
      permissionManager.dispatchResponse(123, 'permission-allow', true);
      assert.equal(permissionManager.responseStatus, 'permission-allow');
      assert.isTrue(window.dispatchEvent.called);
    });

    test('permission-deny', function() {
      permissionManager.dispatchResponse(123, 'permission-deny', true);
      assert.equal(permissionManager.responseStatus, 'permission-deny');
      assert.isTrue(window.dispatchEvent.called);
    });
  });

  suite('bug 907075 dismiss same permissions request from same origin',
   function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      this.sinon.spy(permissionManager, 'requestPermission');
      this.sinon.spy(permissionManager, 'showNextPendingRequest');
      this.sinon.spy(permissionManager, 'dispatchResponse');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('prompt called twice', function() {
      assert.equal(permissionManager.currentOrigin, 'test');
      assert.equal(permissionManager.permissionType, 'audio-capture');

      assert.isTrue(permissionManager.handlePermissionPrompt.calledTwice);
      assert.isTrue(permissionManager.requestPermission.called);
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
      assert.isTrue(permissionManager.showNextPendingRequest.called);
      assert.isTrue(permissionManager.dispatchResponse.called);
    });
  });

  // bug 935557 compatibility with old permission
  suite('compatibility with old detail.permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'geolocation',
                'origin': 'test', 'isApp': false, id: 'perm1' };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'geolocation');
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'geolocation',
        sinon.match.string, 'perm-geolocation-more-info'));
    });
  });

  // bug 952244 compatibility with old audio permission
  suite('compatibility with old audio detail.permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'requestPermission');

      var detail = {'type': 'permission-prompt',
                'permission': 'audio-capture',
                'origin': 'test', 'isApp': false, id: 'perm1' };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });
  });

  // test getUserMedia related permissions
  suite('audio capture permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'audio-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'],
        undefined);
      assert.equal(permissionManager.currentChoices['audio-capture'],
        '');
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });
  });

  suite('video capture permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']});
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'],
        'back');
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });
  });

  suite('camera selector dialog', function() {
    // the general is identical to normal video-capture,
    // only UI changed
    var realApplications;

    setup(function() {
      realApplications = window.applications;
      window.applications = MockApplications;

      this.sinon.spy(permissionManager, 'requestPermission');
      this.sinon.spy(permissionManager, 'showPermissionPrompt');
      this.sinon.stub(window.applications, 'getByManifestURL').returns(
        {'manifest':{'name':'test'}}
      );

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']}, true, true);
    });

    teardown(function() {
      window.applications = realApplications;
      realApplications = null;
    });

    test('is camera selector', function() {
      assert.equal(permissionManager.isCamSelector, true);
    });

    test('permission selector is shown', function() {
      var yescallback = this.sinon.stub();
      var nocallback = this.sinon.stub();
      permissionManager.showPermissionPrompt(1, '', '',
        yescallback, nocallback);

      assert.equal(permissionManager.buttons.dataset.items, 1);
      assert.equal(permissionManager.rememberSection.style.display, 'none');
      assert.equal(permissionManager.no.style.display, 'none');
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'],
        'back');
    });

    test('remember my choice option is checked in app mode', function() {
      assert.equal(permissionManager.remember.checked, true);
    });
  });

  suite('media capture permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {
          'video-capture': ['front', 'back'],
          'audio-capture': ['']
        });
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'media-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(permissionManager.requestPermission
        .calledWithMatch('perm1', 'test', 'media-capture',
        sinon.match.string, 'perm-media-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(permissionManager.currentChoices['video-capture'], 'front');
      assert.equal(permissionManager.currentChoices['audio-capture'], '');
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });

    test('remember my choice option is unchecked in web mode', function() {
      assert.equal(permissionManager.remember.checked, false);
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

  suite('bug 1013509 Permission Prompt Never Hides',
   function() {
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('should discard permission request when requester killed', function() {
      assert.equal(permissionManager.currentOrigin, 'test');
      assert.equal(permissionManager.permissionType, 'audio-capture');
      var event = new CustomEvent('appterminated',
                                  { 'detail': { 'origin': 'test'} });
      window.dispatchEvent(event);

      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });
  });

  suite('when screenoff it should hide the prompt', function() {
    var evt;
    setup(function() {
      this.sinon.stub(permissionManager, 'discardPermissionRequest');
      window.Service = {
        locked: true
      };
      evt = {
        type: 'screenchange',
        detail: {
          screenEnabled: false
        }
      };
    });

    test('screenoff', function() {
      permissionManager.handleEvent(evt);
      assert.isTrue(permissionManager.discardPermissionRequest.called);
    });

    teardown(function() {
      delete window.Service;
    });
  });

  suite('Toggle more/hide info in permission dialog',
    function() {
      setup(function() {
        this.sinon.spy(permissionManager, 'toggleInfo');
        this.sinon.spy(permissionManager, 'hidePermissionPrompt');
      });

      test('should toggle info when more info is clicked', function() {
        permissionManager.clickHandler({
          target: permissionManager.moreInfoLink
        });
        assert.isTrue(permissionManager.toggleInfo.called);
        assert.isFalse(permissionManager.hidePermissionPrompt.called);
        assert.isFalse(
          permissionManager.moreInfoBox.classList.contains('hidden'));
      });

      test('should toggle info when hide info is clicked', function() {
        permissionManager.clickHandler({
          target: permissionManager.hideInfoLink
        });
        assert.isTrue(permissionManager.toggleInfo.called);
        assert.isFalse(permissionManager.hidePermissionPrompt.called);
        assert.isTrue(
          permissionManager.moreInfoBox.classList.contains('hidden'));
      });

      test('should not handle click event when dialog is hidden',
        function(done) {
          this.sinon.spy(permissionManager, 'clickHandler');
          window.addEventListener('permissiondialoghide', function onhide() {
            window.removeEventListener('permissiondialoghide', onhide);
            permissionManager.moreInfoLink.click();
            assert.isFalse(permissionManager.clickHandler.called);
            permissionManager.hideInfoLink.click();
            assert.isFalse(permissionManager.clickHandler.called);
            done();
          });
          permissionManager.hidePermissionPrompt();
      });
  });

});
