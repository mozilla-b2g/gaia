/* global MocksHelper, HomescreenWindow, MockApplications,
          MockAppWindow */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForHomescreenWindow = new MocksHelper([
  'Service', 'Applications', 'SettingsListener', 'ManifestHelper'
]).init();

suite('system/HomescreenWindow', function() {
  mocksForHomescreenWindow.attachTestHelpers();
  var homescreenWindow;
  var stubById;
  var realApplications;

  setup(function(done) {
    this.sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      var element = document.createElement('div');
      if (id === 'homescreen') {
        var container = document.createElement('div');
        container.className = 'browser-container';
        element.appendChild(container);
      }

      return element;
    });
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/homescreen_window.js', done);

    realApplications = window.applications;
    window.applications = MockApplications;
  });

  teardown(function() {
    stubById.restore();
    window.applications = realApplications;
    realApplications = null;
  });

  suite('homescreen window instance.', function() {
    setup(function() {
      MockApplications.mRegisterMockApp({
        manifestURL: 'fakeManifestURL',
        origin: 'fakeOrigin',
        manifest: {

        }
      });

      homescreenWindow = new HomescreenWindow('fakeManifestURL');
      if (!('setVisible' in homescreenWindow.browser.element)) {
        homescreenWindow.browser.element.setVisible = function() {};
      }
    });
    teardown(function() {
    });

    test('should always resize', function() {
      var stubResize = this.sinon.stub(homescreenWindow, '_resize')
        .returns({ stub: 'promise' });
      var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
      stubIsActive.returns(false);

      var p = homescreenWindow.resize();
      assert.isTrue(stubResize.calledOnce);
      assert.deepEqual(p, { stub: 'promise' });
    });

    test('Homescreen browser frame', function() {
      assert.equal(homescreenWindow.browser.element.name, 'main');
      assert.equal(
        homescreenWindow.browser.element.getAttribute('mozapptype'),
        'homescreen');
    });
    test('homescreen is created', function() {
      assert.isTrue(homescreenWindow.isHomescreen);
    });

    test('setBrowserConfig creates app chrome', function() {
      homescreenWindow.config = null;
      homescreenWindow.setBrowserConfig('fakeManifestURL');
      assert.isTrue(!!homescreenWindow.config);
      assert.isTrue(!!homescreenWindow.config.chrome);
    });

    test('setBrowserConfig on browserchrome does not create app chrome',
      function() {
        var verticalHomeUrl =
          'app://verticalhome.gaiamobile.org/manifest.webapp';
        var mockVerticalHome = {
          manifestURL: verticalHomeUrl,
          origin: 'fakeOrigin',
          manifest: {}
        };

        MockApplications.mRegisterMockApp(mockVerticalHome);

        homescreenWindow.config = null;
        homescreenWindow.setBrowserConfig(verticalHomeUrl);
        assert.isTrue(!!homescreenWindow.config);
        assert.isFalse(!!homescreenWindow.config.chrome);

        MockApplications.mUnregisterMockApp(mockVerticalHome);
      });

    test('ensure should change the url', function() {
      var url = homescreenWindow.browser.element.src;
      homescreenWindow.ensure(true);
      assert.notEqual(url, homescreenWindow.browser.element.src);
    });

    test('ensure should not increase the length of the src', function() {
      // Initially the url ends in #root. Call ensure() twice to ensure
      // that we do not continue to increase the length on hash changes.
      homescreenWindow.ensure(true);
      var firstEnsure = homescreenWindow.browser.element.src;

      homescreenWindow.ensure(true);
      var secondEnsure = homescreenWindow.browser.element.src;

      assert.equal(firstEnsure.length, secondEnsure.length);
    });

    test('ensure should kill front window but not change the url', function() {
      var fakeFrontWindow = new MockAppWindow({ url: 'fake' });
      homescreenWindow.frontWindow = fakeFrontWindow;
      var url = homescreenWindow.browser.element.src;
      var stubKill = this.sinon.stub(fakeFrontWindow, 'kill');
      homescreenWindow.ensure(true);
      assert.isTrue(stubKill.called);
      assert.equal(url, homescreenWindow.browser.element.src);
      homescreenWindow.frontWindow = null;
    });

    suite('handle events', function() {
      test('mozbrowser events', function() {
        var stubRestart = this.sinon.stub(homescreenWindow, 'restart');
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(true);

        homescreenWindow.handleEvent({
          type: 'mozbrowserclose'
        });
        assert.isTrue(stubRestart.calledOnce);

        homescreenWindow.handleEvent({
          type: 'mozbrowsererror',
          detail: {
            type: 'fatal'
          }
        });
        assert.isTrue(stubRestart.calledTwice);
      });
      test('_localized event', function() {
        var stubPublish = this.sinon.stub(homescreenWindow, 'publish');

        homescreenWindow.handleEvent({
          type: '_localized'
        });

        assert.isTrue(stubPublish.calledOnce);
        assert.isTrue(stubPublish.calledWith('namechanged'));
      });
    });
    suite('homescreen is crashed', function() {
      var stubRender;
      var spyKill;
      setup(function() {
        stubRender = this.sinon.stub(homescreenWindow, 'render');
        spyKill = this.sinon.spy(homescreenWindow, 'kill');
      });

      teardown(function() {
        stubRender.restore();
        spyKill.restore();
      });

      test('Homescreen is crashed at foreground:' +
          'rerender right away.', function() {
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(true);
        homescreenWindow.restart();
        assert.isTrue(spyKill.called);
        this.sinon.clock.tick(0);
        assert.isTrue(stubRender.called);
      });

      test('Homescreen is crashed at background: killed', function() {
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(false);
        homescreenWindow.restart();
        assert.isTrue(spyKill.called);
      });

      test('Homescreen should hide its fade-overlay while we call the method',
      function() {
        var originalOverlay = homescreenWindow.fadeOverlay,
            domOverlay = document.createElement('div');
        homescreenWindow.fadeOverlay = domOverlay;
        homescreenWindow.hideFadeOverlay();
        assert.isTrue(homescreenWindow.fadeOverlay
          .classList.contains('hidden'));
        homescreenWindow.fadeOverlay = originalOverlay;
      });

      test('Homescreen should show its fade-overlay while we call the method',
      function() {
        var originalOverlay = homescreenWindow.fadeOverlay,
            domOverlay = document.createElement('div');
        homescreenWindow.fadeOverlay = domOverlay;
        homescreenWindow.showFadeOverlay();
        assert.isFalse(homescreenWindow.fadeOverlay
          .classList.contains('hidden'));
        homescreenWindow.fadeOverlay = originalOverlay;
      });
    });
  });
});
