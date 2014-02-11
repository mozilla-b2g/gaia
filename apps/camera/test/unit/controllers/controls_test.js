/*global req*/
'use strict';

suite('controllers/controls', function() {

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/controls',
      'views/Controls',
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
      .returns([{ key: 'photo' }, { key: 'video' }]);

    // Fake current mode
    this.app.settings.mode.value.returns('photo');
  });

  suite('ControlsController()', function() {
    test('Should *not* show the gallery if in \'secureMode\'', function() {
      this.app.inSecureMode = true;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should *not* show the gallery if in pending activity', function() {
      this.app.activity.active = true;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should show the gallery if no pending activity' +
         'and not in \'secureMode\'', function() {
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', true));
    });

    test('Should *not* show the cancel button when ' +
         '*not* within a \'pick\' activity', function() {
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within activity', function() {
      this.app.activity.active = true;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', true));
    });

    test('Should be switchable when no activity is active', function() {
      this.app.activity.active = false;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('switchable', true));
    });

    test('Should not be switchable when only one mode is available', function() {

      // Fake avaialable modes
      this.app.settings.mode.get
        .withArgs('options')
        .returns([{ key: 'photo' }]);

      this.controller = new this.ControlsController(this.app);

      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });

    test('Should set the mode to the value of the \'mode\' setting', function() {
      var controls = this.app.views.controls;

      // Test 'photo'
      this.app.settings.mode.value.returns('photo');
      this.controller = new this.ControlsController(this.app);
      assert.ok(controls.set.calledWith('mode', 'photo'));
      controls.set.reset();

      // Test 'video'
      this.app.settings.mode.value.returns('video');
      this.controller = new this.ControlsController(this.app);
      assert.ok(controls.set.calledWith('mode', 'video'));
      controls.set.reset();
    });
  });
});
