/*jshint maxlen:false*/

suite('lib/camera/camera', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['lib/camera/camera'], function(Camera) {
      self.Camera = Camera;
      done();
    });
  });

  setup(function() {
    var mozCameras = {
      getListOfCameras: function() {},
      getCamera: function() {}
    };

    this.videoStorage = {
      get: sinon.stub(),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      delete: sinon.stub()
    };

    if (!navigator.mozCameras) { navigator.mozCameras = mozCameras; }
    if (!navigator.getDeviceStorage) { navigator.getDeviceStorage = function() {}; }

    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(navigator, 'getDeviceStorage').returns(this.videoStorage);
    this.sandbox.stub(navigator.mozCameras);

    navigator.mozCameras.getListOfCameras.returns([]);

    // Fake mozCamera
    this.mozCamera = {
      release: sinon.stub(),
      setConfiguration: sinon.stub(),
      capabilities: {}
    };

    this.options = {
      getVideoMetaData: sinon.stub(),
      storage: {
        setItem: sinon.stub(),
        getItem: sinon.stub()
      }
    };

    // Aliases
    this.storage = this.options.storage;
    this.camera = new this.Camera(this.options);
    this.sandbox.spy(this.camera, 'ready');
    this.sandbox.spy(this.camera, 'emit');
    this.sandbox.spy(this.camera, 'once');
  });

  teardown(function() {
    this.sandbox.restore();
    delete this.camera;
  });

  suite('Camera#startRecording()', function() {
    setup(function() {
      this.options = {
        orientation: {
          get: sinon.stub().returns(0),
          start: sinon.stub(),
          stop: sinon.stub()
        },
        recordSpaceMin: 999,
        recordSpacePadding: 100
      };

      this.camera = new this.Camera(this.options);

      this.camera.mozCamera = {
        startRecording: sinon.stub()
      };

      // Stub all camera methods
      sinon.stub(this.camera);

      // Happy defaults
      this.camera.getFreeVideoStorageSpace.callsArgWith(0, null, 9999);
      this.camera.createVideoFilepath.callsArgWith(0, 'file/path/video.3gp');
      this.camera.get.withArgs('maxFileSizeBytes').returns(0);

      // Unstab the method we are testing
      this.camera.startRecording.restore();
    });

    test('Should emit a \'busy\' event', function() {
      this.camera.startRecording();
      sinon.assert.called(this.camera.busy);
    });

    test('Should error if not enough storage space', function() {
      this.camera.getFreeVideoStorageSpace =
        sinon.stub().callsArgWith(0, null, 9);
      this.camera.startRecording();
      assert.ok(this.camera.onRecordingError.called);
    });

    test('Should get the video filepath from the ' +
      'publicly writable `createVideoFilepath`', function() {
      var custom = sinon.spy();

      this.camera.startRecording();
      assert.ok(this.camera.createVideoFilepath.called);

      this.camera.createVideoFilepath = custom;
      this.camera.startRecording();
      assert.ok(custom.called);
    });

    test('Should call mozCamera.startRecording with the current rotation',
      function() {
      this.camera.orientation.get.returns(90);
      this.camera.startRecording();

      var args = this.camera.mozCamera.startRecording.args[0];
      var config = args[0];

      assert.ok(config.rotation === 90);
    });

    test('Should invert roation for front camera', function() {
      this.camera.selectedCamera = 'front';
      this.camera.orientation.get.returns(90);
      this.camera.startRecording();

      var args = this.camera.mozCamera.startRecording.args[0];
      var config = args[0];

      assert.ok(config.rotation === -90);
    });

    test('Should cap recording size to `maxFileSizeBytes` if set, ' +
      'else uses remaining bytes in storage', function() {
      var maxFileSizeBytes;
      var args;

      this.camera.video.spacePadding = 10;

      // Without `maxFileSizeBytes` set
      this.camera.startRecording();

      args = this.camera.mozCamera.startRecording.args[0];
      maxFileSizeBytes = args[0].maxFileSizeBytes;
      assert.ok(maxFileSizeBytes === (9999 - this.camera.video.spacePadding));
      this.camera.mozCamera.startRecording.reset();

      // With `maxFileSizeBytes` set
      this.camera.get.withArgs('maxFileSizeBytes').returns(99);
      this.camera.startRecording();

      args = this.camera.mozCamera.startRecording.args[0];
      maxFileSizeBytes = args[0].maxFileSizeBytes;
      assert.ok(maxFileSizeBytes === 99);
    });

    test('Should pass the video storage object', function() {
      this.camera.startRecording();
      var args = this.camera.mozCamera.startRecording.args[0];
      var storage = args[1];
      assert.ok(storage === this.camera.video.storage);
    });

    test('Should pass the generated filepath', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, 'dir/my-video.3gp');
      this.camera.startRecording();
      var filepath = this.camera.mozCamera.startRecording.args[0][2];
      assert.ok(filepath === 'dir/my-video.3gp');
    });

    test('Should set the following onSuccess', function() {
      this.camera.mozCamera.startRecording.callsArg(3);
      this.camera.startRecording();
      assert.ok(this.camera.set.calledWith('recording', true));
      assert.ok(this.camera.startVideoTimer.called);
      sinon.assert.called(this.camera.ready);
    });

    test('Should call onRecordingError on error', function() {
      this.camera.mozCamera.startRecording.callsArg(4);
      this.camera.startRecording();
      assert.ok(this.camera.onRecordingError.called);
    });
  });

  suite('Camera#stopRecording()', function() {
    setup(function() {
      sinon.stub(this.camera, 'get');
      sinon.stub(this.camera, 'set');
      sinon.stub(this.camera, 'stopVideoTimer');
      sinon.stub(this.camera, 'onRecordingError');
      sinon.stub(this.camera, 'onNewVideo');
      this.camera.get.withArgs('recording').returns(true);

      this.camera.mozCamera = {
        stopRecording: sinon.stub()
      };
    });

    test('Should not do anything if camera is not recording', function() {
      this.camera.get.withArgs('recording').returns(false);
      this.camera.stopRecording();
      sinon.assert.notCalled(this.camera.mozCamera.stopRecording);
    });

    test('Should indicate busy', function() {
      this.camera.stopRecording();
      sinon.assert.calledWith(this.camera.emit, 'busy');
    });

    test('Should stop timer counting', function() {
      this.camera.stopRecording();
      sinon.assert.called(this.camera.stopVideoTimer);
    });

    test('Should call `mozCamera.stopRecording`', function() {
      this.camera.stopRecording();
      sinon.assert.called(this.camera.mozCamera.stopRecording);
    });

    test('Should set `recording` flag to `false`', function() {
      this.camera.stopRecording();
      sinon.assert.called(this.camera.set, 'recording', false);
    });

    suite('onStorageChange', function() {
      setup(function() {
        this.req = {};
        this.videoStorage.get.returns(this.req);
        this.camera.video.filepath = 'foo/bar/baz.3gp';
        this.camera.stopRecording();
        this.callback = this.videoStorage.addEventListener.args[0][1];
        this.callback({
          reason: 'modified',
          path: '/absolute/path/foo/bar/baz.3gp'
        });
      });

      test('Should get videoBlob if storage change event refers to recorded video', function() {
        sinon.assert.called(this.videoStorage.get);
        this.videoStorage.get.reset();

        this.callback({
          reason: 'modified',
          path: 'boop/beep/bop.3pg'
        });

        sinon.assert.notCalled(this.videoStorage.get);
        this.videoStorage.get.reset();

        this.callback({
          reason: 'something else',
          path: 'foo/bar/baz.3gp'
        });

        sinon.assert.notCalled(this.videoStorage.get);
      });

      test('Should removeEventListener', function() {
        sinon.assert.called(this.videoStorage.removeEventListener);
      });

      test('Should call `onNewVideo` on success', function() {
        this.req.result = '<blob>';
        this.req.onsuccess();

        var arg = this.camera.onNewVideo.args[0][0];

        assert.deepEqual(arg, {
          blob: '<blob>',
          filepath: 'foo/bar/baz.3gp'
        });
      });

      test('Should call `camera.onRecordingError` on error', function() {
        this.req.onerror();
        sinon.assert.called(this.camera.onRecordingError);
      });
    });
  });

  suite('Camera#onNewVideo()', function() {
    setup(function() {
      sinon.stub(this.camera, 'get');
      sinon.stub(this.camera, 'onRecordingError');
      this.camera.get.withArgs('videoElapsed').returns(2000);
      this.camera.minRecordingTime = 1000;
      this.video = {
        blob: '<blob>',
        filepath: 'video.3gp'
      };
    });

    test('Should delete new videos that are too short', function() {

      // Not too short
      this.camera.onNewVideo(this.video);
      sinon.assert.notCalled(this.videoStorage.delete);
      this.camera.ready.reset();

      // Too short
      this.camera.get.withArgs('videoElapsed').returns(999);
      this.camera.onNewVideo(this.video);
      sinon.assert.called(this.videoStorage.delete);
      sinon.assert.called(this.camera.ready);
    });

    suite('getVideoMetaData', function() {
      setup(function() {
        this.camera.onNewVideo(this.video);
        this.callback = this.camera.getVideoMetaData.args[0][1];
      });

      test('Should be called with the Blob', function() {
        sinon.assert.calledWith(this.camera.getVideoMetaData, '<blob>');
      });

      test('Should emit a \'newvideo\' event including the addtional metadata', function() {
        this.callback(null, {
          poster: '<poster>',
          width: '<width>',
          height: '<height>',
          rotation: '<rotation>'
        });

        var data = this.camera.emit.withArgs('newvideo').args[0][1];

        assert.deepEqual(data, {
          blob: '<blob>',
          filepath: 'video.3gp',
          poster: '<poster>',
          width: '<width>',
          height: '<height>',
          rotation: '<rotation>'
        });
      });

      test('Should emit indicate \'ready\' on completion', function() {
        this.callback(null, {});
        sinon.assert.called(this.camera.ready);
      });

      test('Should call `onRecordingError` if it errors', function() {
        this.callback('an error');
        sinon.assert.called(this.camera.onRecordingError);
      });

      test('Should not emit \'newvideo\' if it errors', function() {
        this.callback('an error');
        assert.isFalse(this.camera.emit.calledWith('newvideo'));
      });
    });
  });

  suite('Camera#setISOMode()', function() {
    setup(function() {
      this.camera = {
        mozCamera: {
          capabilities: {
            isoModes: ['auto', 'hjr', '100', '200', '400', '800', '1600']
          },
          isoMode: null
        },
        setISOMode: this.Camera.prototype.setISOMode
      };
    });

    test('Should set the `isoMode` property to "auto"', function() {
      var isoMode = 'auto';
      this.camera.setISOMode(isoMode);

      assert.ok(this.camera.mozCamera.isoMode === isoMode);
    });

    test('Should *NOT* set the `isoMode` property to "invalid"', function() {
      var isoMode = 'invalid';
      this.camera.setISOMode(isoMode);

      assert.ok(this.camera.mozCamera.isoMode !== isoMode);
    });
  });

  suite('Camera#setWhiteBalance()', function() {
    setup(function() {
      this.camera = {
        mozCamera: {
          capabilities: {
            whiteBalanceModes: ['auto', 'cloudy', 'sunny', 'incandescen']
          },
          whiteBalanceMode: null
        },
        setWhiteBalance: this.Camera.prototype.setWhiteBalance
      };
    });

    test('Should set the setWhiteBalance property to "auto"', function() {
      var whiteBalanceMode = 'auto';
      this.camera.setWhiteBalance(whiteBalanceMode);

      assert.equal(this.camera.mozCamera.whiteBalanceMode, whiteBalanceMode);
    });

    test('Should *NOT* set the setWhiteBalance property to "invalid"',
      function() {
      var whiteBalanceMode = 'invalid';
      this.camera.setWhiteBalance(whiteBalanceMode);

      assert.ok(this.camera.mozCamera.whiteBalanceMode !== whiteBalanceMode);
    });
  });

  suite('Camera#setSceneMode()', function() {
    setup(function() {
      this.camera = {
        mozCamera: {
          capabilities: {
            sceneModes: ['auto', 'hdr']
          },
          sceneMode: null
        },
        setSceneMode: this.Camera.prototype.setSceneMode,
        setHDR: this.Camera.prototype.setHDR,
        get: function() {}
      };

      this.sandbox.stub(this.camera, 'get', function() {
        return {sceneModes: ['auto', 'hdr']};
      });
    });

    test('should set the scene mode value parameter to hdr', function() {
      this.camera.setSceneMode('hdr');
      assert.equal(this.camera.mozCamera.sceneMode, 'hdr');
    });

    test('should set the scene mode value parameter to auto', function() {
      this.camera.setSceneMode('auto');
      assert.equal(this.camera.mozCamera.sceneMode, 'auto');
    });
  });

  suite('Camera#setHDRMode()', function() {
    setup(function() {
      this.camera = {
        mozCamera: {
          capabilities: {
            sceneModes: ['auto', 'hdr']
          },
          sceneMode: null
        },
        setSceneMode: this.Camera.prototype.setSceneMode,
        setHDR: this.Camera.prototype.setHDR,
        get: function() {}
      };

      this.sandbox.stub(this.camera, 'get', function() {
        return {sceneModes: ['auto', 'hdr']};
      });
    });

    test('Test for HDRMode method called with value "on"', function() {
      this.camera.setSceneMode = sinon.spy();
      this.camera.setHDR('on');
      assert.isTrue(this.camera.setSceneMode.calledWith('hdr'));
    });

    test('Test for HDRMode method called with value "off"', function() {
      this.camera.setSceneMode = sinon.spy();
      this.camera.setHDR('off');
      assert.isTrue(this.camera.setSceneMode.calledWith('auto'));
    });
  });

  suite('Camera#takePicture()', function() {
    setup(function() {
      this.camera = new this.Camera();
      this.camera.focus = {
        resume: function() {},
        focus: sinon.stub().callsArg(0),
        getMode: sinon.spy()
      };

      sinon.stub(this.camera, 'set');
      this.camera.mozCamera = {
        takePicture: sinon.stub().callsArgWith(1, 'the-blob'),
        resumePreview: sinon.stub()
      };
    });

    test('Should emit a `busy` when picture taking starts', function() {
      sinon.stub(this.camera, 'emit');
      this.camera.takePicture({});
      assert.isTrue(this.camera.emit.calledWith('busy'));
    });

    test('Should call `mozCamera.takePicture`', function() {
      this.camera.takePicture({});
      assert.isTrue(this.camera.mozCamera.takePicture.called);
    });

    test('Should emit a `busy` event with `takingPicture` type after focus', function() {
      sinon.stub(this.camera, 'emit');
      this.camera.takePicture({});
      var busyTakingPicture = this.camera.emit.withArgs('busy', 'takingPicture');
      sinon.assert.called(busyTakingPicture);
      assert.isTrue(busyTakingPicture.calledAfter(this.camera.focus.getMode));
    });

    test('Should still take picture even when focus fails', function() {
      this.camera.focus.focus = sinon.stub().callsArgWith(0, 'some error');
      this.camera.takePicture({});
      assert.isTrue(this.camera.mozCamera.takePicture.called);
    });

    test('Should pass the position value to `mozCamera.takePicture`', function() {
      this.camera.takePicture({ position: 123 });
      var config = this.camera.mozCamera.takePicture.args[0][0];
      assert.equal(config.position, 123);
    });

    test('Should take jpegs', function() {
      this.camera.takePicture({});
      var config = this.camera.mozCamera.takePicture.args[0][0];
      assert.equal(config.fileFormat, 'jpeg');
    });

    test('Should pass the current `pictureSize`', function() {
      this.camera.pictureSize = { width: 400, height: 300 };
      this.camera.takePicture({});
      var config = this.camera.mozCamera.takePicture.args[0][0];
      assert.equal(config.pictureSize.width, 400);
      assert.equal(config.pictureSize.height, 300);
    });

    test('Should emit a `newimage` event passing the blob', function() {
      var spy = sinon.spy();
      this.camera.on('newimage', spy);
      this.camera.takePicture({});
      var arg = spy.args[0][0];
      assert.equal(arg.blob, 'the-blob');
    });

    test('Should set focus back to none', function() {
      this.camera.takePicture({});
      assert.isTrue(this.camera.set.calledWith('focus', 'none'));
    });

    test('Should emit a `ready` event once done', function() {
      var busy = sinon.spy();
      var ready = sinon.spy();

      this.camera.on('busy', busy);
      this.camera.on('ready', ready);
      this.camera.takePicture({});

      assert.isTrue(busy.calledBefore(ready));
    });

    test('Should call `mozCamera.resumePreview` after `takePicture`', function() {
      var takePicture = this.camera.mozCamera.takePicture;
      var resumePreview = this.camera.mozCamera.resumePreview;

      this.camera.takePicture({});
      assert.isTrue(takePicture.calledBefore(resumePreview));
    });
  });

  suite('Camera#onPreviewStateChange()', function() {
    setup(function() {
      this.camera = new this.Camera();
      sinon.stub(this.camera, 'emit');
    });

    test('Should fire \'busy\' event if \'stopped\' or \'paused\'', function() {
      this.camera.onPreviewStateChange('stopped');
      assert.ok(this.camera.emit.calledWith('busy'));
      this.camera.emit.reset();

      this.camera.onPreviewStateChange('paused');
      assert.ok(this.camera.emit.calledWith('busy'));
    });

    test('Should not fire \'ready\' event for all other states', function() {
      this.camera.onPreviewStateChange('something else');
      assert.ok(this.camera.emit.calledWith('ready'));
      this.camera.emit.reset();

      this.camera.onPreviewStateChange('other');
      assert.ok(this.camera.emit.calledWith('ready'));
    });
  });

  suite('Camera#load()', function() {
    setup(function() {
      var self = this;

      sinon.stub(this.camera, 'release').callsArg(0);
      sinon.stub(this.camera, 'setupNewCamera');

      this.sandbox.stub(this.camera, 'requestCamera', function(camera, config) {
        self.camera.mozCamera = self.mozCamera;
      });

      this.camera.isFirstLoad = false;
    });

    test('Should run first load if this is the first load', function() {
      var camera = new this.Camera(this.options);
      this.sandbox.stub(camera, 'firstLoad');

      camera.load();

      sinon.assert.calledOnce(camera.firstLoad);
    });

    test('Should not request camera until camera has finished releasing', function() {
      this.camera.releasing = true;
      this.camera.load();

      assert.isFalse(this.camera.requestCamera.called);

      this.camera.releasing = false;
      this.camera.fire('released');

      assert.isTrue(this.camera.requestCamera.called);
    });

    test('Should `requestCamera` first time called', function() {
      this.camera.load();
      assert.isTrue(this.camera.requestCamera.called);
      assert.isFalse(this.camera.release.called);
    });

    test('Should `release` camera then `request` if selectedCamera changed', function() {
      var requestCamera = this.camera.requestCamera;
      var release = this.camera.release;

      this.camera.load();
      this.camera.selectedCamera = 'front';
      this.camera.requestCamera.reset();

      this.camera.load();
      assert.isTrue(release.calledBefore(requestCamera));
      assert.isTrue(requestCamera.calledOnce);
    });

    test('Should clear the previous `mozCameraConfig` if the `selectedCamera` changed', function() {
      this.camera.load();
      this.camera.selectedCamera = 'front';
      this.camera.requestCamera.reset();

      this.camera.mozCameraConfig = '<moz-camera-config>';

      this.camera.load();
      assert.equal(this.camera.mozCameraConfig, null);
      sinon.assert.calledWith(this.camera.requestCamera, 'front', null);
    });

    test('Should just `setupNewCamera` if selected camera has\'t changed', function() {
      this.camera.load();
      this.camera.requestCamera.reset();

      this.camera.load();
      assert.isTrue(this.camera.setupNewCamera.called);
      assert.isFalse(this.camera.requestCamera.called);
    });

    test('Should call requestCamera with selectedCamera and mozCameraConfig', function() {

      this.camera.mozCameraConfig = '<moz-camera-config>';
      this.camera.selectedCamera = '<selected-camera>';
      this.camera.load();

      sinon.assert.calledWith(
        this.camera.requestCamera,
        '<selected-camera>',
        '<moz-camera-config>'
      );
    });
  });

  suite('Camera#requestCamera()', function() {
    setup(function() {
      this.sandbox.stub(this.camera, 'setupNewCamera');
      this.sandbox.stub(this.camera, 'configureFocus');
      navigator.mozCameras.getCamera.callsArgWith(2, this.mozCamera);
      this.camera.mozCamera = this.mozCamera;
      this.camera.selectedCamera = 'back';
    });

    test('Should emit a \'busy\', then \'ready\' event', function() {
      navigator.mozCameras.getCamera.callsArgWith(2, this.mozCamera);
      this.camera.requestCamera();

      var busy = this.camera.emit.withArgs('busy');
      var ready = this.camera.emit.withArgs('ready');

      assert.isTrue(busy.calledBefore(ready));
    });

    test('Should call `navigator.mozCameras.getCamera()` with currently selected camera', function() {
      this.camera.requestCamera('back');
      assert.isTrue(navigator.mozCameras.getCamera.calledWith('back'));
      navigator.mozCameras.getCamera.reset();

      this.camera.requestCamera('front');
      assert.isTrue(navigator.mozCameras.getCamera.calledWith('front'));
    });

    test('Should call get camera with the passed config', function() {
      this.mozCameraConfig = {};
      this.camera.requestCamera('back', this.mozCameraConfig);
      assert.isTrue(navigator.mozCameras.getCamera.calledWith('back', this.mozCameraConfig));
    });

    test('Should flag a `this.configured` if a config was given', function() {
      this.camera.requestCamera('back', { some: 'config' });
      assert.isTrue(this.camera.configured);

      this.camera.requestCamera();
      assert.isFalse(this.camera.configured);
    });

    test('Should call .setupNewCamera', function() {
      var callback = sinon.spy();
      this.camera.requestCamera({}, callback);
      assert.isTrue(this.camera.setupNewCamera.calledWith(this.mozCamera));
    });

    test('Should not configure camera on error', function() {
      navigator.mozCameras.getCamera.callsArgWith(3, 'error');
      this.camera.requestCamera();
      assert.isFalse(this.camera.setupNewCamera.called);
    });

    test('Should emit a \'configured\' if the camera was loaded with a config', function() {
      this.camera.requestCamera('back', { some: 'config' });
      sinon.assert.calledWith(this.camera.emit, 'configured');
    });
  });

  suite('Camera#configure()', function() {
    setup(function() {
      this.camera.mode = 'picture';
      this.camera.mozCamera = this.mozCamera;
      this.camera.recorderProfile = '720p';
      this.mozCamera.setConfiguration.callsArg(1);
      this.camera.focus = {
        configure: sinon.stub(),
        resume: sinon.stub()
      };
      this.sandbox.stub(this.camera, 'previewSize');
      this.sandbox.spy(this.camera, 'saveBootConfig');
      this.camera.previewSize.returns({ width: 400, height: 300 });
      this.clock = sinon.useFakeTimers();
    });

    teardown(function() {
      this.clock.restore();
    });

    test('Should call `mozCamera.setConfiguration` with expected config', function() {
      this.camera.configure();
      this.clock.tick(1);

      var config = this.mozCamera.setConfiguration.args[0][0];

      assert.deepEqual(config, {
        mode: 'picture',
        previewSize: { width: 400, height: 300 },
        recorderProfile: '720p'
      });
    });

    test('Should emit a \'configured\' event', function() {
      this.camera.configure();
      this.clock.tick(1);
      assert.isTrue(this.camera.emit.calledWith('configured'));
    });

    test('Should call `saveBootConfig`', function() {
      this.camera.configure();
      this.clock.tick(1);

      assert.isTrue(this.camera.saveBootConfig.called);
    });

    test('Should not configure if there is no mozCamera', function() {
      delete this.camera.mozCamera;
      this.camera.configure();
      this.clock.tick(1);

      assert.isFalse(this.mozCamera.setConfiguration.called);
    });

    test('Should flag dirty configuration', function() {

      // Make sure the callback isn't called
      this.mozCamera.setConfiguration = sinon.stub();

      this.camera.configure();
      this.clock.tick(1);

      assert.isFalse(this.camera.configured);
    });

    test('Should flag clean configuration once complete', function(done) {
      var self = this;

      this.mozCamera.setConfiguration = sinon.stub();

      // Clean once configured
      this.camera.on('configured', function() {
        assert.isTrue(self.camera.configured);
        done();
      });

      // Call the function 'ticking'
      // past the debounce
      this.camera.configure();
      this.clock.tick(1);

      // Dirty while configuring
      assert.isFalse(this.camera.configured);

      // Find the callback and call it
      var callback = this.mozCamera.setConfiguration.args[0][1];
      callback();
    });

    test('Should defer calls until camera is \'ready\'', function() {
      this.camera.isBusy = true;

      this.camera.configure();
      this.clock.tick(1);

      sinon.assert.notCalled(this.mozCamera.setConfiguration);

      this.camera.ready();
      this.clock.tick(1);

      sinon.assert.called(this.mozCamera.setConfiguration);
      sinon.assert.calledWith(this.camera.emit, 'configured');
    });

    test('Should \'debounce\' calls so only ever run onces per turn', function() {
      this.camera.configure();
      this.camera.configure();
      this.camera.configure();
      this.camera.configure();
      this.camera.configure();
      this.camera.configure();

      this.clock.tick(10);

      sinon.assert.calledOnce(this.mozCamera.setConfiguration);
    });

    test('Should flag as busy, then ready', function() {
      var self = this;

      // Use async for this case
      this.mozCamera.setConfiguration = sinon.stub();

      // Call and 'tick' past the debouce
      this.camera.configure();
      this.clock.tick(1);

      // 'busy' while configuring
      assert.isTrue(this.camera.isBusy);
      sinon.assert.calledWith(this.camera.emit, 'busy');

      var onSuccess = this.mozCamera.setConfiguration.args[0][1];

      // Manually call the callback
      onSuccess();

      assert.isFalse(self.camera.isBusy);
      sinon.assert.calledWith(self.camera.emit, 'ready');
    });

    test('Should abort if `mozCamera` has since been released', function() {
      this.mozCamera.setConfiguration = sinon.stub();
      this.camera.configure();
      this.clock.tick(1);

      var onSuccess = this.mozCamera.setConfiguration.args[0][1];


      onSuccess();

      sinon.assert.calledWith(this.camera.emit, 'configured');
      this.camera.emit.reset();
      this.mozCamera = null;

      assert.isFalse(this.camera.emit.calledWith('configured'));
    });
  });

  suite('Camera#release()', function() {
    setup(function() {
      this.mozCamera.release.callsArgAsync(0);
      this.camera.mozCamera = this.mozCamera;
    });

    test('Should flag as `releasing` until released', function(done) {
      var self = this;

      this.camera.release(function() {
        assert.isFalse(self.camera.releasing);
        done();
      });

      assert.isTrue(this.camera.releasing);
    });

    test('Should call the callback', function(done) {
      this.camera.release(done);
    });

    test('Should emit \'released\' event', function(done) {
      var self = this;
      this.camera.release(function() {
        assert.isTrue(self.camera.emit.called);
        done();
      });
    });

    test('Should call the callback with an error argument', function(done) {
      this.mozCamera.release = sinon.stub();
      this.mozCamera.release.callsArgWithAsync(1, 'error');

      this.camera.release(function(err) {
        assert.equal(err, 'error');
        done();
      });
    });
  });

  suite('Camera#firstLoad()', function() {
    setup(function() {
      this.bootConfig = {
        mozCameraConfig: {},
        recorderProfile: '720p',
        pictureSize: { width: 400, height: 300 }
      };

      sinon.stub(this.camera, 'requestCamera');
      sinon.stub(this.camera, 'fetchBootConfig')
        .returns(this.bootConfig);

    });

    test('Should fetch the boot config from storage', function() {
      this.camera.firstLoad();
      sinon.assert.called(this.camera.fetchBootConfig);
    });

    test('Should store the fetched `mozCameraConfig` in memory', function() {
      this.camera.firstLoad();
      assert.equal(this.camera.mozCameraConfig, this.bootConfig.mozCameraConfig);
    });

    test('Should set the pictureSize and recorderProfile once we have the camera', function() {
      sinon.stub(this.camera, 'setRecorderProfile');
      sinon.stub(this.camera, 'setPictureSize');

      this.camera.firstLoad();

      var onOnceNewCamera = this.camera.once.withArgs('newcamera').args[0][1];

      onOnceNewCamera();

      var setRecorderProfile = this.camera.setRecorderProfile.args[0];
      var setPictureSize = this.camera.setPictureSize.args[0];

      // SHould set each without configuring
      assert.equal(setRecorderProfile[0], this.bootConfig.recorderProfile);
      assert.deepEqual(setRecorderProfile[1], { configure: false });
      assert.equal(setPictureSize[0], this.bootConfig.pictureSize);
      assert.deepEqual(setPictureSize[1], { configure: false });
    });
  });

  suite('Camera#fetchBootConfig()', function() {
    setup(function() {
      this.storage.getItem
        .withArgs('cameraBootConfig')
        .returns('{"mozCameraConfig":{},"pictureSize":{},"recorderProfile":"720p"}');
    });

    test('Should return the object from storage', function() {
      var result = this.camera.fetchBootConfig();
      assert.deepEqual(result, {
        mozCameraConfig: {},
        pictureSize: {},
        recorderProfile: '720p'
      });
    });
  });

  suite('Camera#configureFocus()', function() {
    setup(function() {
      this.camera = new this.Camera();
      this.focus = {
        configure: function() {}
      };
      this.camera.focus = this.focus;
      sinon.stub(this.focus, 'configure');
    });

    test('Should set the focus state to the passed value', function() {
      this.camera.configureFocus();
      assert.ok(this.focus.configure.called);
      assert.ok(this.focus.onFacesDetected === this.camera.onFacesDetected);
      assert.ok(this.focus.onAutoFocusChanged === this.camera.onAutoFocusChanged);
    });
  });

  suite('Camera#onAutoFocusChanged()', function() {
    setup(function() {
      this.camera = new this.Camera();
      sinon.stub(this.camera, 'set');
    });

    test('Should set the focus state to the passed value', function() {
      this.camera.onAutoFocusChanged('autofocus');
      assert.ok(this.camera.set.calledWith('focus', 'autofocus'));
    });
  });

  suite('Camera#saveBootConfig()', function() {
    setup(function() {
      this.options.cacheConfig = true;
      this.camera = new this.Camera(this.options);
    });

    test('Should store the `picutureSize` and `mozCameraConfig`', function() {
      this.camera.pictureSize = '<picture-size>';
      this.camera.recorderProfile = '<recorder-profile>';
      this.camera.mozCameraConfig = '<moz-camera-config>';
      this.camera.saveBootConfig();

      var data = JSON.parse(this.storage.setItem.args[0][1]);
      assert.equal(data.pictureSize, '<picture-size>');
      assert.equal(data.recorderProfile, '<recorder-profile>');
      assert.equal(data.mozCameraConfig, '<moz-camera-config>');
    });

    test('Should not store anything if `cacheConfig` is off', function() {
      this.options.cacheConfig = false;
      this.camera = new this.Camera(this.options);
      this.camera.saveBootConfig();
      sinon.assert.notCalled(this.storage.setItem);
    });

    test('Should only store bootConfig if mode is \'picture\' and \'back\' camera', function() {
      this.camera.selectedCamera = 'front';
      this.camera.mode = 'video';
      this.camera.saveBootConfig();
      sinon.assert.notCalled(this.storage.setItem);

      this.camera.selectedCamera = 'back';
      this.camera.mode = 'video';
      this.camera.saveBootConfig();
      sinon.assert.notCalled(this.storage.setItem);

      this.camera.selectedCamera = 'front';
      this.camera.mode = 'picture';
      this.camera.saveBootConfig();
      sinon.assert.notCalled(this.storage.setItem);

      this.camera.selectedCamera = 'back';
      this.camera.mode = 'picture';
      this.camera.saveBootConfig();
      sinon.assert.called(this.storage.setItem);
    });
  });

  suite('Camera#setRecorderProfile()', function() {
    setup(function() {
      sinon.stub(this.camera, 'configure');
    });

    test('Should set `this.recorderProfile`', function() {
      this.camera.setRecorderProfile('720p');
      assert.equal(this.camera.recorderProfile, '720p');
    });

    test('Should do nothing if value is falsy', function() {
      this.camera.recorderProfile = 'test';
      this.camera.setRecorderProfile();
      assert.equal(this.camera.recorderProfile, 'test');
    });

    test('Should configure the camera by default', function() {
      this.camera.setRecorderProfile('720p');
      sinon.assert.called(this.camera.configure);
      this.camera.configure.reset();

      this.camera.setRecorderProfile('1080p', { configure: false });
      sinon.assert.notCalled(this.camera.configure);
    });

    test('Should not do anything if not changed', function() {
      this.camera.setRecorderProfile('720p');
      sinon.assert.called(this.camera.configure);
      this.camera.configure.reset();
      this.camera.setRecorderProfile('720p');
      sinon.assert.notCalled(this.camera.configure);
    });
  });

  suite('Camera#setPictureSize()', function() {
    setup(function() {
      sinon.stub(this.camera, 'configure');
      sinon.stub(this.camera, 'setThumbnailSize');
      this.camera.mozCamera = { setPictureSize: sinon.stub() };
    });

    test('Should set `this.pictureSize` and `this.mozCamera.get/setPictureSize`', function() {
      this.camera.setPictureSize({ width: 400, height: 300 });
      assert.deepEqual(this.camera.pictureSize, { width: 400, height: 300 });
    });

    test('Should do nothing if value is falsy', function() {
      this.camera.mozCamera.pictureSize = 'test';
      this.camera.pictureSize = 'test';

      this.camera.setPictureSize();

      assert.equal(this.camera.pictureSize, 'test');
      assert.equal(this.camera.mozCamera.pictureSize, 'test');
    });

    test('Should configure the camera by default', function() {
      this.camera.setPictureSize({ width: 400, height: 300 });
      sinon.assert.called(this.camera.configure);
      this.camera.configure.reset();

      this.camera.setPictureSize({ width: 1600, height: 900 }, { configure: false });
      sinon.assert.notCalled(this.camera.configure);
    });

    test('Should not do anything if not changed', function() {
      this.camera.setPictureSize({ width: 400, height: 300 });
      sinon.assert.called(this.camera.configure);
      this.camera.setThumbnailSize.reset();
      this.camera.configure.reset();

      this.camera.setPictureSize({ width: 400, height: 300 });
      sinon.assert.notCalled(this.camera.setThumbnailSize);
      sinon.assert.notCalled(this.camera.configure);
    });

    test('Should set the thumbnail size', function() {
      this.camera.setPictureSize({ width: 400, height: 300 });
      sinon.assert.called(this.camera.setThumbnailSize);
    });
  });
});
