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
      'lib/setting',
      'lib/storage'
    ], function(
      App, CameraController, Camera, Activity,
      View, Settings, Setting, Storage) {
      self.CameraController = CameraController.CameraController;
      self.Activity = Activity;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Storage = Storage;
      self.Camera = Camera;
      self.View = View;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.activity = new this.Activity();
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.camera = this.app.camera;
    this.app.storage = sinon.createStubInstance(this.Storage);
    this.app.views = {
      filmstrip: sinon.createStubInstance(this.View),
      viewfinder: sinon.createStubInstance(this.View)
    };
    this.app.views.filmstrip.clear = sinon.spy();

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.storage = sinon.createStubInstance(this.Storage);
    this.camera = this.app.camera;
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizes = sinon.createStubInstance(this.Setting);
    this.app.settings.isoModes = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.aliases = sinon.createStubInstance(this.Setting);
    this.app.settings.aliases.flashModes =
      sinon.createStubInstance(this.Setting);
    this.app.settings.flashModes = sinon.createStubInstance(this.Setting);
    this.app.settings.whiteBalance = sinon.createStubInstance(this.Setting);
    this.app.settings.hdr = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModesPicture =
      sinon.createStubInstance(this.Setting);
    this.app.settings.flashModesVideo =
      sinon.createStubInstance(this.Setting);
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

    test('Should set the camera createVideoFilepath method', function() {
      this.controller = new this.CameraController(this.app);
      this.camera.createVideoFilepath = this.app.storage.createVideoFilepath;
    });
  });

  suite('CameraController#onSettingsConfigured()', function() {
    setup(function() {
      this.app.settings.flashModes.selected.returns('on');
      this.app.settings.isoModes.get = sinon.spy();
      this.app.settings.isoModes.selected.returns({key: 'auto'});
      this.app.settings.pictureSizes.selected.returns({ width: 480,
        height: 640 });
      this.app.settings.recorderProfiles.selected.returns('cif');
      this.app.settings.hdr.selected.returns('on');
      var fn = function(variable) {
        var conf = function() {};
        return {configure: conf};
      };
      this.app.camera.setRecorderProfile.returns({setPictureSize: fn});
      this.controller = new this.CameraController(this.app);
    });

    test('Should set flashMode', function() {
      this.controller.onSettingsConfigured();
      assert.ok(this.camera.setFlashMode.called);
    });

    test('Should set hdr', function() {
      this.controller.onSettingsConfigured();
      assert.ok(this.camera.setHDR.calledWith('on'));
    });

    test('Should set recorderProfile', function() {
      this.controller.onSettingsConfigured();
      assert.ok(this.camera.setRecorderProfile.calledWith('cif'));
    });

    test('Should set pictureSize', function(done) {
      var fn = function(pictureSize) {
        var conf = function() {
          done();
        };
        assert.ok(pictureSize.width === 480);
        assert.ok(pictureSize.height === 640);
        return {configure: conf};
      };
      this.app.camera.setRecorderProfile.returns({setPictureSize: fn});
      this.controller.onSettingsConfigured();
    });

    test('Should call camera.configure() camera after setup', function() {
      this.controller.onSettingsConfigured();
      var setMaxFileSize = this.app.storage.setMaxFileSize;
      assert.ok(setMaxFileSize.calledAfter(this.camera.setRecorderProfile));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setFlashMode));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setWhiteBalance));
      assert.ok(setMaxFileSize.calledAfter(this.camera.setHDR));
    });
  });

  suite('CameraController#onFlashModeChange()', function() {
    setup(function() {
      this.controller = new this.CameraController(this.app);
    });

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

  suite('CameraController#onHDRChange()', function() {
    setup(function() {
      this.controller = new this.CameraController(this.app);
    });

    test('Should set flashModesPicture \'off\' when hdr is set to \'on\'', function() {
      var flashModesPicture = this.app.settings.flashModesPicture;

      flashModesPicture.selected.withArgs('key').returns('on');
      this.controller.onHDRChange('on');

      assert.ok(flashModesPicture.select.calledWith('off'));
    });
  });

  suite('CameraController#setHDR()', function() {
    setup(function() {
      this.controller = new this.CameraController(this.app);
    });

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
});
