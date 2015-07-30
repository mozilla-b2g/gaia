'use strict';

suite('controllers/viewfinder', function() {
  suiteSetup(function(done) {
    var self = this;

    requirejs([
      'app',
      'lib/camera/camera',
      'controllers/viewfinder',
      'views/viewfinder',
      'views/focus',
      'views/faces',
      'lib/settings',
      'lib/setting'
    ], function(
      App, Camera, ViewfinderController, ViewfinderView,
      FocusView, FacesView, Settings, Setting) {
      self.ViewfinderController = ViewfinderController.ViewfinderController;
      self.ViewfinderView = ViewfinderView;
      self.FocusView = FocusView;
      self.FacesView = FacesView;
      self.Settings = Settings;
      self.Setting = Setting;
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
    this.app.activity = {};
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.grid = sinon.createStubInstance(this.Setting);
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      focus: sinon.createStubInstance(this.FocusView),
      faces: sinon.createStubInstance(this.FacesView)
    };
    this.app.Pinch = sinon.stub();
    this.app.Pinch.prototype.on = sinon.stub();

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

    // Test instance
    this.controller = new this.ViewfinderController(this.app);

    // Shortcuts
    this.viewfinder = this.controller.views.viewfinder;
    this.focusRing = this.controller.views.focus;
    this.faces = this.controller.views.faces;
    this.focus = this.controller.views.focus;
    this.settings = this.app.settings;
    this.camera = this.app.camera;
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('ViewfinderController()', function() {
    test('Should stop the stream when the PreviewGallery is opened', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:opened',
        this.controller.onGalleryOpened));
    });

    test('Should start the stream when the PreviewGallery is closed', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:closed',
        this.controller.onGalleryClosed));
    });

    test('Should stop the stream preview is false', function() {
      assert.isTrue(this.app.on.calledWith('camera:previewactive', this.controller.onPreviewActive));
    });

    test('Should hide the grid when the settings menu opened', function() {
      assert.isTrue(this.app.on.calledWith('settings:opened',
        this.controller.onSettingsOpened));
    });

    test('Should show the grid again when the settings menu is closed', function() {
      assert.isTrue(this.app.on.calledWith('settings:closed',
        this.controller.onSettingsClosed));
    });

    test('Should flash viewfinder shutter when camera shutter fires', function() {
      assert.isTrue(this.app.on.calledWith('camera:shutter', this.viewfinder.shutter));
    });

    test('Should respond to `zoomchanged` event', function() {
      assert.isTrue(this.camera.on.calledWith('zoomchanged'));
    });

    test('Should should set the foucsRing state when focus changes', function() {
      assert.isTrue(this.app.on.calledWith('camera:focusstatechanged', this.focusRing.setFocusState));
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

  suite('ViewfinderController#createViews()', function() {
    setup(function() {
      this.controller.createViews();
    });

    test('It appends views to the viewfinder views', function() {
      assert.isTrue(this.focus.appendTo.calledWith(this.viewfinder.el));
      assert.isTrue(this.faces.appendTo.calledWith(this.viewfinder.el));
      assert.isTrue(this.viewfinder.appendTo.calledWith(this.app.el));
    });
  });

  suite('ViewfinderController#show()', function() {
    setup(function() {
      this.sandbox.stub(window, 'clearTimeout');
      this.sandbox.stub(window, 'setTimeout').returns('<timeout-id>');
      this.app.criticalPathDone = true;
    });

    test('It fades the viewfinder in straight away if the critical path is incomplete', function() {
      this.app.criticalPathDone = false;
      this.controller.show();
      sinon.assert.called(this.viewfinder.fadeIn);
      sinon.assert.notCalled(window.setTimeout);
    });

    test('It fades the viewfinder in after 280ms timeout to avoid flicker', function() {
      this.controller.show();
      sinon.assert.calledWith(window.setTimeout, this.viewfinder.fadeIn, 280);
    });

    test('It clears any existing timeouts to avoid multiple scheduled timeouts', function() {
      this.controller.show();
      this.controller.show();
      sinon.assert.calledWith(window.clearTimeout, '<timeout-id>');
    });
  });

  suite('ViewfinderController#hide()', function() {
    setup(function() {
      this.sandbox.stub(window, 'setTimeout').returns('<timeout-id>');
      this.sandbox.stub(window, 'clearTimeout');
    });

    test('It fades out the viewfinder', function() {
      this.controller.hide();
      sinon.assert.called(this.viewfinder.fadeOut);
    });

    test('It clears any fadeTimeout hanging around', function() {
      this.controller.show();
      this.controller.hide();
      sinon.assert.called(window.clearTimeout, '<timeout-id>');
    });
  });

  suite('ViewfinderController#loadStream()', function() {
    test('Should load preview stream into viewfinder video element', function() {
      var video = this.viewfinder.els.video;
      this.controller.loadStream();
      assert.isTrue(this.camera.loadStreamInto.calledWith(video));
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

  suite('ViewfinderController#onZoomConfigured()', function() {
    setup(function() {
      this.camera.isZoomSupported.returns(true);
      this.settings.zoom.enabled.returns(true);

      this.camera.getMinimumZoom.returns(0);
      this.camera.getMaximumZoom.returns(3);
    });

    test('Should call enableZoom on the viewfinder', function() {
      this.controller.onZoomConfigured();
      assert.isTrue(this.viewfinder.enableZoom.calledWith(0, 3));
    });

    test('Should disable zoom if camera doesn\'t support zoom', function() {
      this.camera.isZoomSupported.returns(false);

      this.controller.onZoomConfigured();
      assert.isTrue(this.viewfinder.disableZoom.called);
    });

    test('Should disable zoom if zoom disabled in settings', function() {
      this.settings.zoom.enabled.returns(false);

      this.controller.onZoomConfigured();
      assert.isTrue(this.viewfinder.disableZoom.called);
    });
  });

  suite('ViewfinderController#onSettingsOpened()', function() {
    setup(function() {
      sinon.spy(this.controller, 'hideGrid');
      this.controller.onSettingsOpened();
    });

    test('Hide grid and hide viewfinder view from the screen reader',
      function() {
        sinon.assert.called(this.controller.hideGrid);
        assert.isTrue(this.viewfinder.set.calledWith('ariaHidden', true));
      });
  });

  suite('ViewfinderController#onSettingsClosed()', function() {
    setup(function() {
      sinon.spy(this.controller, 'configureGrid');
      this.controller.onSettingsClosed();
    });

    test('Configure grid and show viewfinder view to the screen reader',
      function() {
        sinon.assert.called(this.controller.configureGrid);
        assert.isTrue(this.viewfinder.set.calledWith('ariaHidden', false));
      });
  });

  suite('ViewfinderController#onGalleryOpened()', function() {
    setup(function() {
      this.controller.onGalleryOpened();
    });

    test('When gallery is open, the viewfinder view should be disabled and ' +
      'hidden from screen reader', function() {
      sinon.assert.called(this.viewfinder.disable);
      assert.isTrue(this.viewfinder.set.calledWith('ariaHidden', true));
    });
  });

  suite('ViewfinderController#onGalleryClosed()', function() {
    setup(function() {
      this.controller.onGalleryClosed();
    });

    test('When gallery is closed, the viewfinder view should be enabled and ' +
      'visible to screen reader', function() {
      sinon.assert.called(this.viewfinder.enable);
      assert.isTrue(this.viewfinder.set.calledWith('ariaHidden', false));
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

  suite('ViewfinderController#calculateFaceCircle()', function() {
    test('Draw circle from a square', function() {
      var circle = this.controller.calculateFaceCircle({top: 50, left: 50, width: 10, height: 10});
      assert.deepEqual(circle, {x: 50, y: 50, diameter: 10});
    });

    test('Draw circle from a 2:1 rectangle', function() {
      var circle = this.controller.calculateFaceCircle({top: 100, left: 50, width: 20, height: 10});
      assert.deepEqual(circle, {x: 50, y: 95, diameter: 20});
    });

    test('Draw circle from a 1:2 rectangle', function() {
      var circle = this.controller.calculateFaceCircle({top: 100, left: 50, width: 10, height: 20});
      assert.deepEqual(circle, {x: 45, y: 100, diameter: 20});
    });
  });
});
