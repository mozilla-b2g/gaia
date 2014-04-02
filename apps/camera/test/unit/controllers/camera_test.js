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
      'lib/storage',
      'lib/geo-location'
    ], function(
      App, CameraController, Camera, Activity,
      ViewfinderView, Settings, Setting, Storage, GeoLocation) {
      self.CameraController = CameraController.CameraController;
      self.ViewfinderView = ViewfinderView;
      self.GeoLocation = GeoLocation;
      self.Activity = Activity;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Storage = Storage;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.geolocation = sinon.createStubInstance(this.GeoLocation);
    this.app.storage = sinon.createStubInstance(this.Storage);

    // Activity
    this.app.activity = new this.Activity();

    // Views
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView)
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
    this.camera = this.app.camera;

    // Call the callback
    this.viewfinder.fadeOut.callsArg(0);

    // Test instance (some tests create there own)
    this.controller = new this.CameraController(this.app);
  });

  suite('CameraController()', function() {
    setup(function() {
      sinon.stub(this.CameraController.prototype, 'onBlur');
    });

    teardown(function() {
      this.CameraController.prototype.onBlur.restore();
    });

    test('Should set the capture mode to \'picture\' by default', function() {
      this.app.settings.mode.selected.withArgs('key').returns('picture');
      this.controller = new this.CameraController(this.app);

      assert.isTrue(this.app.camera.setMode.called);
    });

    test('Should load camera on app `boot`', function() {
      this.app.on.calledWith('boot', this.app.camera.load);
    });

    test('Should load camera on app `focus`', function() {
      this.app.on.calledWith('focus', this.app.camera.load);
    });

    test('Should teardown camera on app `blur`', function() {
      this.app.on.calledWith('blur', this.controller.onBlur);
    });

    test('Should set the camera createVideoFilepath method', function() {
      assert.equal(this.camera.createVideoFilepath, this.app.storage.createVideoFilepath);
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
      var setMaxFileSize = this.app.storage.setMaxFileSize;

      assert.ok(setMaxFileSize.calledAfter(this.camera.setRecorderProfile));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setFlashMode));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setWhiteBalance));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setHDR));
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

  suite('CameraController#onBlur()', function() {
    test('Should stop recording if recording', function() {
      this.app.get.withArgs('recording').returns(false);
      this.controller.onBlur();
      assert.isFalse(this.camera.stopRecording.called);

      this.app.get.withArgs('recording').returns(true);
      this.controller.onBlur();
      assert.isFalse(this.camera.stopRecording.called);
    });

    test('Should stop viewfinder preview', function() {
      this.controller.onBlur();
      assert.isTrue(this.viewfinder.stopPreview.called);
    });

    test('Should release the camera hardware', function() {
      this.controller.onBlur();
      assert.isTrue(this.camera.release.called);
    });
  });
});
