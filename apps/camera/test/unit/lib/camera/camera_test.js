/*jshint maxlen:false*/

suite('lib/camera/camera', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/camera/camera'], function(Camera) {
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
      capabilities: {},
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub()
    };

    this.options = {
      getVideoMetaData: sinon.stub(),
      configStorage: {
        setItem: sinon.stub(),
        getItem: sinon.stub()
      },
      storage: {
        video: this.videoStorage
      }
    };

    // Aliases
    this.configStorage = this.options.configStorage;
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
        storage: {
          video: this.videoStorage
        },
        recordSpaceMin: 999,
        recordSpacePadding: 100
      };

      this.camera = new this.Camera(this.options);

      this.camera.mozCamera = {
        startRecording: sinon.stub().returns({
          then: function(onSuccess, onError) {
            onSuccess();
          }
        })
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

    test('It flags the camera as \'recording\' straight away', function() {
      this.camera.startRecording();
      sinon.assert.calledWith(this.camera.set, 'recording', true);
    });

    test('Should error if not enough storage space', function() {
      this.camera.getFreeVideoStorageSpace =
        sinon.stub().callsArgWith(0, null, 9);
      this.camera.startRecording();
      assert.ok(this.camera.onStartRecordingError.called);
    });

    test('Should error if stop recording requested', function() {
      this.camera.stopRecordPending = true;
      this.camera.startRecording();
      assert.ok(this.camera.stoppedRecording.called);
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
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');
      this.camera.orientation.get.returns(90);
      this.camera.startRecording();

      var args = this.camera.mozCamera.startRecording.args[0];
      var config = args[0];

      assert.ok(config.rotation === 90);
    });

    test('Should invert rotation for front camera', function() {
      this.camera.selectedCamera = 'front';
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');
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
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');

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
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');
      this.camera.startRecording();
      var args = this.camera.mozCamera.startRecording.args[0];
      var storage = args[1];
      assert.ok(storage === this.camera.storage.video);
    });

    test('Should pass the generated filepath', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');
      this.camera.startRecording();
      var filepath = this.camera.mozCamera.startRecording.args[0][2];
      assert.ok(filepath === 'dir/my-video.3gp');
    });

    test('Should call onStartRecordingError on error create video file', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, 'error-video-file-path');
      this.camera.startRecording();
      assert.ok(this.camera.onStartRecordingError.called);
    });

    test('Should call stoppedRecording if pending on create video file', function() {
      this.camera.stopRecordPending = true;
      this.camera.startRecording();
      assert.ok(this.camera.stoppedRecording.called);
    });

    test('Should set the following onSuccess', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');
      this.camera.startRecording();
      sinon.assert.called(this.camera.ready);
    });

    test('Should call onStartRecordingError on generic error', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');

      // Call error
      this.camera.mozCamera = {
        startRecording: sinon.stub().returns({
          then: function(onSuccess, onError) {
            onError({name: 'NS_ERROR_FAILURE'});
          }
        })
      };

      this.camera.startRecording();
      sinon.assert.calledWith(this.videoStorage.delete, 'dir/my-video.3gp');
      assert.ok(this.camera.stoppedRecording.notCalled);
      assert.ok(this.camera.onStartRecordingError.called);
    });

    test('Should call stoppedRecording on in progress error', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');

      // Call error
      this.camera.mozCamera = {
        startRecording: sinon.stub().returns({
          then: function(onSuccess, onError) {
            onError({name: 'NS_ERROR_IN_PROGRESS'});
          }
        })
      };

      this.camera.startRecording();
      sinon.assert.calledWith(this.videoStorage.delete, 'dir/my-video.3gp');
      assert.ok(this.camera.stoppedRecording.notCalled);
      assert.ok(this.camera.onStartRecordingError.notCalled);
    });

    test('Should call stoppedRecording on abort error', function() {
      this.camera.createVideoFilepath =
        sinon.stub().callsArgWith(0, null, 'dir/my-video.3gp');

      // Call error
      this.camera.mozCamera = {
        startRecording: sinon.stub().returns({
          then: function(onSuccess, onError) {
            onError({name: 'NS_ERROR_ABORT'});
          }
        })
      };

      this.camera.startRecording();
      sinon.assert.calledWith(this.videoStorage.delete, 'dir/my-video.3gp');
      assert.ok(this.camera.stoppedRecording.called);
      assert.ok(this.camera.onStartRecordingError.notCalled);
    });
  });

  suite('Camera#onRecordingError()', function() {
    setup(function() {
      this.navigatorMozl10n = navigator.mozL10n;
      navigator.mozL10n = { get: sinon.stub() };
      this.sandbox.stub(window, 'alert');
      sinon.spy(this.camera, 'set');
    });

    teardown(function() {
      navigator.mozL10n = this.navigatorMozl10n;
    });

    test('It calls ready()', function() {
      this.camera.onRecordingError();
      sinon.assert.called(this.camera.ready);
    });
  });

  suite('Camera#onStartRecordingError()', function() {
    setup(function() {
      sinon.stub(this.camera, 'onRecordingError');
      sinon.stub(this.camera, 'stoppedRecording');
    });

    test('It calls stoppedRecording', function() {
      this.camera.onStartRecordingError();
      sinon.assert.called(this.camera.stoppedRecording);
    });

    test('It calls onRecordingError', function() {
      this.camera.onStartRecordingError();
      sinon.assert.called(this.camera.onRecordingError);
    });
  });

  suite('Camera#onStopRecordingError()', function() {
    setup(function() {
      sinon.stub(this.camera, 'onRecordingError');
    });

    test('It calls delete', function() {
      this.camera.onStopRecordingError('/bar/foo.3gp');
      sinon.assert.calledWith(this.videoStorage.delete, '/bar/foo.3gp');
    });

    test('It calls onRecordingError by default', function() {
      this.camera.onStopRecordingError();
      sinon.assert.called(this.camera.onRecordingError);
    });

    test('It does not call onRecordingError if silenced', function() {
      this.camera.onStopRecordingError('', true);
      sinon.assert.notCalled(this.camera.onRecordingError);
    });
  });

  suite('Camera#stopRecording()', function() {
    setup(function() {
      sinon.stub(this.camera, 'get');
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

    test('Should not do anything if stop already pending', function() {
      this.camera.stopRecordPending = true;
      this.camera.stopRecording();
      sinon.assert.notCalled(this.camera.mozCamera.stopRecording);
    });

    test('Should indicate busy', function() {
      this.camera.stopRecording();
      sinon.assert.calledWith(this.camera.emit, 'busy');
    });

    test('Should call `mozCamera.stopRecording`', function() {
      this.camera.stopRecording();
      sinon.assert.called(this.camera.mozCamera.stopRecording);
    });

    test('Should set `stopRecordPending` flag to `true`', function() {
      this.camera.stopRecordPending = false;
      this.camera.stopRecording();
      assert.isTrue(this.camera.stopRecordPending);
    });
  });

  suite('Camera#onNewVideo()', function() {
    setup(function() {
      sinon.stub(this.camera, 'get');
      sinon.stub(this.camera, 'onStopRecordingError');
      this.camera.minRecordingTime = 1000;
      this.video = {
        blob: '<blob>',
        filepath: 'video.3gp',
        elapsedTime: 2000
      };
    });

    test('Should call unsilenced `onStopRecordingError` for large videos that fail to decode', function() {
      this.camera.getVideoMetaData.callsArgWith(1, 'error', {});
      this.camera.onNewVideo(this.video);
      sinon.assert.calledWith(this.camera.onStopRecordingError, 'video.3gp', false);
    });

    test('Should call silenced `onStopRecordingError` for small videos that fail to decode', function() {
      this.video.elapsedTime = 999;
      this.camera.getVideoMetaData.callsArgWith(1, 'error', {});
      this.camera.onNewVideo(this.video);
      sinon.assert.calledWith(this.camera.onStopRecordingError, 'video.3gp', true);
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
          elapsedTime: 2000,
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

      test('Should not emit \'newvideo\' if it errors', function() {
        this.callback('an error');
        assert.isFalse(this.camera.emit.calledWith('newvideo'));
      });
    });
  });

  suite('Camera#onRecorderStateChange()', function() {
    test('Should call `startedRecording`', function() {
      sinon.stub(this.camera, 'startedRecording');
      this.camera.onRecorderStateChange({newState: 'Started'});
      sinon.assert.called(this.camera.startedRecording);
    });

    test('Should call `stoppedRecording`', function() {
      sinon.stub(this.camera, 'stoppedRecording');
      this.camera.onRecorderStateChange({newState: 'Stopped'});
      sinon.assert.calledWith(this.camera.stoppedRecording, true);
    });

    test('Should emit `filesizelimitreached`', function() {
      this.camera.onRecorderStateChange({newState: 'FileSizeLimitReached'});
      sinon.assert.calledWith(this.camera.emit, 'filesizelimitreached');
    });
  });

  suite('Camera#startedRecording()', function() {
    test('Should start timer counting', function() {
      sinon.stub(this.camera, 'startVideoTimer');
      this.camera.startedRecording();
      sinon.assert.called(this.camera.startVideoTimer);
    });
  });

  suite('Camera#stoppedRecording()', function() {
    setup(function() {
      sinon.spy(this.camera, 'set');
      sinon.stub(this.camera, 'get');
    });

    test('It sets `recording` to `false`', function() {
      this.camera.stoppedRecording();
      sinon.assert.calledWith(this.camera.set, 'recording', false);
    });

    test('Should set `stopRecordPending` flag to `false`', function() {
      this.camera.stopRecordPending = true;
      this.camera.stoppedRecording();
      assert.isFalse(this.camera.stopRecordPending);
    });

    test('Should stop timer counting', function() {
      sinon.stub(this.camera, 'stopVideoTimer');
      this.camera.stoppedRecording();
      sinon.assert.called(this.camera.stopVideoTimer);
    });

    suite('Storage', function() {
      setup(function() {
        sinon.stub(this.camera, 'onNewVideo');
        sinon.stub(this.camera, 'onStopRecordingError');
        this.req = {};
        this.videoStorage.get.returns(this.req);
        this.camera.get.withArgs('videoElapsed').returns(2000);
        this.camera.video.filepath = 'foo/bar/baz.3gp';
        this.camera.stoppedRecording(true);
      });

      test('Should call `get` on recorded video', function() {
        sinon.assert.calledWith(this.videoStorage.get, 'foo/bar/baz.3gp');
        this.videoStorage.get.reset();
      });

      test('Should call `onNewVideo` on success', function() {
        this.req.result = '<blob>';
        this.req.onsuccess();

        var arg = this.camera.onNewVideo.args[0][0];

        assert.deepEqual(arg, {
          blob: '<blob>',
          filepath: 'foo/bar/baz.3gp',
          elapsedTime: 2000
        });
      });

      test('Should call `camera.onStopRecordingError` on error', function() {
        this.req.onerror();
        sinon.assert.called(this.camera.onStopRecordingError);
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
      this.options = {
        orientation: {
          get: sinon.stub().returns(0),
          start: sinon.stub(),
          stop: sinon.stub()
        }
      };
      this.camera = new this.Camera(this.options);
      this.camera.focus = {
        resume: function() {},
        focus: sinon.stub().callsArg(0),
        getMode: sinon.spy(),
        startFaceDetection : sinon.spy()
      };

      sinon.stub(this.camera, 'set');
      this.camera.mozCamera = {
        takePicture: sinon.stub().returns({
          then: function(onSuccess, onError) { onSuccess('the-blob'); }
        }),
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

    test('Should still take picture even when focus is interrupted', function() {
      this.camera.focus.focus = sinon.stub().callsArgWith(1, 'interrupted');
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

    test('Should call mozCamera.takePicture with the current rotation', function() {
      this.camera.orientation.get.returns(90);
      this.camera.takePicture();

      var args = this.camera.mozCamera.takePicture.args[0];
      var config = args[0];

      assert.ok(config.rotation === 90);
    });

    test('Should invert rotation for front camera', function() {
      this.camera.selectedCamera = 'front';
      this.camera.orientation.get.returns(90);
      this.camera.takePicture();

      var args = this.camera.mozCamera.takePicture.args[0];
      var config = args[0];

      assert.ok(config.rotation === -90);
    });

  });

  suite('Camera#onPreviewStateChange()', function() {
    test('It doesn\'t fire \'busy\' event if \'stopped\' or \'paused\'', function() {
      this.camera.onPreviewStateChange({ newState: 'stopped' });
      assert.isFalse(this.camera.emit.calledWith('busy'));
    });

    test('It doesn\'t fire \'ready\' event if \'started\'', function() {
      this.camera.onPreviewStateChange({ newState: 'started' });
      assert.isFalse(this.camera.emit.calledWith('ready'));
    });

    test('It fire a `preview:*` event', function() {
      this.camera.onPreviewStateChange({ newState: 'started' });
      sinon.assert.calledWith(this.camera.emit, 'preview:started');
    });

    test('It stores the last known preview state', function() {
      this.camera.onPreviewStateChange({ newState: 'started' });
      assert.equal(this.camera.previewState, 'started');
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

    test('Should just `setupNewCamera` if selected camera has\'t changed', function() {
      this.camera.load();
      this.camera.requestCamera.reset();

      this.camera.load();
      assert.isTrue(this.camera.setupNewCamera.called);
      sinon.assert.called(this.camera.ready);
      assert.isFalse(this.camera.requestCamera.called);
    });

    test('Should call requestCamera with selectedCamera', function() {
      this.camera.selectedCamera = '<selected-camera>';
      this.camera.load();

      sinon.assert.calledWith(
        this.camera.requestCamera,
        '<selected-camera>'
      );
    });
  });

  suite('Camera#requestCamera()', function() {
    setup(function() {
      var self = this;

      this.sandbox.stub(this.camera, 'setupNewCamera');
      this.sandbox.stub(this.camera, 'configureFocus');

      navigator.mozCameras.getCamera.returns({
        then: function(onSuccess) {
          onSuccess({ camera: self.mozCamera,
                      configuration: {
                        previewSize: '<preview-size>',
                        pictureSize: '<picture-size>',
                        recorderProfile: '<recorder-profile>' }
                    });
        }
      });

      this.camera.mozCamera = this.mozCamera;
      this.camera.selectedCamera = 'back';
      this.clock = this.sandbox.useFakeTimers();
    });

    test('Should emit a \'busy\', then \'ready\' event', function() {
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

    test('Should flag a `this.configured`', function() {
      this.camera.configured = false;
      this.camera.requestCamera('back', { some: 'config' });
      assert.isTrue(this.camera.configured);

      this.camera.configured = false;
      this.camera.requestCamera('front');
      assert.isTrue(this.camera.configured);
    });

    test('Should call .setupNewCamera', function() {
      var callback = sinon.spy();
      this.camera.requestCamera('back', { some: 'config' }, callback);
      sinon.assert.calledWith(this.camera.setupNewCamera, this.mozCamera);
    });

    test('Should not configure camera on error', function() {
      navigator.mozCameras.getCamera.returns({
        then: function(onSuccess, onError) { onError('error'); }
      });

      this.camera.requestCamera();
      assert.isFalse(this.camera.setupNewCamera.called);
    });

    test('Should emit a \'configured\'', function() {
      this.camera.requestCamera('back');
      assert.equal(this.camera.givenPreviewSize, '<preview-size>');
      assert.equal(this.camera.pictureSize, '<picture-size>');
      assert.equal(this.camera.recorderProfile, '<recorder-profile>');
      sinon.assert.calledWith(this.camera.emit, 'configured');
    });

    test('It attempts to re-request the camera if \'HardwareClosed\'', function() {
      navigator.mozCameras.getCamera.returns({
        then: function(onSuccess, onError) {
          onError('HardwareClosed');
        }
      });

      // First attempt
      this.camera.requestCamera();
      sinon.assert.called(navigator.mozCameras.getCamera);
      navigator.mozCameras.getCamera.reset();

      this.clock.tick(1000);

      // Second attempt
      sinon.assert.called(navigator.mozCameras.getCamera);
      navigator.mozCameras.getCamera.reset();

      this.clock.tick(1000);

      // Third attempt
      sinon.assert.called(navigator.mozCameras.getCamera);
      navigator.mozCameras.getCamera.reset();

      // Doesn't attempt fourth time
      sinon.assert.notCalled(navigator.mozCameras.getCamera);
    });
  });

  suite('Camera#configure()', function() {
    setup(function() {
      this.camera.mode = 'picture';
      this.camera.mozCamera = this.mozCamera;
      this.camera.recorderProfile = '720p';
      this.camera.pictureSize = { width: 800, height: 600 };
      var config = {
        mode: 'picture',
        previewSize: { width: 200, height: 150 },
        pictureSize: { width: 400, height: 300 },
        recorderProfile: '720p'
      };
      this.mozCamera.setConfiguration.returns({
        then: function(onSuccess) { onSuccess(config); }
      });
      this.camera.focus = {
        configure: sinon.stub(),
        resume: sinon.stub()
      };
      this.sandbox.stub(this.camera, 'previewSize');
      this.camera.previewSize.returns({ width: 400, height: 300 });
      this.clock = this.sandbox.useFakeTimers();
    });

    test('Should call `mozCamera.setConfiguration` with expected config', function() {
      this.camera.configure();
      this.clock.tick(1);

      var config = this.mozCamera.setConfiguration.args[0][0];

      // Requested configuration
      assert.deepEqual(config, {
        mode: 'picture',
        pictureSize: { width: 800, height: 600 },
        recorderProfile: '720p'
      });

      // Received configuration
      assert.deepEqual(this.camera.givenPreviewSize, { width: 200, height: 150});
      assert.deepEqual(this.camera.pictureSize, { width: 400, height: 300 });
      assert.equal(this.camera.recorderProfile, '720p');
    });

    test('Should emit a \'configured\' event', function() {
      this.camera.configure();
      this.clock.tick(1);
      assert.isTrue(this.camera.emit.calledWith('configured'));
    });

    test('Should not configure if there is no mozCamera', function() {
      delete this.camera.mozCamera;
      this.camera.configure();
      this.clock.tick(1);

      assert.isFalse(this.mozCamera.setConfiguration.called);
    });

    test('Should flag dirty configuration', function() {

      // Make sure the callback isn't called
      this.mozCamera.setConfiguration = sinon.stub().returns({ then: () => {}});

      this.camera.configure();
      this.clock.tick(1);

      assert.isFalse(this.camera.configured);
    });

    test('Should flag clean configuration once complete', function(done) {
      var self = this;
      var onSuccess;

      this.mozCamera.setConfiguration.returns({
        then: function(_onSuccess) { onSuccess = _onSuccess; }
      });

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

      onSuccess({
        mode: 'picture',
        previewSize: { width: 400, height: 300 },
        pictureSize: { width: 800, height: 600 },
        recorderProfile: '720p'
      });
    });

    test('Should defer calls until camera is \'ready\'', function() {
      this.camera.isBusy = true;

      this.camera.configure();
      this.clock.tick(1);

      sinon.assert.notCalled(this.mozCamera.setConfiguration);

      this.camera.ready();
      this.clock.tick(151);

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
      var onSuccess;
      this.mozCamera.setConfiguration.returns({
        then: function(_onSuccess) { onSuccess = _onSuccess; }
      });

      // Call and 'tick' past the debouce
      this.camera.configure();
      this.clock.tick(1);

      // 'busy' while configuring
      assert.isTrue(this.camera.isBusy);
      sinon.assert.calledWith(this.camera.emit, 'busy');

      // Manually call the callback
      onSuccess({
        mode: 'picture',
        previewSize: { width: 400, height: 300 },
        pictureSize: { width: 800, height: 600 },
        recorderProfile: '720p'
      });

      assert.isFalse(this.camera.isBusy);
      sinon.assert.called(this.camera.ready);
    });

    test('Should abort if `mozCamera` has since been released', function() {
      var onSuccess;
      this.mozCamera.setConfiguration.returns({
        then: function(_onSuccess) { onSuccess = _onSuccess; }
      });

      this.camera.configure();
      this.clock.tick(1);

      onSuccess({
        mode: 'picture',
        previewSize: { width: 400, height: 300 },
        pictureSize: { width: 800, height: 600 },
        recorderProfile: '720p'
      });

      sinon.assert.calledWith(this.camera.emit, 'configured');
      this.camera.emit.reset();
      delete this.mozCamera;

      assert.isFalse(this.camera.emit.calledWith('configured'));
    });

    test('It stops any recording that make be in progress', function() {
      sinon.stub(this.camera, 'stopRecording');
      this.camera.configure();
      this.clock.tick(1);
      sinon.assert.called(this.camera.stopRecording);
    });
  });

  suite('Camera#release()', function() {
    setup(function() {
      this.mozCamera.release.returns({
        then: function(onSuccess) { setTimeout(onSuccess); }
      });

      this.camera.mozCamera = this.mozCamera;
      this.camera.focus.stopFaceDetection = sinon.spy();
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

    test('Should change camera.releasing status before released fired',
     function(done) {
      var self = this;
      this.camera.releasing = true;
      this.camera.on('released', function() {
        assert.isFalse(self.camera.releasing);
        done();
      });
      this.camera.release();
    });

    test('Should not call stopFaceDetection', function() {
      this.camera.release();
      sinon.assert.notCalled(this.camera.focus.stopFaceDetection);
    });

    test('Should call the callback with an error argument', function(done) {
      this.mozCamera.release = sinon.stub();
      this.mozCamera.release.returns({
        then: function(onSuccess, onError) {
          onError('error');
        }
      });

      this.camera.release(function(err) {
        assert.equal(err, 'error');
        done();
      });
    });

    test('It clears any pending camera request timeout', function() {
      this.sandbox.stub(window, 'setTimeout').returns('<timeout-id>');
      this.sandbox.stub(window, 'clearTimeout');

      navigator.mozCameras.getCamera.returns({
        then: function(onSuccess, onError) {
          onError('HardwareClosed');
        }
      });

      this.camera.requestCamera();
      this.camera.release();

      sinon.assert.calledWith(window.clearTimeout, '<timeout-id>');
    });

    test('Should clear cached camera parameters', function() {
      this.camera.pictureSize = '<picture-size>';
      this.camera.recorderProfile = '<recorder-profile>';
      this.camera.givenPreviewSize = '<preview-size>';
      this.camera.release();
      assert.ok(!this.camera.pictureSize);
      assert.ok(!this.camera.recorderProfile);
      assert.ok(!this.camera.givenPreviewSize);
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

  suite('Camera#setFlashMode()', function() {
    setup(function() {
      this.camera.mozCamera = { flashMode: null };
    });

    test('Should set `this.mozCamera.flashMode`', function() {
      this.camera.mozCamera.flashMode = 'off';
      this.camera.setFlashMode('auto');
      assert.equal(this.camera.mozCamera.flashMode, 'auto');
    });

  });

  suite('Camera#updateFocusArea()', function() {
    setup(function() {
      this.camera.mozCamera = { flashMode: null };
      this.camera.focus = {
        updateFocusArea: sinon.spy(),
      };
    });

    test('Should focus updateFocusArea', function() {
      this.camera.updateFocusArea();
      assert.ok(this.camera.focus.updateFocusArea.called);
      this.camera.focus.updateFocusArea.callArgWith(1, 'focused');
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

  suite('Camera#setMode()', function() {
    setup(function() {
      sinon.stub(this.camera, 'configure');
    });

    test('It sets `this.mode`', function() {
      this.camera.setMode('my-mode');
      assert.equal(this.camera.mode, 'my-mode');
    });

    test('It configures the camera', function() {
      this.camera.setMode('my-mode');
      sinon.assert.called(this.camera.configure);
    });

    test('It doesn\'t do anything if the mode didn\'t change', function() {
      this.camera.setMode('my-mode');
      this.camera.configure.reset();
      this.camera.setMode('my-mode');
      sinon.assert.notCalled(this.camera.configure);
    });
  });

  suite('Camera#isMode()', function() {
    test('It returns `true` is the camera is set to the passed mode', function() {
      this.camera.mode = 'my-mode';
      assert.isTrue(this.camera.isMode('my-mode'));
      assert.isFalse(this.camera.isMode('not-my-mode'));
    });
  });

  suite('Camera#ready()', function() {
    setup(function() {
      this.clock = this.sandbox.useFakeTimers();
    });

    test('It is debounced in case busy fires shortly after', function() {
      this.camera.ready();
      this.camera.ready();
      this.camera.ready();
      this.camera.ready();

      this.clock.tick(150);

      assert.isTrue(this.camera.emit.withArgs('ready').calledOnce);
    });
  });

  suite('Camera#busy()', function() {
    setup(function() {
      this.camera.readyTimeout = '<ready-timeout>';
      this.sandbox.stub(window, 'clearTimeout');
    });

    test('It clears the ready timeout', function() {
      this.camera.busy();
      sinon.assert.calledWith(window.clearTimeout, '<ready-timeout>');
    });
  });
});
