/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/camera', function() {
  var Controller;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    var self = this;
    this.modules = {};

    req([
      'controllers/camera',
      'camera',
      'activity',
      'vendor/view',
      'vendor/evt'
    ], function(controller, camera, View, activity, evt) {
      Controller = self.modules.controller = controller;
      self.modules.camera = camera;
      self.modules.view = View;
      self.modules.activity = activity;
      self.modules.evt = evt;
      done();
    });
  });

  setup(function() {
    var Activity = this.modules.activity;
    var Camera = this.modules.camera;
    var View = this.modules.view;
    var evt = this.modules.evt;

    // Mock app
    this.app = evt.mix({
      activity: new Activity(),
      camera: new Camera(),
      views: {
        filmstrip: new View(),
        viewfinder: new View()
      }
    });

    sinon.stub(this.app.camera, 'setCaptureMode');
    sinon.stub(this.app.camera, 'getPreferredSizes');
    this.app.views.filmstrip.clear = sinon.spy();
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
      assert.isTrue(this.app.camera.setCaptureMode.calledWith('camera'));
    });

    test('Should set the capture mode to the mode' +
         'specified by the activity if present', function() {
      this.app.activity.mode = 'video';
      this.controller = new Controller(this.app);
      assert.isTrue(this.app.camera.setCaptureMode.calledWith('video'));
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
