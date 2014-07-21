/*jshint maxlen:false*/

suite('controllers/camera', function() {
  'use strict';

  suiteSetup(function(done) {
    var require = window.req;
    var self = this;

    require([
      'app',
      'controllers/camera',
      'lib/camera/camera',
      'views/viewfinder',
      'lib/settings',
      'lib/setting',
      'lib/geo-location'
    ], function(
      App, CameraController, Camera, ViewfinderView,
      Settings, Setting, GeoLocation) {
      self.CameraController = CameraController.CameraController;
      self.ViewfinderView = ViewfinderView;
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

    // Activity
    this.app.activity = {};

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

    this.camera.cameraList = ['back', 'front'];

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

    test('Should filter the `cameras` setting based on the camera list', function() {
      sinon.assert.calledWith(this.settings.cameras.filterOptions, this.camera.cameraList);
    });

    test('Should load camera on app `visible`', function() {
      assert.isTrue(this.app.on.calledWith('visible', this.camera.load));
    });

    test('Should teardown camera on app `hidden`', function() {
      assert.isTrue(this.app.on.calledWith('hidden', this.controller.onHidden));
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

  suite('CameraController#updatePictureSize()', function() {
    setup(function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');

      this.settings.pictureSizes.selected
        .withArgs('data')
        .returns({ width: 400, height: 300 });

      this.viewfinder.fadeOut.callsArg(0);
    });

    test('Should set the camera pictureSize with the current setting', function() {
      this.controller.updatePictureSize();
      var pictureSize = this.camera.setPictureSize.args[0][0];
      assert.deepEqual(pictureSize, { width: 400, height: 300 });
    });

    test('Should fade out the viewfinder first when in video mode', function() {
      this.controller.updatePictureSize();
      assert.isTrue(this.viewfinder.fadeOut.calledBefore(this.camera.setPictureSize));
    });

    test('Should not configure the camera in video mode', function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('video');

      this.controller.updatePictureSize();

      var args = this.camera.setPictureSize.args[0];

      assert.deepEqual(args[0], { width: 400, height: 300 });
      assert.deepEqual(args[1], { configure: false });
    });

     test('Should not fade out viewfinder in video mode', function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('video');

      this.controller.updatePictureSize();
      sinon.assert.notCalled(this.viewfinder.fadeOut);
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

      this.viewfinder.fadeOut.callsArg(0);
    });

    test('Should set the camera recorderProfile with the current setting', function() {
      this.controller.updateRecorderProfile();
      sinon.assert.calledWith(this.camera.setRecorderProfile, '720p');
    });

    test('Should fade out the viewfinder first when in video mode', function() {
      this.controller.updateRecorderProfile();
      assert.isTrue(this.viewfinder.fadeOut.calledBefore(this.camera.setRecorderProfile));
    });

    test('Should not configure the camera in picture mode', function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');

      this.controller.updateRecorderProfile();

      var args = this.camera.setRecorderProfile.args[0];

      assert.equal(args[0], '720p');
      assert.deepEqual(args[1], { configure: false });
    });

     test('Should not fade out viewfinder in picture mode', function() {
      this.settings.mode.selected
        .withArgs('key')
        .returns('picture');

      this.controller.updateRecorderProfile();
      sinon.assert.notCalled(this.viewfinder.fadeOut);
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

  suite('CameraController#onGalleryClosed()', function() {
    test('It loads the camera', function() {
      this.controller.onGalleryClosed();
      sinon.assert.called(this.camera.load);
    });

    test('It clears loading after the camera has loaded', function() {
      this.controller.onGalleryClosed();
      this.camera.load.args[0][0]();
      sinon.assert.called(this.app.onReady);
    });

    test('It doesn\'t load the camera if the app is hidden', function() {
      this.app.hidden = true;
      this.controller.onGalleryClosed();
      sinon.assert.notCalled(this.camera.load);
    });
  });
});
