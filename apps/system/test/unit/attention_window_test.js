/* globals AttentionWindow, MocksHelper, AppWindow */
'use strict';

mocha.globals(['AppWindow', 'BrowserMixin', 'AttentionWindow',
  'System', 'BrowserFrame', 'BrowserConfigHelper', 'LayoutManager',
  'OrientationManager', 'SettingsListener', 'Applications']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');

var mocksForAttentionWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager'
]).init();

suite('system/AttentionWindow', function() {
  mocksForAttentionWindow.attachTestHelpers();
  var stubById;
  var container;
  var fakeAttentionConfig = {
    'url': 'app://fakeatt.gaiamobile.org/pick.html',
    'manifestURL': 'app://fakeatt.gaiamobile.org/manifest.webapp',
    iframe: document.createElement('iframe')
  };

  setup(function(done) {
    this.sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/attention_window.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('attention window instance.', function() {
    var app, appF;
    setup(function() {
      container = AttentionWindow.prototype.containerElement;
      AttentionWindow.prototype.containerElement = document.body;
      app = new AppWindow({
        iframe: document.createElement('iframe'),
        frame: document.createElement('div'),
        origin: 'http://fake',
        url: 'http://fakeurl/index.html',
        manifestURL: 'http://fakemanifesturl',
        name: 'fake',
        manifest: {
          orientation: 'default'
        }
      });
      appF = new AppWindow({
        iframe: document.createElement('iframe'),
        frame: document.createElement('div'),
        origin: 'http://fake',
        url: 'http://fakeurl/index.html',
        manifestURL: 'http://fakemanifesturl',
        name: 'fake',
        manifest: {
          orientation: 'default',
          fullscreen: true
        }
      });
    });
    teardown(function() {
      AttentionWindow.prototype.containerElement = container;
    });

    test('ready', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      var callback1 = this.sinon.spy();
      attention.loaded = false;
      attention.ready(callback1);
      attention.element.dispatchEvent(new CustomEvent('_loaded'));
      this.sinon.clock.tick(0);
      assert.isTrue(callback1.called);

      var callback2 = this.sinon.spy();
      attention.loaded = true;
      var stubTryWaitForFullRepaint =
        this.sinon.stub(attention, 'tryWaitForFullRepaint');
      attention.ready(callback2);
      stubTryWaitForFullRepaint.getCall(0).args[0]();
      this.sinon.clock.tick(0);
      assert.isTrue(callback2.called);
    });

    test('handle resize event', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      var stubClose = this.sinon.stub(attention, 'close');
      var stubRequestOpen = this.sinon.stub(attention, 'requestOpen');
      attention._handle_mozbrowserresize({
        detail: {
          height: 1000
        }
      });
      assert.isTrue(stubRequestOpen.called);

      attention._handle_mozbrowserresize({
        detail: {
          height: 40
        }
      });

      assert.isTrue(stubClose.called);
    });
  });
});
