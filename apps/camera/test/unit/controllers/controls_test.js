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
      'lib/settings'
    ], function(
    App, Camera, ControlsController,
    ControlsView, Activity, Settings) {
      self.App = App;
      self.Camera = Camera;
      self.ControlsController = ControlsController;
      self.ControlsView = ControlsView;
      self.Activity = Activity;
      self.Settings = Settings;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.views = { controls: sinon.createStubInstance(this.ControlsView) };
    this.app.activity = sinon.createStubInstance(this.Activity);
    this.app.activity.allowedTypes = {};
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

    test('Should not be switchable when activity is active and' +
         'only images are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = true;
      this.app.activity.allowedTypes.video = false;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });

    test('Should not be switchable when activity is active and' +
         'only videos are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = false;
      this.app.activity.allowedTypes.video = true;
      this.controller = new this.ControlsController(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });
  });
});
