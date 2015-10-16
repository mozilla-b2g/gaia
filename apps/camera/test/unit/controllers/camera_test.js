/*jshint maxlen:false*/

suite('controllers/camera', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'controllers/camera',
      'lib/camera/camera',
      'lib/settings',
      'lib/setting',
      'lib/geo-location'
    ], function(
      App, CameraController, Camera, Settings, Setting, GeoLocation) {
      self.CameraController = CameraController.CameraController;
      self.GeoLocation = GeoLocation;
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
    this.app.views = {
      notification: {
        display: sinon.spy()
      }
    };

    // Activity
    this.app.activity = {};

    this.app.storage = {
      getItem: sinon.stub(),
      setItem: sinon.stub()
    };

    this.app.get.withArgs('batteryStatus').returns('healthy');

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
    this.app.settings.countdown = sinon.createStubInstance(this.Setting);

    // Aliases
    this.settings = this.app.settings;
    this.notification = this.app.views.notification;
    this.storage = this.app.storage;
    this.camera = this.app.camera;

    this.camera.cameraList = ['back', 'front'];

    // Test instance (some tests create there own)
    this.controller = new this.CameraController(this.app);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('CameraController()', function() {
    setup(function() {
      this.sandbox.stub(this.CameraController.prototype, 'shutdownCamera');
    });

    test('Should filter the `cameras` setting based on the camera list', function() {
      sinon.assert.calledWith(this.settings.cameras.filterOptions, this.camera.cameraList);
    });

    test('Should load camera on app `visible`', function() {
      assert.isTrue(this.app.on.calledWith('visible', this.controller.loadCamera));
    });

    test('Should teardown camera on app `hidden`', function() {
      assert.isTrue(this.app.on.calledWith('hidden', this.controller.shutdownCamera));
    });

    test('Should relay focus change events', function() {
      assert.isTrue(this.camera.on.calledWith('change:focus'));
      assert.isTrue(this.app.firer.calledWith('camera:focusstatechanged'));
    });

    test('Should listen to storage:changed', function() {
      assert.isTrue(this.app.on.calledWith('storage:changed'));
    });

    test('Should listen to \'configured\' event', function() {
      assert.isTrue(this.camera.on.calledWith('configured'));
    });

    test('Should listen to the \'activity:pick\' event', function() {
      sinon.assert.calledWith(this.app.on, 'activity:pick');
    });

    test('Should query battery status', function() {
      sinon.assert.calledWith(this.app.get, 'batteryStatus');
      assert.isFalse(this.controller.lowBattery);
    });
  });

  suite('camera.on(\'configured\')', function() {
    test('Should relay via app event', function() {
      sinon.assert.calledWith(this.camera.on, 'configured');
      sinon.assert.calledWith(this.app.firer, 'camera:configured');
    });
  });

  suite('on(\'activity:pick\')', function() {
    setup(function() {
      var spy = this.app.on.withArgs('activity:pick');
      this.callback = spy.args[0][1];

      this.data = { maxFileSizeBytes: 100 };
      this.callback(this.data);
    });

    test('Should set `maxFileSizeBytes` on camera', function() {
      sinon.assert.calledWith(this.camera.set, 'maxFileSizeBytes', 100);
    });

    test('Should disable the camera boot config caching', function() {
      this.camera.cacheConfig = true;
      this.callback({});
      assert.isFalse(this.camera.cacheConfig);
    });
  });

  suite('CameraController#onSettingsConfigured()', function() {
    setup(function() {

      // Mock object that mimicks
      // mozSettings get API. Inside
      // tests set this.mozSettingsGetResult
      // define the result of the mock call.
      navigator.mozSettings = {
        createLock: function() { return this; },
        get: function(key) {
          var mozSettings = this;
          setTimeout(function() {
            var result = {};
            result[key] = 'the-result';
            mozSettings.onsuccess({
              target: {
                result: result
              }
            });
          });
          return this;
        }
      };

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
  });

  suite('CameraController#onRecordingChange', function() {
    test('Should set `recording` to true if started', function() {
      this.controller.onRecordingChange('started');
      assert.ok(this.app.set.calledWith('recording', true));
    });

    test('Should set `recording` to true if stopped', function() {
      this.controller.onRecordingChange('stopped');
      assert.ok(this.app.set.calledWith('recording', false));
    });

    test('Should not set `recording` if starting or stopping', function() {
      var self = this;
      ['error', 'starting', 'stopping'].forEach(function(recording) {
        self.controller.onRecordingChange(recording);
        sinon.assert.notCalled(self.app.set);
      });
    });
  });

  suite('CameraController#onCaptureKey', function() {
    setup(function() {
      this.controller.lowBattery = false;
    });

    test('`keydown:capture` triggers capture', function() {
      var callback = this.app.on.withArgs('keydown:capture').args[0][1];
      var event = { preventDefault: sinon.spy() };

      callback(event);
      sinon.assert.called(this.camera.capture);
    });

    test('It calls preventDefault if the capture call doesn\'t return false', function() {
      var callback = this.app.on.withArgs('keydown:capture').args[0][1];
      var event = { preventDefault: sinon.spy() };

      this.camera.capture.returns(false);
      callback(event);
      sinon.assert.notCalled(event.preventDefault);

      this.camera.capture.returns(undefined);
      callback(event);
      sinon.assert.called(event.preventDefault);
    });

    test('It doesnt capture if countdown is active', function() {
      this.controller.countdown = 999;
      var callback = this.app.on.withArgs('keydown:capture').args[0][1];
      var event = { preventDefault: sinon.spy() };

      callback(event);
      sinon.assert.notCalled(this.camera.capture);
    });

    test('It doesnt capture if confirm overlay is shown', function() {
      this.app.get.withArgs('confirmViewVisible').returns(true);
      var callback = this.app.on.withArgs('keydown:capture').args[0][1];
      var event = { preventDefault: sinon.spy() };

      callback(event);
      sinon.assert.notCalled(this.camera.capture);
    });
  });

  suite('CameraController#onFocusKey', function() {
    setup(function() {
      this.camera.focus = {
        focus: this.sinon.spy()
      };
    });

    test('`keydown:focus` triggers focus', function() {
      var callback = this.app.on.withArgs('keydown:focus').args[0][1];
      var event = { preventDefault: sinon.spy() };

      callback(event);
      sinon.assert.called(this.camera.focus.focus);
    });
  });

  suite('CameraController#setMode()', function() {
    test('It sets the flash mode', function() {
      this.controller.setMode();
      sinon.assert.called(this.notification.display);
      sinon.assert.called(this.camera.setFlashMode);
    });

    test('It emits `camera:willchange` event', function() {
      this.controller.setMode();
      sinon.assert.calledWith(this.app.emit, 'camera:willchange');
    });

    test('It sets the mode once the viewfinder is hidden', function() {
      this.controller.setMode('my-mode');
      sinon.assert.calledWith(this.app.once, 'viewfinder:hidden');

      // call the callback
      this.app.once.withArgs('viewfinder:hidden').args[0][1]();
      sinon.assert.calledWith(this.camera.setMode, 'my-mode');
    });

    test('It doesn\'t set the do anything if the mode didn\'t change', function() {
      this.camera.isMode.returns(true);
      this.controller.setMode('my-mode');
      assert.isFalse(this.app.emit.calledWith('camera:willchange'));
    });
  });

  suite('CameraController#setCamera()', function() {
    test('It emits `camera:willchange` event', function() {
      this.controller.setMode();
      sinon.assert.calledWith(this.app.emit, 'camera:willchange');
    });

    test('It sets the camera once the viewfinder is hidden', function() {
      this.controller.setCamera('back');
      sinon.assert.calledWith(this.app.once, 'viewfinder:hidden');

      // call the callback
      this.app.once.withArgs('viewfinder:hidden').args[0][1]();
      sinon.assert.calledWith(this.camera.setCamera, 'back');
    });
  });

  suite('CameraController#updatePictureSize()', function() {
    setup(function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');

      this.settings.pictureSizes.selected
        .withArgs('data')
        .returns({ width: 400, height: 300 });
    });

    test('It emits `camera:willchange` event', function() {
      this.controller.updatePictureSize();
      sinon.assert.calledWith(this.app.emit, 'camera:willchange');
    });

    test('It sets the camera once the viewfinder is hidden', function() {
      this.controller.updatePictureSize();
      sinon.assert.calledWith(this.app.once, 'viewfinder:hidden');

      // call the callback
      this.app.once.withArgs('viewfinder:hidden').args[0][1]();
      sinon.assert.calledWith(this.camera.setPictureSize, { width: 400, height: 300 });
    });

    test('It doesn\'t proceed if `pictureSize` didn\'t change', function() {
      this.camera.isPictureSize.returns(true);
      this.controller.updatePictureSize();
      assert.isFalse(this.app.emit.calledWith('camera:willchange'));
    });

    suite('`video` mode', function() {
      setup(function() {
        this.settings.mode.selected
          .withArgs('key')
          .returns('video');
      });

      test('It doesn\'t emit `camera:willchange` if in `video` mode', function() {
        this.controller.updatePictureSize();
        assert.isFalse(this.app.emit.calledWith('camera:willchange'));
      });

      test('It calls `camera.setPictureSize`, but doesn\'t reconfigure camera', function() {
        this.controller.updatePictureSize();
        sinon.assert.calledWith(
          this.camera.setPictureSize,
          { width: 400, height: 300 },
          { configure: false }
        );
      });
    });
  });

  suite('CameraController#updateRecorderProfile()', function() {
    setup(function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('video');

      this.settings.recorderProfiles.selected
        .withArgs('key')
        .returns('720p');
    });

    test('It emits `camera:willchange` event', function() {
      this.controller.updateRecorderProfile();
      sinon.assert.calledWith(this.app.emit, 'camera:willchange');
    });

    test('It sets the camera once the viewfinder is hidden', function() {
      this.controller.updateRecorderProfile();
      sinon.assert.calledWith(this.app.once, 'viewfinder:hidden');

      // call the callback
      this.app.once.withArgs('viewfinder:hidden').args[0][1]();
      sinon.assert.calledWith(this.camera.setRecorderProfile, '720p');
    });

    test('It doesn\'t proceed if `recorderProfile` didn\'t change', function() {
      this.camera.isRecorderProfile.returns(true);
      this.controller.updateRecorderProfile();
      assert.isFalse(this.app.emit.calledWith('camera:willchange'));
    });

    suite('`picture` mode', function() {
      setup(function() {
        this.settings.mode.selected
          .withArgs('key')
          .returns('picture');
      });

      test('It doesn\'t emit `camera:willchange` if in `video` mode', function() {
        this.controller.updateRecorderProfile();
        assert.isFalse(this.app.emit.calledWith('camera:willchange'));
      });

      test('It calls `camera.setRecorderProfile`, but doesn\'t reconfigure camera', function() {
        this.controller.updateRecorderProfile();
        sinon.assert.calledWith(
          this.camera.setRecorderProfile,
          '720p',
          { configure: false }
        );
      });
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
    setup(function() {
      this.settings.hdr.selected
        .withArgs('key')
        .returns('on');
    });

    test('Should call camera.setHDR with given value', function() {
      this.controller.setHDR();
      sinon.assert.calledWith(this.camera.setHDR, 'on');
    });

    test('Should not call camera.setHDR if `hdrDisabled`', function() {
      this.controller.hdrDisabled = true;
      this.controller.setHDR();
      sinon.assert.notCalled(this.camera.setHDR);
    });
  });

  suite('CameraController#onFlashModeChange()', function() {
    setup(function() {
      this.settings.hdr.selected
        .withArgs('key')
        .returns('on');
    });

    test('Should change hdr to off if flash is on', function() {
      this.controller.hdrDisabled = false;
      this.controller.onFlashModeChange('on');
      assert.ok(this.settings.hdr.select.calledWith('off'));
    });

    test('Should not change HDR if flash is off', function() {
      this.controller.hdrDisabled = false;
      this.controller.onFlashModeChange('off');
      assert.ok(!this.settings.hdr.select.called);
    });

    test('Should not change HDR if HDR is off', function() {
      this.settings.hdr.selected.withArgs('key').returns('off');
      this.controller.hdrDisabled = true;
      this.controller.onFlashModeChange('auto');
      assert.ok(!this.settings.hdr.select.called);
    });

    test('Should not change HDR if HDR is disabled', function() {
      this.controller.hdrDisabled = true;
      this.controller.onFlashModeChange('auto');
      assert.ok(!this.settings.hdr.select.called);
    });
  });

  suite('CameraController#capture()', function() {
    setup(function() {
      this.controller.galleryOpen = false;
      this.controller.lowBattery = false;
      sinon.spy(this.controller, 'startCountdown');
    });

    test('Should not start countdown if no countdown setting is set', function() {
      this.app.settings.countdown.selected.returns(0);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      sinon.assert.notCalled(this.controller.startCountdown);
    });

    test('Should not start countdown if countdown is already active', function() {
      this.app.settings.countdown.selected.returns(5);
      this.controller.countdown = 999;
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      sinon.assert.notCalled(this.controller.startCountdown);
    });

    test('Should not start countdown if recording', function() {
      this.app.settings.countdown.selected.returns(5);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(true);
      this.controller.capture();
      sinon.assert.notCalled(this.controller.startCountdown);
    });

    test('Should otherwise start countdown', function() {
      this.app.settings.countdown.selected.returns(5);
      this.app.get.withArgs('timerActive').returns(false);
      this.app.get.withArgs('recording').returns(false);
      this.controller.capture();
      sinon.assert.calledOnce(this.controller.startCountdown);
    });

    test('Should pass the current geolocation position', function() {
      this.app.geolocation.position = 123;
      this.controller.capture();
      assert.ok(this.app.camera.capture.args[0][0].position === 123);
    });

    test('Should return false if low battery', function() {
      this.controller.lowBattery = true;
      assert.ok(this.controller.capture() === false);
    });

    test('Should return false if gallery open', function() {
      this.controller.galleryOpen = true;
      assert.ok(this.controller.capture() === false);
    });
  });

  suite('CameraController#onBatteryStatusChange()', function() {
    setup(function() {
      this.controller.loadCamera = sinon.stub();
      sinon.spy(this.controller, 'shutdownCamera');
      this.controller.clearCountdown = sinon.stub();
    });

    test('Should call onBatteryStatuchange on \'change:batteryStatus\'',
      function() {
      this.app.on.calledWith('change:batteryStatus', this.onBatteryStatusChange);
    });

    test('Should load camera on `healthy` status', function() {
      this.controller.onBatteryStatusChange('healthy');
      assert.isTrue(this.controller.loadCamera.called);
    });

    test('Should shutdown camera on `shutdown` status', function() {
      this.controller.onBatteryStatusChange('shutdown');
      assert.isTrue(this.controller.shutdownCamera.called);
    });

    test('Should clear countdown on `shutdown` status', function() {
      this.controller.onBatteryStatusChange('shutdown');
      sinon.assert.calledOnce(this.controller.clearCountdown);
    });

    test('Should prevent capture on low battery', function() {
      this.controller.onBatteryStatusChange('shutdown');
      this.controller.capture();
      assert.isFalse(this.camera.capture.called);

      this.controller.onBatteryStatusChange('healthy');
      this.controller.capture();
      assert.isTrue(this.camera.capture.called);
    });
  });

  suite('CameraController#startCountdown()', function() {
    setup(function() {
      this.app.settings.countdown.selected.withArgs('value').returns(5);
      this.clock = this.sinon.useFakeTimers();
      this.controller.lowBattery = false;
    });

    test('Emits a `countdown:started` event', function() {
      this.controller.startCountdown();
      sinon.assert.calledWith(this.app.emit, 'countdown:started', 5);
    });

    test('Emits a `countdown:tick` event each second', function() {
      this.controller.startCountdown();
      this.clock.tick(1000);
      sinon.assert.calledWith(this.app.emit, 'countdown:tick', 4);
      this.clock.tick(1000);
      sinon.assert.calledWith(this.app.emit, 'countdown:tick', 3);
      this.clock.tick(1000);
      sinon.assert.calledWith(this.app.emit, 'countdown:tick', 2);
      this.clock.tick(1000);
      sinon.assert.calledWith(this.app.emit, 'countdown:tick', 1);
    });

    test('Emits a `countdown:ended` event once it reaches 0', function() {
      this.controller.startCountdown();
      this.clock.tick(5000);
      sinon.assert.calledWith(this.app.emit, 'countdown:ended');
    });

    test('It calls camera.capture once ended', function() {
      this.controller.startCountdown();
      this.clock.tick(5000);
      sinon.assert.calledOnce(this.camera.capture);
    });

    test('It clears the coundown when the app base el is clicked', function() {
      var proto = this.controller.constructor.prototype;
      var clearCountdown = this.sinon.spy(proto, 'clearCountdown');

      this.app.on.reset();

      var controller = new this.CameraController(this.app);
      var callback = this.app.on.withArgs('click').args[0][1];

      controller.startCountdown();
      this.clock.tick(2000);
      callback();

      sinon.assert.calledOnce(clearCountdown);
    });
  });

  suite('CameraController#loadCamera()', function() {
    setup(function() {
      this.app.hidden = false;
      this.app.activity.pick = false;
      this.app.isSharingActivity = sinon.stub();
      this.app.isSharingActivity.returns(false);
      this.app.showSpinner = sinon.stub();
      this.controller.galleryOpen = false;
      this.controller.lowBattery = false;
    });

    test('It doesn\'t load the camera if the battery is low', function() {
      this.controller.lowBattery = true;
      this.controller.loadCamera();
      sinon.assert.notCalled(this.camera.load);
    });

    test('It does load the camera if the battery is not low', function() {
      this.controller.loadCamera();
      sinon.assert.called(this.camera.load);
    });

    test('It doesn\'t load the camera if gallery is open', function() {
      this.controller.galleryOpen = true;
      this.controller.loadCamera();
      sinon.assert.notCalled(this.camera.load);
    });

    test('It does load the camera if gallery is closed', function() {
      this.controller.loadCamera();
      sinon.assert.called(this.camera.load);
    });

    test('It doesn\'t load the camera if app is hidden', function() {
      this.app.hidden = true;
      this.controller.loadCamera();
      sinon.assert.notCalled(this.camera.load);
      sinon.assert.notCalled(this.app.showSpinner);
    });

    test('It does load the camera if app is visible', function() {
      this.controller.loadCamera();
      sinon.assert.called(this.camera.load);
      sinon.assert.notCalled(this.app.showSpinner);
    });

    test('It shows the spinner if loading and requested', function() {
      this.controller.loadCamera(true);
      sinon.assert.called(this.app.showSpinner);
    });
  });

  suite('CameraController#shutdownCamera()', function() {
    setup(function() {
      this.controller.shutdownCamera();
    });

    test('Should stop shutdown the camera', function() {
      assert.isTrue(this.camera.shutdown.called);
    });

  });

  suite('CameraController#onStorageChanged()', function() {
    test('Should stop recording if not available', function() {
      this.controller.onStorageChanged('unavailable');
      assert.isTrue(this.camera.stopRecording.called);
    });

    test('Should not stop recording if available', function() {
      this.controller.onStorageChanged('available');
      assert.isTrue(this.camera.stopRecording.notCalled);
    });
  });

  suite('CameraController#onGalleryOpened()', function() {
    test('Should store gallery open state', function() {
      this.controller.shutdownCamera = sinon.stub();
      this.controller.galleryOpen = false;
      this.controller.onGalleryOpened();
      assert.isTrue(this.controller.galleryOpen);
      sinon.assert.called(this.controller.shutdownCamera);
    });
  });

  suite('CameraController#onGalleryClosed()', function() {
    test('It loads the camera', function() {
      this.controller.loadCamera = sinon.stub();
      this.controller.galleryOpen = true;
      this.controller.onGalleryClosed();
      assert.isFalse(this.controller.galleryOpen);
      sinon.assert.calledWith(this.controller.loadCamera, true);
    });
  });
});
