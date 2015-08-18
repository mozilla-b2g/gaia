'use strict';

suite('controllers/zoom-bar', function() {
  suiteSetup(function(done) {
    var self = this;

    requirejs([
      'app',
      'lib/camera/camera',
      'lib/settings',
      'lib/setting',
      'controllers/zoom-bar',
      'views/zoom-bar'
    ], function(
      App, Camera, Settings, Setting, ZoomBarController, ZoomBarView) {
      self.ZoomBarController = ZoomBarController.ZoomBarController;
      self.ZoomBarView = ZoomBarView;
      self.Camera = Camera;
      self.App = App;
      self.Settings = Settings;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();

    // App
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.views = {
      zoombar: sinon.createStubInstance(this.ZoomBarView)
    };

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.zoom = sinon.createStubInstance(this.Setting);

    // Test instance
    this.controller = new this.ZoomBarController(this.app);

    // Shortcuts
    this.zoombar = this.controller.view;
    this.camera = this.app.camera;
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('ViewfinderController()', function() {
    test('Should configure zoom when zoomconfigured event is emitted', function() {
      assert.isTrue(this.camera.on.calledWith('zoomconfigured',
        this.controller.onZoomConfigured));
    });

    test('Should set the zoom when zoomchanged event is emitted', function() {
      assert.isTrue(this.camera.on.calledWith('zoomchanged',
        this.controller.setZoom));
    });
  });

  suite('ViewfinderController#createViews()', function() {
    setup(function() {
      this.controller.createView();
    });

    test('It appends view', function() {
      assert.isTrue(this.zoombar.appendTo.calledWith(this.zoombar.el));
    });
  });

  suite('ZoomBar#onChange()', function() {
    setup(function() {
      this.camera.getMaximumZoom.returns(10);
      this.camera.getMinimumZoom.returns(1);
      this.controller.onChange(5);
    });

    test('It calls setZoom with the correct value', function() {
      assert.isTrue(this.camera.setZoom.calledWith(1.45));
    });
  });

  suite('ZoomBar#onZoomConfigured()', function() {
    setup(function() {
      sinon.stub(this.controller, 'configureZoomBar');
      sinon.stub(this.controller, 'setZoom');
      this.controller.onZoomConfigured(5);
    });

    test('It sets zoom and hides', function() {
      assert.isTrue(this.controller.configureZoomBar.calledOnce);
      assert.isTrue(this.controller.setZoom.calledWith(5));
      assert.isTrue(this.zoombar.hide.called);
    });
  });

  suite('ZoomBar#configureZoomBar()', function() {
    test('It disables zoom if not supported by camera', function() {
      this.camera.isZoomSupported.returns(false);
      this.app.settings.zoom.enabled.returns(true);
      this.controller.configureZoomBar();
      assert.isFalse(this.controller.enableZoom);
    });

    test('It enables zoom if supported by camera', function() {
      this.camera.isZoomSupported.returns(true);
      this.app.settings.zoom.enabled.returns(true);
      this.controller.configureZoomBar();
      assert.isTrue(this.controller.enableZoom);
    });
  });

  suite('ZoomBar#setZoom()', function() {
    setup(function() {
      this.camera.getMaximumZoom.returns(11);
      this.camera.getMinimumZoom.returns(1);
    });

    test('It sets the zoom with the correct value if enabled', function() {
      this.controller.enableZoom = true;
      this.controller.setZoom(4);
      assert.isTrue(this.zoombar.setValue.calledWith(30));
    });

    test('It does not set the zoom if disabled', function() {
      this.controller.enableZoom = false;
      this.controller.setZoom(4);
      assert.isFalse(this.zoombar.setValue.calledWith(30));
    });
  });

});
