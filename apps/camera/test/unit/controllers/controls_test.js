
suite('controllers/controls', function() {
  /*jshint maxlen:false*/
  'use strict';
  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'lib/camera/camera',
      'controllers/controls',
      'views/controls',
      'lib/settings',
      'lib/setting'
    ], function(
    App, Camera, ControlsController, ControlsView, Settings, Setting) {
      self.App = App;
      self.Camera = Camera;
      self.ControlsController = ControlsController.ControlsController;
      self.ControlsView = ControlsView;
      self.Settings = Settings;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.views = { controls: sinon.createStubInstance(this.ControlsView) };
    this.app.activity = { allowedTypes: {} };

    // Fake available modes
    this.app.settings.mode.get
      .withArgs('options')
      .returns([{ key: 'picture' }, { key: 'video' }]);

    // Aliases
    this.controls = this.app.views.controls;
    this.view = this.app.views.controls;
    this.settings = this.app.settings;

    this.controller = new this.ControlsController(this.app);
    this.state = {};
  });

  teardown(function() {
    delete this.controller;
  });

  suite('ControlsController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('localized', this.view.localize));
      assert.ok(this.app.on.calledWith('previewgallery:opened',
        this.view.hide));
      assert.ok(this.app.on.calledWith('previewgallery:closed',
        this.view.show));
    });

    test('Should *not* show the cancel button when *not* within a \'pick\' activity', function() {
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within activity', function() {
      this.app.activity.pick = true;
      this.state.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', true));
    });

    test('It sets the mode to the value of the \'mode\' setting', function() {

      // Test 'picture'
      this.app.settings.mode.selected.returns('picture');
      var controller = new this.ControlsController(this.app);
      sinon.assert.calledWith(this.view.setMode, 'picture');
      this.view.set.reset();

      // Test 'video'
      this.app.settings.mode.selected.returns('video');
      controller = new this.ControlsController(this.app);
      sinon.assert.calledWith(this.view.setMode, 'video');
      this.view.set.reset();
    });

    test('Should call the preview when click on thumbnail', function() {
      assert.ok(this.view.on.calledWith('click:thumbnail'));
    });

    test('Should remove the capture button highlight when shutter fires', function() {
      sinon.assert.calledWith(this.app.on, 'camera:shutter');

      // Call the callback
      this.app.on.withArgs('camera:shutter').args[0][1]();

      sinon.assert.calledWith(this.view.unset, 'capture-active');
    });

    test('Should disable the controls when the camera is busy', function() {
      // Call the callback and check the view was disabled
      this.app.on.withArgs('busy').args[0][1]();
      sinon.assert.called(this.view.disable);
    });

    suite('app.once(\'loaded\')', function() {
      setup(function() {
        // Call the callback
        this.app.once.withArgs('loaded').args[0][1]();
      });

      test('It enables the controls', function() {
        sinon.assert.called(this.view.enable);
      });

      test('It \'restores\' the controls when the camera is \'ready\' from thereon after', function() {
        sinon.assert.calledWith(this.app.on, 'ready', this.controller.restore);
      });
    });

    test('Should hide the controls when the countdown is started', function() {
      sinon.assert.calledWith(
        this.app.on,
        'countdown:started',
        this.controller.onCountdownStarted
      );
    });

    test('Should restore the controls when the countdown is cleared', function() {
      sinon.assert.calledWith(
        this.app.on,
        'countdown:ended',
        this.controller.onCountdownStopped
      );
    });

    test('Should disable the view intitially until camera is ready', function() {
      sinon.assert.called(this.view.disable);
    });

    test('Should listen on click for pause button', function() {
      assert.ok(this.view.on.calledWith('click:pause'));
    });
  });

  suite('Set view screen reader visibility based on settings opened/closed',
    function() {
      test('settings opened -> hide view from screen reader', function() {
        // Check the view is hidden from the screen reader.
        this.app.on.withArgs('settings:opened').args[0][1]();
        sinon.assert.calledWith(this.view.setScreenReaderVisible, false);
      });

      test('settings closed -> show view to screen reader', function() {
        // Check the view is visible to the screen reader.
        this.app.on.withArgs('settings:closed').args[0][1]();
        sinon.assert.calledWith(this.view.setScreenReaderVisible, true);
      });
    });

  suite('ControlsController#configureMode()', function() {
    test('It\'s not switchable when only one mode is available', function() {

      // Fake avaialable modes
      this.app.settings.mode.get
        .withArgs('options')
        .returns([{ key: 'picture' }]);

      this.controller.configureMode();
      assert.isTrue(this.view.disable.calledWith('switch'));
    });
  });

  suite('ControlsController#onCaptureClick', function() {
    setup(function() {
      sinon.spy(this.controller, 'captureHighlightOn');
      this.controller.onCaptureClick();
    });

    test('Should highlight the capture button', function() {
      assert.isTrue(this.controller.captureHighlightOn.calledOnce);
    });

    test('Should fire a \'capture\' event on the app', function() {
      assert.isTrue(this.app.emit.calledWith('capture'));
    });
  });

  suite('ControlsController#onCameraWillChange', function() {
    test('When camera is reconfiguring it suspends the mode switch', function() {
      this.controller.onCameraWillChange();
      assert.isTrue(this.view.suspendModeSwitch.calledWith(true));
    });
  });

  suite('ControlsController#onCameraConfigured', function() {
    test('When camera is configured it unsuspends the mode switch', function() {
      this.controller.onCameraConfigured();
      assert.isTrue(this.view.suspendModeSwitch.calledWith(false));
    });
  });

  suite('ControlsController#onRecordingChange', function() {
    setup(function() {
      sinon.spy(this.controller, 'onRecordingEnd');
    });

    test('Should configure view as recording if state is `started`', function() {
      this.controller.onRecordingChange('started');
      assert.ok(this.view.set.calledWith('recording', true));
      assert.ok(this.view.set.calledWith('pause-active', false));
      assert.ok(this.view.setPauseState.calledWith(false));
      sinon.assert.notCalled(this.controller.onRecordingEnd);
    });

    test('Should configure view as not recording if state is `stopped`', function() {
      this.controller.onRecordingChange('stopped');
      assert.ok(this.view.set.calledWith('recording', false));
      assert.ok(this.view.set.calledWith('pause-active', false));
      assert.ok(this.view.setPauseState.calledWith(false));
      sinon.assert.called(this.controller.onRecordingEnd);
    });

    test('Should highlight pause button if state is `resuming` or `pausing`', function() {
      this.controller.onRecordingChange('resuming');
      assert.ok(this.view.set.calledWith('pause-active', true));
    });

    test('Should configure view as paused if state is `paused`', function() {
      this.controller.onRecordingChange('paused');
      assert.ok(this.view.set.calledWith('pause-active', false));
      assert.ok(this.view.set.calledWith('paused', true));
      assert.ok(this.view.setPauseState.calledWith(true));
    });

    test('Should configure view as resumed if state is `resumed`', function() {
      this.controller.onRecordingChange('resumed');
      assert.ok(this.view.set.calledWith('pause-active', false));
      assert.ok(this.view.set.calledWith('paused', false));
      assert.ok(this.view.setPauseState.calledWith(false));
    });
  });

  suite('ControlsController.onViewModeChanged()', function() {
    test('It switches to the next mode setting', function() {
      this.controller.onViewModeChanged();
      sinon.assert.notCalled(this.view.enable);
      sinon.assert.called(this.settings.mode.next);
    });
  });
});
