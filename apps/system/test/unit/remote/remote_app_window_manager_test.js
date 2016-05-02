/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global MocksHelper, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/browser_frame.js');
requireApp('system/js/remote/remote_app_window_manager.js');

var mocksForMultiScreenHelper = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/RemoteAppWindowManager', function() {
  mocksForMultiScreenHelper.attachTestHelpers();

  var subject;
  var container;
  var fakeElement;
  var fakeConfig = {
    url: 'test.html',
    requestId: 'test-request-id',
    manifest: {}
  };

  setup(function() {
    container = document.createElement('div');
    container.id = 'windows';
    document.body.appendChild(container);

    subject = BaseModule.instantiate('RemoteAppWindowManager');
    subject.start();
  });

  teardown(function() {
    subject.stop();
    document.body.removeChild(container);
  });

  suite('start', function() {
    test('should set the container', function() {
      assert.isNotNull(subject.container);
    });
  });

  suite('stop', function() {
    test('should clear the container', function() {
      subject.stop();
      assert.isNull(subject.container);
    });
  });

  suite('launchApp', function() {

    setup(function() {
      fakeElement = document.createElement('iframe');
      this.sinon.stub(window, 'BrowserFrame', function(config) {
        this.element = fakeElement;
      });
    });

    teardown(function() {
      fakeElement = null;
    });

    test('should pass untouched config to BrowserFrame', function() {
      subject.launchApp(fakeConfig);
      assert.isTrue(window.BrowserFrame.calledWith(fakeConfig));
      assert.isNotNull(subject.currentApp);
    });

    test('should create a container for browserFrame', function() {
      subject.launchApp(fakeConfig);

      var appWindow = document.querySelector('.appWindow');
      assert.isNotNull(appWindow);
      assert.equal(subject.currentApp.container, appWindow);
    });

    test('should resolve after receiving "animationend"', function(done) {
      subject.launchApp(fakeConfig).then(function(config) {
        done(function() {
          assert.equal(config, fakeConfig);
        });
      });

      var appWindow = document.querySelector('.appWindow');
      appWindow.dispatchEvent(new CustomEvent('animationend'));
    });

    test('should resolve immediately', function(done) {
      subject.launchApp(fakeConfig, true).then(function(config) {
        done(function() {
          assert.equal(config, fakeConfig);
        });
      });
    });

    test('should reject if previous app is during animation', function(done) {
      subject.launchApp(fakeConfig);
      subject.launchApp(fakeConfig).catch(function(reason) {
        done();
      });
    });
  });

  suite('launchPresentationApp', function() {
    test('should call launchApp if presentation permission exists',
      function() {
        fakeConfig.manifest = {
          permissions: {
            presentation: {}
          }
        };

        this.sinon.stub(subject, 'launchApp');
        subject.launchPresentationApp(fakeConfig);
        assert.ok(subject.launchApp.calledOnce);

        fakeConfig.manifest = {};
    });

    test('should send premission denied event if presentation ' +
      'permission not exists', function() {

        this.sinon.stub(subject, '_sendPresentationResult');
        subject.launchPresentationApp(fakeConfig)
          .catch(function (reason) {
            assert.equal(reason, 'no presentation permission');
            assert.ok(subject._sendPresentationResult.calledWith({
              type: 'presentation-receiver-permission-denied',
              id: fakeConfig.requestId,
            }));
        });
      });
  });

  suite('killCurrentApp', function() {
    var fakeElement;

    setup(function() {
      fakeElement = document.createElement('iframe');
      this.sinon.stub(window, 'BrowserFrame', function(config) {
        this.element = fakeElement;
      });
      subject.launchApp({});
      subject.killCurrentApp();
    });

    teardown(function() {
      fakeElement = null;
    });

    test('should remove element from container', function() {
      var appWindow = document.querySelector('.appWindow');
      assert.isNull(appWindow);
      assert.isNull(subject.currentApp);
    });
  });

  suite('event handlers', function() {
    setup(function() {
      fakeConfig.manifest = {
        permissions: {
          presentation: {}
        }
      };
      fakeElement = document.createElement('iframe');
      this.sinon.stub(window, 'BrowserFrame', function(config) {
        this.element = fakeElement;
      });
      subject.launchPresentationApp(fakeConfig);
    });

    teardown(function() {
      fakeConfig.manifest = {};
      fakeElement = null;
    });

    test('should kill current app when mozbrowsererror', function() {
      this.sinon.stub(subject, 'killCurrentApp');
      fakeElement.dispatchEvent(new CustomEvent('mozbrowsererror'));
      assert.isTrue(subject.killCurrentApp.called);
    });

    test('should kill current app when mozbrowserclose', function() {
      this.sinon.stub(subject, 'killCurrentApp');
      fakeElement.dispatchEvent(new CustomEvent('mozbrowserclose'));
      assert.isTrue(subject.killCurrentApp.called);
    });

    test('should send presentation receiver launched ' +
      'event if shell-remote loaded', function() {
        this.sinon.stub(subject, '_sendPresentationResult');
        fakeElement.dispatchEvent(new CustomEvent('mozbrowserloadend'));
        assert.ok(subject._sendPresentationResult.calledWith({
          type: 'presentation-receiver-launched',
          id: fakeConfig.requestId,
          frame: subject.currentApp.element
        }));
    });
  });
});
