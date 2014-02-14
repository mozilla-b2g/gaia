suite('controllers/hud', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'camera',
      'controllers/hud',
      'views/hud',
      'views/controls',
      'views/viewfinder'
    ], function(Camera, HudController, HudView, ControlsView, ViewfinderView) {

      self.modules = {
        Camera: Camera,
        HudController: HudController,
        HudView: HudView,
        ControlsView: ControlsView,
        ViewfinderView: ViewfinderView
      };
      done();
    });
  });

  setup(function() {
    var modules = this.modules;
    var HudController = modules.HudController.HudController;

    this.app = {
      camera: new modules.Camera(),
      views: {
        viewfinder: new modules.ViewfinderView(),
        controls: new modules.ControlsView(),
        hud: new modules.HudView()
      }
    };

    // Our test instance
    this.controller = new HudController(this.app);

    // For convenience
    this.hud = this.app.views.hud;
    this.controls = this.app.views.controls;
    this.viewfinder = this.app.views.viewfinder;
    this.camera = this.app.camera;

    // Stub all methods from dependencies
    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(this.app.camera);
    this.sandbox.stub(this.app.views.viewfinder);
    this.sandbox.stub(this.app.views.controls);
    this.sandbox.stub(this.app.views.hud);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('HudController#bindEvents()', function() {
    test('Should listen to the following events', function() {
      var camera = this.app.camera;
      var hud = this.app.views.hud;

      this.controller.bindEvents();

      assert.ok(hud.on.calledWith('flashToggle'));
      assert.ok(hud.on.calledWith('cameraToggle'));
      assert.ok(camera.on.calledWith('configured'));
      assert.ok(camera.on.calledWith('previewresumed'));
      assert.ok(camera.on.calledWith('preparingtotakepicture'));
      assert.ok(camera.on.calledWith('change:recording'));
    });
  });

  suite('HudController#onCameraConfigured()', function() {
    setup(function() {
      this.camera = this.app.camera;
      this.hud = this.app.views.hud;
    });

    test('Should show camera toggle button' +
         'if device has front camera', function() {
      this.camera.hasFrontCamera.returns(true);
      this.controller.onCameraConfigured();
      assert.ok(this.hud.showCameraToggleButton.calledWith(true));
    });

    test('Should set the hud flash mode with' +
         'the current flash mode', function() {
      this.camera.get.withArgs('flash').returns('some-flash-mode');
      this.controller.onCameraConfigured();
      assert.ok(this.hud.setFlashMode.calledWith('some-flash-mode'));
    });
  });

  suite('HudController#onFlashToggle()', function() {
    setup(function() {
      this.camera = this.app.camera;
      this.hud = this.app.views.hud;
    });

    test('Should set the hud flash mode with' +
         'the new camera flash mode', function() {
      this.camera.toggleFlash.returns('new-flash-mode');
      this.controller.onFlashToggle();
      assert.ok(this.hud.setFlashMode.calledWith('new-flash-mode'));
    });
  });

  suite('HudController#onCameraToggle()', function() {
    setup(function() {

      // Call the callbacks
      this.viewfinder.fadeOut.callsArg(0);
    });

    test('Should disable controls buttons', function() {
      this.controller.onCameraToggle();
      assert.ok(this.controls.disableButtons.called);
    });

    test('Should disable hud buttons', function() {
      this.controller.onCameraToggle();
      assert.ok(this.hud.disableButtons.called);
    });

    test('Should highlight the camera button while toggling', function() {
      this.controller.onCameraToggle();
      assert.ok(this.hud.highlightCameraButton.calledWith(true));
    });

    test('Should toggle then load the camera', function() {
      this.controller.onCameraToggle();
      assert.ok(this.camera.toggleCamera.calledBefore(this.camera.load));
    });

    test('Should fade the viewfinder out before toggling', function() {
      this.controller.onCameraToggle();
      assert.ok(this.viewfinder.fadeOut.calledBefore(this.camera.toggleCamera));
    });
  });

  suite('HudController#onStreamLoaded', function() {
    test('Should fade the viewfinder in', function() {
      this.controller.onStreamLoaded();
      assert.ok(this.viewfinder.fadeIn.called);
    });

    test('Should enable the controls buttons', function() {
      this.controller.onStreamLoaded();
      assert.ok(this.controls.enableButtons.called);
    });

    test('Should enable the hud buttons', function() {
      this.controller.onStreamLoaded();
      assert.ok(this.hud.enableButtons.called);
    });

    test('Should un-highlight the camera button', function() {
      this.controller.onStreamLoaded();
      assert.ok(this.hud.highlightCameraButton.calledWith(false));
    });
  });

  suite('HudController#onRecordingChange', function() {
    test('Should disable the hud buttons when recording', function() {
      var toggleDisableButtons = this.hud.toggleDisableButtons;

      this.controller.onRecordingChange(true);
      assert.ok(toggleDisableButtons.lastCall.args[0] === true);
      this.controller.onRecordingChange(false);
      assert.ok(toggleDisableButtons.lastCall.args[0] === false);
    });
  });
});
