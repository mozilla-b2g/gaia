
suite('controllers/controls', function() {
  /*jshint maxlen:false*/
  'use strict';
  suiteSetup(function(done) {
    var self = this;

    window.req([
      'app',
      'lib/camera/camera',
      'controllers/controls',
      'views/controls',
      'lib/activity',
      'lib/settings',
      'lib/setting'
    ], function(
    App, Camera, ControlsController,
    ControlsView, Activity, Settings, Setting) {
      self.App = App;
      self.Camera = Camera;
      self.ControlsController = ControlsController;
      self.ControlsView = ControlsView;
      self.Activity = Activity;
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
    this.app.activity = sinon.createStubInstance(this.Activity);
    this.app.activity.allowedTypes = {};

    // Fake available modes
    this.app.settings.mode.get
      .withArgs('options')
      .returns([{ key: 'picture' }, { key: 'video' }]);

    // Aliases
    this.controls = this.app.views.controls;
    this.view = this.app.views.controls;

    this.controller = new this.ControlsController(this.app);
  });

  suite('ControlsController()', function() {
    test('Should *not* show the cancel button when *not* within a \'pick\' activity', function() {
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within activity', function() {
      this.app.activity.pick = true;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', true));
    });

    test('Should be switchable when no activity is active', function() {
      this.app.activity.pick = false;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('switchable', true));
    });

    test('Should not be switchable when only one mode is available', function() {

      // Fake avaialable modes
      this.app.settings.mode.get
        .withArgs('options')
        .returns([{ key: 'picture' }]);

      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.view.set.calledWith('switchable', false));
    });

    test('Should set the mode to the value of the \'mode\' setting', function() {

      // Test 'picture'
      this.app.settings.mode.selected.returns('picture');
      this.controller = new this.ControlsController(this.app);
      assert.ok(this.view.set.calledWith('mode', 'picture'));
      this.view.set.reset();

      // Test 'video'
      this.app.settings.mode.selected.returns('video');
      this.controller = new this.ControlsController(this.app);
      assert.ok(this.view.set.calledWith('mode', 'video'));
      this.view.set.reset();
    });

    test('Should call the preview when click on thumbnail', function() {
      assert.ok(this.view.on.calledWith('click:thumbnail'));
    });

    test('Should remove the capture button highlight when shutter fires', function() {
      assert.isTrue(this.app.on.calledWith('camera:shutter', this.controller.captureHighlightOff));
    });

    test('Should disable the controls when the camera is busy', function() {
      assert.isTrue(this.app.on.calledWith('busy', this.view.disable));
    });

    test('Should restore the controls when the camera is \'ready\'', function() {
      assert.isTrue(this.app.on.calledWith('ready', this.controller.restore));
    });

    test('Should hide the controls when the timer is started', function() {
      assert.isTrue(this.app.on.calledWith('timer:started', this.controller.onTimerStarted));
    });

    test('Should restore the controls when the timer is cleared', function() {
      assert.isTrue(this.app.on.calledWith('timer:cleared', this.controller.onTimerStopped));
      assert.isTrue(this.app.on.calledWith('timer:ended', this.controller.onTimerStopped));
    });

    test('Should disable the view intitially until camera is ready', function() {
      sinon.assert.called(this.view.disable);
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
});
