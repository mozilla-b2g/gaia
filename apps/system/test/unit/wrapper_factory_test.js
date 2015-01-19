'use strict';
/* global WrapperFactory, MockAppWindow, MocksHelper */

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForWrapperFactory = new MocksHelper([
  'AppWindow', 'Service'
]).init();

suite('system/WrapperFactory', function() {
  mocksForWrapperFactory.attachTestHelpers();
  setup(function(done) {
    requireApp('system/js/wrapper_factory.js', done);
  });

  suite('isLaunchingWindow', function() {
    var app;
    setup(function() {
      app = new MockAppWindow();
      this.sinon.stub(window, 'AppWindow').returns(app);
      WrapperFactory.start();
    });
    teardown(function() {
      window.AppWindow = null;
      WrapperFactory.stop();
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
  });

  test('Set oop in browser config', function() {
    var features = {
      remote: true
    };
    var config = WrapperFactory.generateBrowserConfig(features);
    assert.isTrue(config.oop);
  });
});
