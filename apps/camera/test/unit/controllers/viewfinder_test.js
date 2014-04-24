/*global req*/
'use strict';

suite('controllers/viewfinder', function() {
  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/viewfinder',
      'views/viewfinder',
      'views/focus-ring',
      'lib/activity',
      'lib/settings',
      'lib/setting'
    ], function(
      App, Camera, ViewfinderController, ViewfinderView,
      FocusRingView, Activity, Settings, Setting) {
      self.ViewfinderController = ViewfinderController.ViewfinderController;
      self.ViewfinderView = ViewfinderView;
      self.FocusRingView = FocusRingView;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Activity = Activity;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.activity = sinon.createStubInstance(this.Activity);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.grid = sinon.createStubInstance(this.Setting);
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      focusRing: sinon.createStubInstance(this.FocusRingView),
    };

    // Fake elements
    this.app.views.viewfinder.els = { video: {} };

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.grid = sinon.createStubInstance(this.Setting);
    this.app.settings.viewfinder = sinon.createStubInstance(this.Setting);
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.zoom = sinon.createStubInstance(this.Setting);

    // Default return values
    this.app.settings.viewfinder.get.withArgs('scaleType').returns('fill');
    this.app.settings.grid.selected.withArgs('key').returns('off');

    // Shortcuts
    this.viewfinder = this.app.views.viewfinder;
    this.focusRing = this.app.views.focusRing;
    this.settings = this.app.settings;
    this.camera = this.app.camera;

    // Test instance
    this.controller = new this.ViewfinderController(this.app);
  });

  suite('ViewfinderController()', function() {
    test('Should stop the stream when the PreviewGallery is opened', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:opened', this.controller.stopStream));
    });

    test('Should start the stream when the PreviewGallery is closed', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:closed', this.controller.startStream));
    });

    test('Should stop the stream when on app blur', function() {
      assert.isTrue(this.app.on.calledWith('blur', this.controller.stopStream));
    });

    test('Should hide the grid when the settings menu opened', function() {
      assert.isTrue(this.app.on.calledWith('settings:opened', this.controller.hideGrid));
    });

    test('Should show the grid again when the settings menu is closed', function() {
      assert.isTrue(this.app.on.calledWith('settings:closed', this.controller.configureGrid));
    });

    test('Should flash viewfinder shutter when camera shutter fires', function() {
      assert.isTrue(this.app.on.calledWith('camera:shutter', this.controller.onShutter));
    });

    test('Should respond to `zoomchanged` event', function() {
      assert.isTrue(this.camera.on.calledWith('zoomchanged'));
    });

    test('Should should set the foucsRing state when focus changes', function() {
      assert.isTrue(this.app.on.calledWith('camera:focuschanged', this.focusRing.setState));
    });

    test('Should set the scaleType on the view', function() {
      assert.equal(this.viewfinder.scaleType, 'fill');
    });

    test('Should set grid on/off', function() {
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'off'));
      this.app.settings.grid.selected.withArgs('key').returns('on');
      this.viewfinder.set.reset();

      this.controller = new this.ViewfinderController(this.app);
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'on'));
    });
  });

  suite('ViewfinderController#startStream()', function() {
    test('Should load preview stream into viewfinder video element', function() {
      var video = this.viewfinder.els.video;
      this.controller.startStream();
      assert.isTrue(this.camera.loadStreamInto.calledWith(video));
    });

    test('Should not `loadStreamInto` if preview-gallery is open', function() {
      this.app.get.withArgs('previewGalleryOpen').returns(true);
      this.controller.startStream();
      assert.isFalse(this.camera.loadStreamInto.called);
    });
  });

  suite('ViewfinderController#configurePreview()', function() {
    setup(function() {
      this.settings.cameras.selected.withArgs('key').returns('back');
      this.camera.getSensorAngle.returns(90);
      this.camera.previewSize.returns({ width: 400, height: 300 });
    });

    test('Should pass current previewSize', function() {
      this.controller.configurePreview();
      var previewSize = this.viewfinder.updatePreview.args[0][0];
      assert.deepEqual(previewSize, { width: 400, height: 300 });
    });

    test('Should pass the sensor angle', function() {
      this.controller.configurePreview();
      var arg = this.viewfinder.updatePreview.args[0][1];
      assert.equal(arg, 90);
    });

    test('Should indicate if selected camera is front', function() {
      var arg;

      // Back
      this.controller.configurePreview();
      arg = this.viewfinder.updatePreview.args[0][2];
      assert.equal(arg, false);
      this.viewfinder.updatePreview.reset();

      // Front
      this.settings.cameras.selected.withArgs('key').returns('front');
      this.controller.configurePreview();
      arg = this.viewfinder.updatePreview.args[0][2];
      assert.equal(arg, true);
    });
  });

  suite('ViewfinderController#configureZoom()', function() {
    setup(function() {
      this.camera.isZoomSupported.returns(true);
      this.settings.zoom.enabled.returns(true);

      this.camera.getMinimumZoom.returns(0);
      this.camera.getMaximumZoom.returns(3);
    });

    test('Should call enableZoom on the viewfinder', function() {
      this.controller.configureZoom();
      assert.isTrue(this.viewfinder.enableZoom.calledWith(0, 3));
    });

    test('Should disable zoom if camera doesn\'t support zoom', function() {
      this.camera.isZoomSupported.returns(false);

      this.controller.configureZoom();
      assert.isTrue(this.viewfinder.disableZoom.called);
    });

    test('Should disable zoom if zoom disabled in settings', function() {
      this.settings.zoom.enabled.returns(false);

      this.controller.configureZoom();
      assert.isTrue(this.viewfinder.disableZoom.called);
    });
  });

  suite('click:viewfinder', function() {
    test('Should set the grid depending on the setting', function() {
      this.app.settings.grid.selected.withArgs('key').returns('on');
      this.controller = new this.ViewfinderController(this.app);
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'on'));

      this.app.settings.grid.selected.withArgs('key').returns('off');
      this.controller = new this.ViewfinderController(this.app);
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'off'));
    });

    test('Should set viewfinder fill depending on the setting', function() {
      this.app.settings.viewfinder.get.withArgs('scaleType').returns('fill');
      this.controller = new this.ViewfinderController(this.app);
      assert.equal(this.viewfinder.scaleType, 'fill');

      this.app.settings.viewfinder.get.withArgs('scaleType').returns('fit');
      this.controller = new this.ViewfinderController(this.app);
      assert.equal(this.viewfinder.scaleType, 'fit');
    });
  });
});
