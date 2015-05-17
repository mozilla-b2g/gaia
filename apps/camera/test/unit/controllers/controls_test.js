
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

    test('Should hide the controls when the timer is started', function() {
      sinon.assert.calledWith(this.app.on, 'timer:started', this.controller.onTimerStarted);
    });

    test('Should restore the controls when the timer is cleared', function() {
      sinon.assert.calledWith(this.app.on, 'timer:cleared', this.controller.onTimerStopped);
      sinon.assert.calledWith(this.app.on, 'timer:ended', this.controller.onTimerStopped);
    });

    test('Should disable the view intitially until camera is ready', function() {
      sinon.assert.called(this.view.disable);
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

  suite('ControlsController#onRecordingChange', function() {
    test('When recording view\'s setCaptureLabel should be called', function() {
      [true, false].forEach(function(recording) {
        this.controller.onRecordingChange(recording);
        assert.isTrue(this.view.setCaptureLabel.calledWith(recording));
      }, this);
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
