/*global req*/
'use strict';

suite('controllers/controls', function() {
  var ControlsController;
  var ControlsView;
  var Activity;
  var Camera;
  var App;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'app',
      'camera',
      'controllers/controls',
      'views/Controls',
      'activity'
    ], function(_App, _Camera, _ControlsController, _ControlsView, _Activity) {
      App = _App;
      Camera = _Camera;
      ControlsController = _ControlsController;
      ControlsView = _ControlsView;
      Activity = _Activity;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(App);
    this.app.camera = sinon.createStubInstance(Camera);
    this.app.activity = sinon.createStubInstance(Activity);
    this.app.activity.allowedTypes = {};
    this.app.views = { controls: sinon.createStubInstance(ControlsView) };
  });

  suite('ControlsController()', function() {
    test('Should *not* show the gallery if in \'secureMode\'', function() {
      this.app.inSecureMode = true;
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should *not* show the gallery if in pending activity', function() {
      this.app.activity.active = true;
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should show the gallery if no pending activity' +
         'and not in \'secureMode\'', function() {
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', true));
    });

    test('Should *not* show the cancel button when ' +
         '*not* within a \'pick\' activity', function() {
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within activity', function() {
      this.app.activity.active = true;
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', true));
    });

    test('Should be switchable when no activity is active', function() {
      this.app.activity.active = false;
      this.controller = new ControlsController(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('switchable', true));
    });

    test('Should not be switchable when activity is active and' +
         'only images are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = true;
      this.app.activity.allowedTypes.video = false;
      this.controller = new ControlsController(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });

    test('Should not be switchable when activity is active and' +
         'only videos are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = false;
      this.app.activity.allowedTypes.video = true;
      this.controller = new ControlsController(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });
  });
});
