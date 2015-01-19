/* global AppPermissionDialog, MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/app_permission_dialog.js');

suite('system/AppPermissionDialog', function() {
  var subject;
  var realL10n;
  var appWindow;

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
    appWindow.element.dispatchEvent(evt);
  }

  // to emulate permission events
  function sendChromeEvent(evt_type, evt_permission, remember) {
    var permissions = {};
    permissions[evt_permission] = [''];
    var detail = {'type': evt_type, 'permissions': permissions,
                  'origin': 'test', 'isApp': false, 'remember': remember,
                  'id': 'perm1' };
    var evt = new CustomEvent('mozChromeEvent', { detail: detail });
    appWindow.element.dispatchEvent(evt);
  }

  // to emulate permission events
  function sendFullScreenEvent() {
    var detail = {'type': 'fullscreenoriginchange',
                  'origin': 'test', 'isApp': false,
                  'id': 'perm1' };
    var evt = new CustomEvent('mozbrowserfullscreen-origin-change', { detail: detail });
    appWindow.element.dispatchEvent(evt);
  }

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    appWindow = new MockAppWindow();
    document.body.appendChild(appWindow.element);
    subject = new AppPermissionDialog(appWindow);
    subject.render();
  });

  suite('default value', function() {
    test('default values', function() {
      assert.equal(subject.fullscreenRequest, undefined);
      assert.equal(subject.pending.length, 0);
      assert.equal(subject.currentRequestId, undefined);
      assert.equal(subject.permissionType, undefined);
    });
  });

  suite('permission-prompt Handler', function() {
    setup(function() {
      this.sinon.stub(subject, 'handlePermissionPrompt');
      sendChromeEvent('permission-prompt', 'test');
    });

    test('permission-prompt', function() {
      //assert.equal(subject.overlay.dataset.type, 'test');
      assert.isTrue(subject.handlePermissionPrompt.called);
    });
  });

  suite('cancel-permission-prompt Handler', function() {
    setup(function() {
      this.sinon.stub(subject, 'discardPermissionRequest');
      sendChromeEvent('cancel-permission-prompt', '');
    });

    test('cancel-permission-prompt', function() {
      assert.isTrue(subject.discardPermissionRequest.called);
    });
  });

  suite('fullscreenoriginchange Handler', function() {
    setup(function() {
      subject.fullscreenRequest = undefined;
      this.sinon.stub(subject, 'cleanDialog');
      this.sinon.stub(subject, 'cancelRequest');
      this.sinon.stub(subject, 'requestPermission');
    });

    test('fullscreenoriginchange', function() {
      this.sinon.stub(subject, 'handleFullscreenOriginChange');
      sendFullScreenEvent('');
      assert.isTrue(subject.cleanDialog.called);
      assert.isTrue(subject.handleFullscreenOriginChange.called);
    });

    test('requestPermission sould be called with constant id', function() {
      sendFullScreenEvent('');
      assert.isTrue(subject.requestPermission
        .calledWith('fullscreen'));
    });

    test('previous dialog should be cancelled', function() {
      sendFullScreenEvent('');
      assert.isFalse(subject.cancelRequest.called);

      subject.fullscreenRequest = 'fullscreen';
      sendFullScreenEvent('');
      assert.isTrue(subject.cancelRequest.calledWith('fullscreen'));
    });
  });

  suite('discardPermissionRequest', function() {
    setup(function() {
      this.sinon.stub(subject, 'dispatchResponse');
      this.sinon.stub(subject, 'hidePermissionPrompt');
    });

    test('no currentRequestId', function() {
      subject.discardPermissionRequest();
      assert.isFalse(subject.dispatchResponse.called);
      assert.isFalse(subject.hidePermissionPrompt.called);
    });

    test('has currentRequestId', function() {
      subject.currentRequestId = 123;
      subject.discardPermissionRequest();
      assert.isTrue(subject.dispatchResponse.called);
      assert.isTrue(subject.hidePermissionPrompt.called);
    });

    test('currentRequestId is \'fullscreen\'', function() {
      subject.currentRequestId = 'fullscreen';
      subject.fullscreenRequest = 'fullscreen';
      subject.no.callback = this.sinon.stub();
      subject.discardPermissionRequest();
      assert.isTrue(subject.no.callback.called);
      assert.isUndefined(subject.fullscreenRequest);
    });
  });

  suite('handlePermissionPrompt', function() {
    var detail;
    setup(function() {
      detail = {'type': 'permission-prompt', 'permission': 'geolocation'};
      this.sinon.stub(subject, 'requestPermission');
    });

    teardown(function() {
      detail = null;
    });

    test('permission-prompt', function() {
      sendChromeEvent('permission-prompt', 'test');
      subject.handlePermissionPrompt(detail);

      assert.equal(subject.remember.checked, false);
      assert.isTrue(subject.requestPermission.called);
    });

    test('permission-prompt remember', function() {
      sendChromeEvent('permission-prompt', 'test', true);
      detail.remember = true;
      subject.handlePermissionPrompt(detail);

      assert.equal(subject.remember.checked, true);
      assert.isTrue(subject.requestPermission.called);
    });
  });

  suite('dispatchResponse', function() {
    setup(function() {
      this.sinon.stub(window, 'dispatchEvent');
    });

    test('permission-allow', function() {
      subject.dispatchResponse(123, 'permission-allow', true);
      assert.equal(subject.responseStatus, 'permission-allow');
      assert.isTrue(window.dispatchEvent.called);
    });

    test('permission-deny', function() {
      subject.dispatchResponse(123, 'permission-deny', true);
      assert.equal(subject.responseStatus, 'permission-deny');
      assert.isTrue(window.dispatchEvent.called);
    });
  });

  suite('bug 907075 dismiss same permissions request from same origin',
   function() {
    setup(function() {
      this.sinon.spy(subject, 'showNextPendingRequest');
      this.sinon.spy(subject, 'dispatchResponse');
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('prompt called twice', function() {
      assert.equal(subject.permissionType, 'audio-capture');
      assert.equal(subject.pending.length, 2);
    });

    test('handle pending', function() {
      subject.remember.checked = true;
      subject.clickHandler({target: subject.yes});
      assert.equal(subject.pending.length, 1);
    });

    test('dismiss same permissions request from same origin', function() {
      subject.remember.checked = true;
      subject.clickHandler({target: subject.yes});
      assert.isTrue(subject.showNextPendingRequest.called);
      assert.isTrue(subject.dispatchResponse.called);
    });
  });

  // test getUserMedia related permissions
  suite('audio capture permission', function() {
    setup(function() {
      this.sinon.spy(subject, 'requestPermission');

      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
    });

    test('permission-prompt', function() {
      assert.equal(subject.permissionType, 'audio-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(subject.requestPermission
        .calledWithMatch('perm1', 'test', 'audio-capture',
        sinon.match.string, 'perm-audio-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(subject.currentChoices['video-capture'],
        undefined);
      assert.equal(subject.currentChoices['audio-capture'],
        '');
    });

    test('not show remember my choice option', function() {
      assert.equal(subject.rememberSection.style.display, 'none');
    });
  });

  suite('video capture permission', function() {
    setup(function() {
      this.sinon.spy(subject, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']});
    });

    test('permission-prompt', function() {
      assert.equal(subject.permissionType, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(subject.requestPermission
        .calledWithMatch('perm1', 'test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(subject.currentChoices['video-capture'],
        'back');
    });

    test('not show remember my choice option', function() {
      assert.equal(subject.rememberSection.style.display, 'none');
    });
  });

  suite('camera selector dialog', function() {
    setup(function() {
      this.sinon.spy(subject, 'requestPermission');
      this.sinon.spy(subject, 'showPermissionPrompt');

      sendMediaEvent('permission-prompt',
        {'video-capture': ['back', 'front']}, true, true);
    });

    test('is camera selector', function() {
      assert.equal(subject.isCamSelector, true);
    });

    test('permission selector is shown', function() {
      var yescallback = this.sinon.stub();
      var nocallback = this.sinon.stub();
      subject.showPermissionPrompt(1, '', '',
        yescallback, nocallback);

      assert.equal(subject.buttons.dataset.items, 1);
      assert.equal(subject.rememberSection.style.display, 'none');
      assert.equal(subject.no.style.display, 'none');
    });

    test('permission-prompt', function() {
      assert.equal(subject.permissionType, 'video-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(subject.requestPermission
        .calledWithMatch('perm1', 'test', 'video-capture',
        sinon.match.string, 'perm-video-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(subject.currentChoices['video-capture'],
        'back');
    });

    test('remember my choice option is checked in app mode', function() {
      assert.equal(subject.remember.checked, true);
    });
  });

  suite('media capture permission', function() {
    setup(function() {
      this.sinon.spy(subject, 'requestPermission');

      sendMediaEvent('permission-prompt',
        {
          'video-capture': ['front', 'back'],
          'audio-capture': ['']
        });
    });

    test('permission-prompt', function() {
      assert.equal(subject.permissionType, 'media-capture');
    });

    test('permission id matched', function() {
      assert.isTrue(subject.requestPermission
        .calledWithMatch('perm1', 'test', 'media-capture',
        sinon.match.string, 'perm-media-capture-more-info'));
    });

    test('default choice', function() {
      assert.equal(subject.currentChoices['video-capture'], 'front');
      assert.equal(subject.currentChoices['audio-capture'], '');
    });

    test('not show remember my choice option', function() {
      assert.equal(subject.rememberSection.style.display, 'none');
    });

    test('remember my choice option is unchecked in web mode', function() {
      assert.equal(subject.remember.checked, false);
    });
  });

  suite('bug 981550 Apps can cause permissions prompts in other apps',
   function() {
    setup(function() {
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      subject.currentRequestId = 123;
      sendMediaEvent('permission-prompt', {'video-capture': ['']});
      subject.discardPermissionRequest();
      sendMediaEvent('permission-prompt', {'audio-capture': ['']});
      sendMediaEvent('permission-prompt', {'video-capture': ['']});
    });

    test('should have 1 pending', function() {
      assert.equal(subject.pending.length, 1);
    });
  });

  suite('Toggle more/hide info in permission dialog',
    function() {
      setup(function() {
        this.sinon.stub(subject, 'hidePermissionPrompt');
        sendChromeEvent('permission-prompt', 'test');
      });

      test('should toggle info when more info is clicked', function() {
        assert.isTrue(
          subject.moreInfoBox.classList.contains('hidden'));
        subject.clickHandler({
          target: subject.moreInfoLink
        });
        assert.isFalse(subject.hidePermissionPrompt.called);
        assert.isFalse(
          subject.moreInfoBox.classList.contains('hidden'));
      });

      test('should toggle info when hide info is clicked', function() {
        subject.clickHandler({
          target: subject.moreInfoLink
        });
        subject.clickHandler({
          target: subject.hideInfoLink
        });
        assert.isFalse(subject.hidePermissionPrompt.called);
        assert.isTrue(
          subject.moreInfoBox.classList.contains('hidden'));
      });
  });

});
