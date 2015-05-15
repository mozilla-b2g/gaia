/* global MocksHelper, BaseModule */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/browser_frame.js');
requireApp('system/js/remote/remote_app_window_manager.js');

var mocksForMultiScreenController = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/RemoteAppWindowManager', function() {
  mocksForMultiScreenController.attachTestHelpers();

  var subject;
  var container;

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
    var fakeElement;
    var fakeConfig = {
      url: 'test.html'
    };

    setup(function() {
      fakeElement = document.createElement('iframe');
      this.sinon.stub(window, 'BrowserFrame', function(config) {
        this.element = fakeElement;
      });
      subject.launchApp(fakeConfig);
    });

    teardown(function() {
      fakeElement = null;
    });

    test('should pass untouched config to BrowserFrame', function() {
      assert.isTrue(window.BrowserFrame.calledWith(fakeConfig));
      assert.isNotNull(subject.currentApp);
    });

    test('should create a container for browserFrame', function() {
      var appWindow = document.querySelector('.appWindow');
      assert.isNotNull(appWindow);
      assert.equal(subject.currentApp.container, appWindow);
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
    var fakeElement;

    setup(function() {
      fakeElement = document.createElement('iframe');
      this.sinon.stub(window, 'BrowserFrame', function(config) {
        this.element = fakeElement;
      });
      subject.launchApp({});
    });

    teardown(function() {
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

    test('should trigger _handle_animationend when animationend', function() {
      this.sinon.stub(subject, '_handle_animationend');
      subject.currentApp.container.dispatchEvent(
        new CustomEvent('animationend'));
      assert.isTrue(subject._handle_animationend.called);
    });

    test('should remove animation class when animationend', function() {
      var container = subject.currentApp.container;
      assert.isTrue(container.classList.contains('opening'));
      subject._handle_animationend({
        target: container,
        animationName: 'opening'
      });
      assert.isFalse(container.classList.contains('opening'));
    });
  });
});
