/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/controls', function() {
  var Controller;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/controls',
      'vendor/view',
      'activity'
    ], function(controlsController, View, activity) {
      Controller = self.modules.controller = controlsController;
      self.modules.View = View;
      self.modules.activity = activity;
      done();
    });
  });

  setup(function() {
    var View = this.modules.View;
    var Activity = this.modules.activity;

    this.app = {
      camera: {
        on: sinon.spy(),
        state: { on: sinon.spy() },
        get: sinon.stub().withArgs('mode').returns('photo')
      },
      activity: new Activity(),
      views: {
        viewfinder: new View(),
        controls: new View()
      }
    };

    this.app.views.controls.set = sinon.spy();
  });

  suite('ControlsController()', function() {
    test('Should set the mode to the current camera mode', function() {
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('mode', 'photo'));
    });
  });

  suite('ControlsController#setup()', function() {
    test('Should *not* show the gallery if in \'secureMode\'', function() {
      this.app.inSecureMode = true;
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should *not* show the gallery if in pending activity', function() {
      this.app.activity.active = true;
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', false));
    });

    test('Should show the gallery if no pending activity' +
         'and not in \'secureMode\'', function() {
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('gallery', true));
    });

    test('Should *not* show the cancel button when' +
         '*not* within a \'pick\' activity', function() {
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within activity', function() {
      this.app.activity.active = true;
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('cancel', true));
    });

    test('Should be switchable when no activity is active', function() {
      this.app.activity.active = false;
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.views.controls.set.calledWith('switchable', true));
    });

    test('Should not be switchable when activity is active and' +
         'only images are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = true;
      this.app.activity.allowedTypes.video = false;
      this.controller = new Controller(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });

    test('Should not be switchable when activity is active and' +
         'only videos are supported', function() {
      this.app.activity.active = true;
      this.app.activity.allowedTypes.image = false;
      this.app.activity.allowedTypes.video = true;
      this.controller = new Controller(this.app);
      assert.isTrue(
        this.app.views.controls.set.calledWith('switchable', false));
    });
  });
});
