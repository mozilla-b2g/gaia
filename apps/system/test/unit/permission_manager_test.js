/* global PermissionManager, Applications, MocksHelper, MockL10n,
          MockApplications, Service */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/tagged.js');
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

function createMediaEvent(evt_type, evt_permissions, isApp, isGranted) {
  return {
    'type': evt_type,
    'permissions': evt_permissions,
    'origin': 'test',
    'isApp': isApp || false,
    'remember': true,
    'isGranted': isGranted || false,
    'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
    'id': 'perm1'
  };
}

// to emulate getUserMedia events
function sendMediaEvent(evt_type, evt_permissions, app, isGranted) {
  var detail = createMediaEvent(evt_type, evt_permissions, app, isGranted);
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

    window.applications = Applications;
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
      assert.equal(permissionManager.isFullscreenRequest, false);
      assert.equal(permissionManager.pending, '');
      assert.equal(permissionManager.currentRequestId, undefined);
      assert.equal(permissionManager.currentOrigin, undefined);
      assert.equal(permissionManager.permissionType, undefined);
    });
  });

  suite('permission-prompt Handler', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      sendChromeEvent('permission-prompt', 'test');
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.overlay.dataset.type, 'test');
      assert.isTrue(permissionManager.handlePermissionPrompt.called);
    });
  });

  suite('permission-prompt queue (when requesting more than one)', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      this.sinon.spy(permissionManager, 'queuePrompt');

      sendChromeEvent('permission-prompt', 'test');
      sendChromeEvent('permission-prompt', 'test');
      sendChromeEvent('permission-prompt', 'test');
    });

    test('permission-prompt queue must be 2 elements length', function() {
      assert.equal(permissionManager.overlay.dataset.type, 'test');
      assert.isTrue(permissionManager.handlePermissionPrompt.calledOnce);
      assert.isTrue(permissionManager.queuePrompt.calledTwice);
      assert.equal(permissionManager.pending.length, 2);

    });

    test('dispatchEvent must be called 3 times', function(done) {
      var i = 0;
      this.sinon.stub(permissionManager, 'dispatchResponse', function() {
        if (++i === 3) {
          assert.equal(permissionManager.dispatchResponse.callCount, 3);
          done();
        }
      });
      // Click on the first 'allow' prompt
      permissionManager.clickHandler({target: permissionManager.yes});
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
    function sendFullscreenRequest() {
      var detail = {
        type: 'fullscreenoriginchange',
        fullscreenorigin: 'http://www.foo.com'
      };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    }

    setup(function() {
      Service.currentApp = {
        origin: ''
      };

      this.sinon.spy(permissionManager, 'cleanDialog');
      this.sinon.spy(permissionManager, 'handleFullscreenOriginChange');
      this.sinon.spy(permissionManager, 'cancelRequest');
      this.sinon.spy(permissionManager, 'showPermissionPrompt');
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      this.sinon.spy(navigator.mozL10n, 'get');
    });

    teardown(function() {
      permissionManager.cancelRequest('fullscreen');
      permissionManager.isFullscreenRequest = false;
    });

    test('fullscreenoriginchange handlers are called', function() {
      sendFullscreenRequest();
      // We clean the dialog and we must call the right handler
      assert.isTrue(permissionManager.cleanDialog.calledOnce);
      assert.isTrue(permissionManager.handleFullscreenOriginChange.calledOnce);
      assert.isTrue(permissionManager.showPermissionPrompt.calledOnce);
    });

    test('showPermissionPrompt should be called with id "fullscreen"',
      function() {
      sendFullscreenRequest();
      assert.equal(
        permissionManager.showPermissionPrompt.args[0][0].id,
        'fullscreen'
      );
    });

    test('showPermissionPrompt must use the right strings', function() {
      sendFullscreenRequest();
      var l10nAttrs =
        navigator.mozL10n.getAttributes(permissionManager.message);
      assert.equal(l10nAttrs.id, 'fullscreen-request');

      var detail = permissionManager.showPermissionPrompt.args[0][0];
      assert.deepEqual(l10nAttrs.args, {
        origin: detail.fullscreenorigin
      });
      // No "more info" string should be translated
      var strings = permissionManager.getStrings(detail);

      // "More info" should be empty
      assert.isTrue(!strings.moreInfoText);
    });

    test('previous dialog should be cancelled', function() {
      // Send a first dialog
      sendFullscreenRequest();
      assert.isFalse(permissionManager.cancelRequest.called);
      // A new dialog must cancel the previous one
      sendFullscreenRequest();
      assert.isTrue(permissionManager.cancelRequest.calledOnce);
      assert.isTrue(permissionManager.cancelRequest.calledWith('fullscreen'));
      assert.isTrue(permissionManager.isFullscreenRequest);
    });

    test('other permission (e.g. geolocation) after fullscreen',
      function(done) {
      // Send a first dialog based on fullscreen (for example youtube video)
      sendFullscreenRequest();
      assert.isFalse(permissionManager.cancelRequest.called);
      permissionManager.yes.callback = function() {
        // If after the fullscreen scenario we have a new prompt, this must
        // be rendered properly
        var geolocationDetail =
          {
            'type': 'permission-prompt',
            'permission': 'geolocation'
          };
        var evt =
          new CustomEvent('mozChromeEvent', { detail: geolocationDetail });
        window.dispatchEvent(evt);
        assert.isTrue(permissionManager.handlePermissionPrompt.called);
        assert.isFalse(permissionManager.isFullscreenRequest);
        done();
      };
      permissionManager.clickHandler({target: permissionManager.yes});

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
      permissionManager.isFullscreenRequest = true;
      permissionManager.no.callback = this.sinon.stub();
      permissionManager.discardPermissionRequest();
      assert.isTrue(permissionManager.no.callback.called);
      assert.isFalse(permissionManager.isFullscreenRequest);
    });
  });

  suite('handlePermissionPrompt', function() {
    var detail;
    setup(function() {
      detail = {'type': 'permission-prompt', 'permission': 'geolocation'};
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
    });

    teardown(function() {
      permissionManager.discardPermissionRequest();
      detail = null;
    });

    test('permission-prompt', function() {
      sendChromeEvent('permission-prompt', 'test');

      assert.equal(permissionManager.remember.checked, false);
      assert.isTrue(permissionManager.handlePermissionPrompt.called);
    });

    test('permission-prompt remember', function() {
      sendChromeEvent(
        'permission-prompt',
        'test',
        true
      );
      assert.equal(permissionManager.remember.checked, true);
      assert.isTrue(permissionManager.handlePermissionPrompt.called);
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
      this.sinon.spy(permissionManager, 'queuePrompt');
      this.sinon.spy(permissionManager, 'showNextPendingRequest');
      this.sinon.spy(permissionManager, 'dispatchResponse');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('handle repeated prompt must be rendered once', function() {
      // We stablish 'remember me' in the first prompt, but we
      // have other 'pending' prompt waiting in the queue
      permissionManager.remember.checked = true;
      assert.equal(permissionManager.pending.length, 1);
      assert.isFalse(permissionManager.showNextPendingRequest.calledOnce);
      // We accept the permission prompt with 'remember me', so next
      // one must not be shown
      permissionManager.clickHandler({target: permissionManager.yes});
      assert.isTrue(permissionManager.showNextPendingRequest.calledTwice);

      // Based on than, handlePermissionPrompt must be called once
      assert.isTrue(permissionManager.handlePermissionPrompt.calledOnce);

      // Now the queue must be empty
      assert.equal(permissionManager.pending.length, 0);
    });
  });

  // bug 935557 compatibility with old permission
  suite('compatibility with old detail.permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'showPermissionPrompt');

      var detail = {'type': 'permission-prompt',
                'permission': 'geolocation',
                'origin': 'test', 'isApp': false, id: 'perm1' };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    test('permission id matched', function() {
      assert.equal(permissionManager.permissionType, 'geolocation');
    });
  });

  // bug 952244 compatibility with old audio permission
  suite('compatibility with old audio detail.permission', function() {
    setup(function() {
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');

      var detail = {'type': 'permission-prompt',
                'permission': 'audio-capture',
                'origin': 'test', 'isApp': false, id: 'perm1' };
      var evt = new CustomEvent('mozChromeEvent', { detail: detail });
      window.dispatchEvent(evt);
    });

    test('permission id matched', function() {
      assert.equal(permissionManager.permissionType, 'audio-capture');
    });

    test('not show remember my choice option', function() {
      assert.equal(permissionManager.rememberSection.style.display, 'none');
    });
  });

  // test getUserMedia related permissions
  suite('audio capture permission', function() {
    var detail;
    var appMock = {
      'isActivity': false,
      'url': 'app://uitest.gaiamobile.org/manifest.webapp',
      'name': 'UITest',
      'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
      'origin': 'app://uitest.gaiamobile.org/',
      'manifest': {
        'name': 'UITest',
        'role': 'UITest',
      },
      target: {}
    };

    setup(function() {
      MockApplications.mRegisterMockApp(appMock);
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    teardown(function() {
      MockApplications.mTeardown();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'audio-capture');
    });

    test('Web: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        false
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be Web related
      assert.equal(strings.message.id, 'perm-audio-capture-webRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        site: detail.origin
      });
    });

    test('App: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        true
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be APP related
      assert.equal(strings.message.id, 'perm-audio-capture-appRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        app: appMock.manifest.name
      });
    });

    test('Remember me is disabled by default', function() {
      assert.isFalse(permissionManager.remember.checked);
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
    var detail;
    var appMock = {
      'isActivity': false,
      'url': 'app://uitest.gaiamobile.org/manifest.webapp',
      'name': 'UITest',
      'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
      'origin': 'app://uitest.gaiamobile.org/',
      'manifest': {
        'name': 'UITest',
        'role': 'UITest',
      },
      target: {}
    };

    setup(function() {
      MockApplications.mRegisterMockApp(appMock);
      this.sinon.spy(permissionManager, 'handlePermissionPrompt');
      sendMediaEvent(
        'permission-prompt',
        {'video-capture': ['back', 'front']}
      );
    });

    teardown(function() {
      MockApplications.mTeardown();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'video-capture');
    });


    test('Web: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        false
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be Web related
      assert.equal(strings.message.id, 'perm-video-capture-webRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        site: detail.origin
      });
    });

    test('App: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        true
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be APP related
      assert.equal(strings.message.id, 'perm-video-capture-appRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        app: appMock.manifest.name
      });
    });

    test('Remember me is disabled by default', function() {
      assert.isFalse(permissionManager.remember.checked);
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
    var appMock = {
      'isActivity': false,
      'url': 'app://uitest.gaiamobile.org/manifest.webapp',
      'name': 'UITest',
      'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
      'origin': 'app://uitest.gaiamobile.org/',
      'manifest': {
        'name': 'UITest',
        'role': 'UITest',
      },
      target: {}
    };


    setup(function() {
      MockApplications.mRegisterMockApp(appMock);
      sendMediaEvent(
        'permission-prompt',
        {'video-capture': ['back', 'front']},
        true,
        true
      );
    });

    teardown(function() {
      MockApplications.mTeardown();
    });

    test('is camera selector', function() {
      assert.equal(permissionManager.isCamSelector, true);
    });

    test('permission selector is shown', function() {
      assert.equal(permissionManager.buttons.dataset.items, 1);
      assert.equal(permissionManager.rememberSection.style.display, 'none');
      assert.equal(permissionManager.no.style.display, 'none');
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'video-capture');
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
    var detail;
    var appMock = {
      'isActivity': false,
      'url': 'app://uitest.gaiamobile.org/manifest.webapp',
      'name': 'UITest',
      'manifestURL': 'app://uitest.gaiamobile.org/manifest.webapp',
      'origin': 'app://uitest.gaiamobile.org/',
      'manifest': {
        'name': 'UITest',
        'role': 'UITest',
      },
      target: {}
    };
    setup(function() {
      MockApplications.mRegisterMockApp(appMock);
      sendMediaEvent(
        'permission-prompt',
        {
          'video-capture': ['front', 'back'],
          'audio-capture': ['']
        }
      );
      this.sinon.spy(navigator.mozL10n, 'get');
    });

    teardown(function() {
      MockApplications.mTeardown();
    });

    test('permission-prompt', function() {
      assert.equal(permissionManager.permissionType, 'media-capture');
    });

    test('Web: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        false
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be Web related
      assert.equal(strings.message.id, 'perm-media-capture-webRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        site: detail.origin
      });
    });

    test('App: All strings are matching', function() {
      detail = createMediaEvent(
        'permission-prompt',
        {'audio-capture': ['']},
        true
      );
      var strings = permissionManager.getStrings(detail);
      // l10n must be APP related
      assert.equal(strings.message.id, 'perm-media-capture-appRequest');
      // In this case we will take the origin of the requester
      assert.deepEqual(strings.message.args, {
        app: appMock.manifest.name
      });
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

      test('should "More info..." be hidden when we accept/deny the prompt',
        function() {
          this.sinon.stub(permissionManager, 'getStrings').returns({
              message: 'message',
              moreInfoText: 'moreInfoText'
            }
          );

          // Launch
          sendMediaEvent('permission-prompt', {'audio-capture': ['']});
          assert.isFalse(
            permissionManager.moreInfo.classList.contains('hidden'));

          permissionManager.clickHandler({
            target: permissionManager.yes
          });
          assert.isTrue(
            permissionManager.moreInfo.classList.contains('hidden'));
      });
    });

    test('"More info..." must not be shown if there is not text',
      function() {
        this.sinon.stub(permissionManager, 'getStrings').returns({
            message: 'message',
            moreInfoText: null
          }
        );

        sendMediaEvent('permission-prompt', {'audio-capture': ['']});
        assert.isTrue(
          permissionManager.moreInfo.classList.contains('hidden'));
      }
    );

});
