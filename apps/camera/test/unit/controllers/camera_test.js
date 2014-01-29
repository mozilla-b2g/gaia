/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/camera', function() {
  var modules = {};
  var Controller;

  suiteSetup(function(done) {

    req([
      'controllers/camera',
      'camera',
      'activity',
      'vendor/view',
      'vendor/evt'
    ], function(controller, Camera, View, activity, evt) {
      Controller = modules.controller = controller;
      modules.activity = activity;
      modules.camera = Camera;
      modules.view = View;
      modules.evt = evt;
      done();
    });
  });

  setup(function() {
    var Activity = modules.activity;
    var Camera = modules.camera;
    var View = modules.view;
    var evt = modules.evt;

    this.sandbox = sinon.sandbox.create();

    // Mock app
    this.app = evt.mix({
      activity: new Activity(),
      camera: new Camera(),
      views: {
        filmstrip: new View(),
        viewfinder: new View()
      }
    });

    this.sandbox.stub(this.app.camera);
    this.app.views.filmstrip.clear = sinon.spy();
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('CameraController()', function() {
    setup(function() {
      sinon.stub(Controller.prototype, 'setupCamera');
      sinon.stub(Controller.prototype, 'teardownCamera');
    });

    teardown(function() {
      Controller.prototype.setupCamera.restore();
      Controller.prototype.teardownCamera.restore();
    });

    test('Should set the capture mode to \'camera\' by default', function() {
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.camera.set.calledWith('mode', 'photo'));
    });

    test('Should set the capture mode to the mode' +
         'specified by the activity if present', function() {
      this.app.activity.mode = 'video';
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.camera.set.calledWith('mode', 'video'));
    });

    test('Should setup camera on app `boot`', function() {
      this.controller = new Controller(this.app);
      this.app.emit('boot');
      assert.isTrue(Controller.prototype.setupCamera.called);
    });

    test('Should setup camera on app `focus`', function() {
      this.controller = new Controller(this.app);
      this.app.emit('focus');
      assert.isTrue(Controller.prototype.setupCamera.called);
    });

    test('Should teardown camera on app `blur`', function() {
      this.controller = new Controller(this.app);
      this.app.emit('blur');
      assert.isTrue(Controller.prototype.teardownCamera.called);
    });
  });
});
