
suite('controllers/camera', function() {
  'use strict';

  suiteSetup(function(done) {
    var require = window.req;
    var self = this;

    require([
      'app',
      'controllers/camera',
      'lib/camera',
      'lib/activity',
      'vendor/view',
      'lib/settings',
      'lib/setting'
    ], function(
      App, CameraController, Camera, Activity,
      View, Settings, Setting
    ) {
      self.CameraController = CameraController.CameraController;
      self.Activity = Activity;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Camera = Camera;
      self.View = View;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.activity = new this.Activity();
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.geolocation = {};
    this.app.views = {
      filmstrip: sinon.createStubInstance(this.View),
      viewfinder: sinon.createStubInstance(this.View)
    };
    this.app.views.filmstrip.clear = sinon.spy();
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizes = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModes = sinon.createStubInstance(this.Setting);
    this.app.settings.timer = sinon.createStubInstance(this.Setting);
  });

  suite('CameraController()', function() {
    setup(function() {
      sinon.stub(this.CameraController.prototype, 'onBlur');
    });

    teardown(function() {
      this.CameraController.prototype.onBlur.restore();
    });

    test('Should set the capture mode to \'camera\' by default', function() {
      this.app.settings.mode.selected.returns('picture');
      this.controller = new this.CameraController(this.app);
      assert.isTrue(this.app.camera.setMode.calledWith('picture'));
    });

    test('Should setup camera on app `boot`', function() {
      this.controller = new this.CameraController(this.app);
      this.app.on.calledWith('boot', this.app.camera.load);
    });

    test('Should setup camera on app `focus`', function() {
      this.controller = new this.CameraController(this.app);
      this.app.on.calledWith('focus', this.app.camera.load);
    });

    test('Should teardown camera on app `blur`', function() {
      this.controller = new this.CameraController(this.app);
      this.app.on.calledWith('blur', this.controller.onBlur);
    });
  });

  suite('CameraController#capture()', function() {
    setup(function() {
      this.controller = new this.CameraController(this.app);
    });

    test('Should not start countdown if now timer setting is set', function() {
      this.app.settings.timer.selected.returns(0);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      assert.ok(!this.app.emit.calledWith('startcountdown'));
    });

    test('Should not start countdown if timer is already active', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('timerActive').returns(true);
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      assert.ok(!this.app.emit.calledWith('startcountdown'));
    });

    test('Should not start countdown if recording', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(true);
      this.controller.capture();
      assert.ok(!this.app.emit.calledWith('startcountdown'));
    });

    test('Should otherwise start countdown', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      assert.ok(this.app.emit.calledWith('startcountdown'));
    });

    test('Should pass the current geolocation position', function() {
      this.app.geolocation.position = 123;
      this.controller.capture();
      assert.ok(this.app.camera.capture.args[0][0].position === 123);
    });
  });
});
