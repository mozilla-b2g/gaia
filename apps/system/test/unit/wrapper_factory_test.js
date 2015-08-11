'use strict';
/* globals WrapperFactory, MockAppWindow, MocksHelper, MockApplications,
           MockPermissionSettings */

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_permission_settings.js');

var mocksForWrapperFactory = new MocksHelper([
  'AppWindow', 'Service', 'Applications'
]).init();

suite('system/WrapperFactory', function() {
  mocksForWrapperFactory.attachTestHelpers();
  setup(function(done) {
    requireApp('system/js/wrapper_factory.js', done);
  });

  suite('isLaunchingWindow', function() {
    var app, appWindowStub, realApplications;
    setup(function() {
      realApplications = window.applications;
      window.applications = MockApplications;

      app = new MockAppWindow();
      appWindowStub = this.sinon.stub(window, 'AppWindow');
      appWindowStub.returns(app);
      WrapperFactory.start();
    });
    teardown(function() {
      WrapperFactory.stop();
      appWindowStub.restore();
      window.applications = realApplications;
    });

    test('Launching a wrapper', function() {
      window.dispatchEvent(new CustomEvent('mozbrowseropenwindow',
        {detail: {
          url: 'fake',
          manifestURL: 'fake/webapp',
          features: 'remote=true'
        }}));
      assert.isTrue(WrapperFactory.isLaunchingWindow());
      app.element.dispatchEvent(new CustomEvent('_opened', {
        detail: app
      }));
      assert.isFalse(WrapperFactory.isLaunchingWindow());
    });

    suite('Remote windows', function() {
      var fakeManifestURL = 'fake/webapp';
      var realPermissionSettings, stubDispatchEvent;

      setup(function() {
        // Setup temporary mock mozPermissionSettings
        realPermissionSettings = navigator.mozPermissionSettings;
        navigator.mozPermissionSettings = MockPermissionSettings;
        MockPermissionSettings.mSetup();

        // Stub window.dispatchEvent
        stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

        // Register fake app
        MockApplications.mRegisterMockApp({
          manifestURL: fakeManifestURL
        });
      });

      teardown(function() {
        // Restore real mozPermissionSettings and window.dispatchEvent
        navigator.mozPermissionSettings = realPermissionSettings;
        stubDispatchEvent.restore();
      });

      function launchRemoteWindow() {
        WrapperFactory.handleEvent({
          type: 'mozbrowseropenwindow',
          target: { getAttribute: () => fakeManifestURL },
          stopImmediatePropagation: function () {},
          preventDefault: function () {},
          detail: {
            url: 'fake',
            manifestURL: fakeManifestURL,
            features: 'remote=true'
          }
        });
      }

      test('Launch with open-remote-window', function() {
        MockPermissionSettings.set('open-remote-window', 'allow');
        launchRemoteWindow();
        assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      });

      test('Launch with homescreen-webapps-manage', function() {
        MockPermissionSettings.set('homescreen-webapps-manage', 'allow');
        launchRemoteWindow();
        assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      });
    });
  });

  test('Set oop in browser config', function() {
    var features = {
      remote: true
    };
    var config = WrapperFactory.generateBrowserConfig(features);
    assert.isTrue(config.oop);
  });
});
