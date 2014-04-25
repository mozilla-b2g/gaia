/*jshint maxlen:false*/

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
      'views/viewfinder',
      'lib/settings',
      'lib/setting',
      'lib/geo-location'
    ], function(
      App, CameraController, Camera, Activity,
      ViewfinderView, Settings, Setting, GeoLocation) {
      self.CameraController = CameraController.CameraController;
      self.ViewfinderView = ViewfinderView;
      self.GeoLocation = GeoLocation;
      self.Activity = Activity;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.geolocation = sinon.createStubInstance(this.GeoLocation);

    // Activity
    this.app.activity = new this.Activity();

    // Views
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView)
    };

    this.app.storage = {
      getItem: sinon.stub(),
      setItem: sinon.stub()
    };

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizes = sinon.createStubInstance(this.Setting);
    this.app.settings.isoModes = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModes = sinon.createStubInstance(this.Setting);
    this.app.settings.whiteBalance = sinon.createStubInstance(this.Setting);
    this.app.settings.hdr = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModesPicture = sinon.createStubInstance(this.Setting);
    this.app.settings.timer = sinon.createStubInstance(this.Setting);

    // Aliases
    this.viewfinder = this.app.views.viewfinder;
    this.settings = this.app.settings;
    this.storage = this.app.storage;
    this.camera = this.app.camera;

    // Call the callback
    this.viewfinder.fadeOut.callsArg(0);

    // Test instance (some tests create there own)
    this.controller = new this.CameraController(this.app);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('CameraController()', function() {
    setup(function() {
      this.sandbox.stub(this.CameraController.prototype, 'onHidden');
    });

    test('Should set the capture mode to \'picture\' by default', function() {
      this.app.settings.mode.selected.withArgs('key').returns('picture');
      this.controller = new this.CameraController(this.app);
      assert.isTrue(this.app.camera.setMode.calledWith('picture'));
    });

    test('Should set the `maxFileSizeBytes` for video recording limits', function() {
      this.app.activity.data.maxFileSizeBytes = 100;
      this.controller = new this.CameraController(this.app);
      assert.isTrue(this.camera.set.calledWith('maxFileSizeBytes', 100));
    });

    test('Should set the `selectedCamera`', function() {
      this.camera.set.reset();
      this.settings.cameras.selected.withArgs('key').returns('back');
      this.controller = new this.CameraController(this.app);
      assert.isTrue(this.camera.set.calledWith('selectedCamera', 'back'));
    });

    test('Should set the `mode`', function() {
      this.camera.setMode.reset();
      this.settings.mode.selected.withArgs('key').returns('video');
      this.controller = new this.CameraController(this.app);
      assert.isTrue(this.camera.setMode.calledWith('video'));
    });

    test('Should load the camera', function() {
      assert.isTrue(this.camera.load.calledOnce);
    });

    test('Should load camera on app `visible`', function() {
      assert.isTrue(this.app.on.calledWith('visible', this.camera.load));
    });

    test('Should teardown camera on app `hidden`', function() {
      assert.isTrue(this.app.on.calledWith('hidden', this.controller.onHidden));
    });

    test('Should relay focus change events', function() {
      assert.isTrue(this.camera.on.calledWith('change:focus'));
      assert.isTrue(this.app.firer.calledWith('camera:focuschanged'));
    });

    test('Should listen to storage:changed', function() {
      assert.isTrue(this.app.on.calledWith('storage:changed'));
    });

    test('Should listen to \'configured\' event', function() {
      assert.isTrue(this.camera.on.calledWith('configured'));
    });

    test('Should disable `cacheConfig` if in activity', function() {
      assert.equal(this.camera.cacheConfig, undefined);

      this.app.activity.pick = true;
      this.controller = new this.CameraController(this.app);

      assert.equal(this.camera.cacheConfig, false);
    });
  });

  suite('camera.on(\'configured\')', function() {
    setup(function() {

      // Get the callback registered
      var spy = this.camera.on.withArgs('configured');
      var callback = spy.args[0][1];

      // Call the callback
      this.config = {};
      callback(this.config);
    });

    test('Should relay via app event', function() {
      assert.isTrue(this.app.emit.calledWith('camera:configured'));
    });
  });

  suite('CameraController#onSettingsConfigured()', function() {
    setup(function() {
      this.app.settings.flashModes.selected.returns('on');
      this.app.settings.isoModes.get = sinon.spy();
      this.app.settings.isoModes.selected.returns({key: 'auto'});
      this.app.settings.pictureSizes.selected.returns({ width: 480, height: 640 });
      this.app.settings.recorderProfiles.selected.returns('cif');
      this.app.settings.hdr.selected.returns('on');

      // Returns `this` to allow chaining
      this.app.camera.setRecorderProfile.returns(this.app.camera);
      this.app.camera.setPictureSize.returns(this.app.camera);
      this.app.camera.configureZoom.returns(this.app.camera);

      this.controller = new this.CameraController(this.app);
      this.controller.onSettingsConfigured();
    });

    test('Should set flashMode', function() {
      assert.ok(this.camera.setFlashMode.called);
    });

    test('Should set hdr', function() {
      assert.ok(this.camera.setHDR.calledWith('on'));
    });

    test('Should set recorderProfile', function() {
      assert.ok(this.camera.setRecorderProfile.calledWith('cif'));
    });

    test('Should set pictureSize', function() {
      var arg = this.app.camera.setPictureSize.args[0][0];

      assert.ok(arg.width === 480);
      assert.ok(arg.height === 640);
    });

    test('Should call `camera.configure()` camera after setup', function() {
      var configure = this.camera.configure;

      assert.ok(configure.calledAfter(this.camera.setRecorderProfile));
      assert.ok(configure.calledAfter(this.camera.setFlashMode));
      assert.ok(configure.calledAfter(this.camera.setWhiteBalance));
      assert.ok(configure.calledAfter(this.camera.setHDR));
    });
  });

  suite('CameraController#onFlashModeChange()', function() {
    test('Should set HDR \'off\' when flash is set to \'on\'', function() {
      this.app.settings.hdr.selected.withArgs('key').returns('on');
      this.controller.onFlashModeChange();
      assert.ok(this.controller.app.settings.hdr.select.calledWith('off'));
    });

    test('Should not do anything if `hdrDisabed`', function() {
      this.controller.hdrDisabled = true;
      this.app.settings.hdr.selected.withArgs('key').returns('on');
      this.controller.onFlashModeChange();
      assert.ok(!this.controller.app.settings.hdr.select.called);
    });
  });

  suite('CameraController#onRecorderProfileChange()', function() {
    test('Should call camera.setRecorderProfile with current key', function() {
      this.controller.onRecorderProfileChange('480p');
      assert.isTrue(this.camera.setRecorderProfile.calledWith('480p'));
    });
  });

  suite('CameraController#setPictureSize()', function() {
    setup(function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');
    });

    test('Should call camera.setPictureSize', function() {
      this.controller.setPictureSize({ width: 4, height: 3 });
      var arg = this.camera.setPictureSize.args[0][0];
      assert.deepEqual(arg, { width: 4, height: 3 });
    });

    test('Should call configure only if in \'picture\' mode', function() {
      this.controller.setPictureSize({});
      assert.isTrue(this.camera.configure.called);

      this.settings.mode.selected
        .withArgs('key')
        .returns('video');

      this.camera.configure.reset();
      this.controller.setPictureSize({});
      assert.isFalse(this.camera.configure.called);
    });

    test('Should call configure after the viewfinder has faded out', function() {
      this.controller.setPictureSize({});
      assert.isTrue(this.camera.configure.calledAfter(this.viewfinder.fadeOut));
    });
  });

  suite('CameraController#setRecorderProfile()', function() {
    setup(function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('video');
    });

    test('Should call configure only if in \'video\' mode', function() {
      this.controller.setRecorderProfile('480p');
      assert.isTrue(this.camera.configure.called);

      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');

      this.camera.configure.reset();
      this.controller.setRecorderProfile('480p');
      assert.isFalse(this.camera.configure.called);
    });

    test('Should call configure after the viewfinder has faded out', function() {
      this.controller.setRecorderProfile('480p');
      assert.isTrue(this.camera.configure.calledAfter(this.viewfinder.fadeOut));
    });
  });

  suite('CameraController#onHDRChange()', function() {
    test('Should set flashModesPicture \'off\' when hdr is set to \'on\'',
      function() {
      var flashModesPicture = this.app.settings.flashModesPicture;

      flashModesPicture.selected.withArgs('key').returns('on');
      this.controller.onHDRChange('on');

      assert.ok(flashModesPicture.select.calledWith('off'));
    });
  });

  suite('CameraController#setHDR()', function() {
    test('Should call camera.setHDR with given value', function() {
      this.controller.setHDR('on');
      assert.isTrue(this.camera.setHDR.calledWith('on'));
    });

    test('Should not call camera.setHDR if `hdrDisabled`', function() {
      this.controller.hdrDisabled = true;
      this.controller.setHDR('on');
      assert.isFalse(this.camera.setHDR.called);
    });
  });

  suite('CameraController#capture()', function() {
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

  suite('CameraController#onBatteryStatusChange()', function() {
    test('Should call onBatteryStatuchange on \'change:batteryStatus\'',
      function() {
      this.app.on.calledWith('change:batteryStatus', this.onBatteryStatusChange);
    });

    test('Should handle the shutDownCamera', function() {
      this.controller.onBatteryStatusChange('healthy');
      assert.isFalse(this.camera.stopRecording.called);

      this.controller.onBatteryStatusChange('shutdown');
      assert.isTrue(this.camera.stopRecording.called);
    });
  });

  suite('CameraController#onHidden()', function() {
    setup(function() {
      this.controller.onHidden();
    });

    test('Should stop recording if recording', function() {
      assert.isTrue(this.camera.stopRecording.called);
    });

    test('Should release the camera hardware', function() {
      assert.isTrue(this.camera.release.called);
    });
  });

  suite('CameraController#onStorageChanged()', function() {
    test('Should stop recording if shared', function() {
      this.controller.onStorageChanged('foo');
      assert.isFalse(this.camera.stopRecording.called);

      this.controller.onStorageChanged('bar');
      assert.isFalse(this.camera.stopRecording.called);

      this.controller.onStorageChanged('shared');
      assert.isTrue(this.camera.stopRecording.called);
    });
  });
});
