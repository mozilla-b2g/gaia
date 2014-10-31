'use strict';

suite('controllers/zoom-bar', function() {
  suiteSetup(function(done) {
    var self = this;

    requirejs([
      'app',
      'lib/camera/camera',
      'controllers/zoom-bar',
      'views/zoom-bar'
    ], function(
      App, Camera, ZoomBarController, ZoomBarView) {
      self.ZoomBarController = ZoomBarController.ZoomBarController;
      self.ZoomBarView = ZoomBarView;
      self.Camera = Camera;
      self.App = App;
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
      sinon.stub(this.controller, 'setZoom');
      this.controller.onZoomConfigured(5);
    });

    test('It sets zoom and hides', function() {
      assert.isTrue(this.controller.setZoom.calledWith(5));
      assert.isTrue(this.zoombar.hide.called);
    });
  });

  suite('ZoomBar#setZoom()', function() {
    setup(function() {
      this.camera.getMaximumZoom.returns(11);
      this.camera.getMinimumZoom.returns(1);
      this.controller.setZoom(4);
    });

    test('It sets the zoom with the correct value', function() {
      assert.isTrue(this.zoombar.setValue.calledWith(30));
    });
  });

});
