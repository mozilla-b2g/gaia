suite('controllers/hud', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'controllers/hud',
      'camera',
      'views/hud',
      'views/controls',
      'views/viewfinder'
    ], function(HudController, Camera, HudView, ControlsView, ViewfinderView) {

      self.modules = {
        HudController: HudController,
        Camera: Camera,
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

    // Spys
    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(this.app.camera);
    this.sandbox.stub(this.app.camera.state);
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
      assert.ok(camera.on.calledWith('previewResumed'));
      assert.ok(camera.on.calledWith('preparingToTakePicture'));
      assert.ok(camera.state.on.calledWith('change:recording'));
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
      this.camera.getFlashMode.returns('some-flash-mode');
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
      this.camera.loadStreamInto.callsArg(1);
    });

    test('Should disable controls buttons', function() {
      this.controller.onCameraToggle();
      assert.ok(this.controls.disableButtons.called);
    });

    test('Should enable controls buttons when toggle finished', function() {
      var controls = this.controls;
      this.controller.onCameraToggle();
      assert.ok(controls.enableButtons.calledAfter(controls.disableButtons));
    });

    test('Should disable hud buttons', function() {
      this.controller.onCameraToggle();
      assert.ok(this.hud.disableButtons.called);
    });

    test('Should highlight the camera button while toggling', function() {
      this.controller.onCameraToggle();

      var firstCall = this.hud.highlightCameraButton.getCall(0);
      var secondCall = this.hud.highlightCameraButton.getCall(1);

      assert.ok(firstCall.args[0] === true);
      assert.ok(secondCall.args[0] === false);
    });

    test('Should load the camera stream into' +
         'the viewfinder element', function() {
      this.controller.onCameraToggle();
      assert.ok(this.camera.loadStreamInto.calledWith(this.viewfinder.el));
    });

    test('Should fade the viewfinder out before toggling', function() {
      this.controller.onCameraToggle();
      assert.ok(this.viewfinder.fadeOut.calledBefore(this.camera.toggleCamera));
    });

    test('Should fade the viewfinder back in after the' +
         'new stream has loaded', function() {
      var loadStreamInto = this.camera.loadStreamInto;
      var fadeIn = this.viewfinder.fadeIn;

      this.controller.onCameraToggle();
      assert.ok(fadeIn.calledAfter(loadStreamInto));
    });

    test('Should re-enable hud buttons after new stream loaded', function() {
      var loadStreamInto = this.camera.loadStreamInto;
      var enableButtons = this.hud.enableButtons;

      this.controller.onCameraToggle();
      assert.ok(enableButtons.calledAfter(loadStreamInto));
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
