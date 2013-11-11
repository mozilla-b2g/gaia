/*jshint maxlen:false*/
'use strict';

suite('activity', function() {
  var Camera;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    req(['camera'], function(_camera) {
      Camera = _camera;
      done();
    });
  });

  setup(function() {
    this.camera = new Camera();
  });

  suite('camera.toggleCamera', function() {
    test('Should have toggle the cameraNumber', function() {
      var state = this.camera.state;

      // 1 should toggle to 0
      state.set('cameraNumber', 1);
      this.camera.toggleCamera();
      assert.equal(state.get('cameraNumber'), 0);

      // 0 should toggle to 1
      state.set('cameraNumber', 0);
      this.camera.toggleCamera();
      assert.equal(state.get('cameraNumber'), 1);
    });
  });

  suite('camera.toggleMode', function() {
    setup(function() {
      this.camera.flash.all = [];
      sinon.stub(this.camera, 'configureFlashModes');
    });

    teardown(function() {
      this.camera.configureFlashModes.restore();
    });

    test('Should call camera.configureFlashModes' +
         'with the current cameras.flashModes', function() {
      var allFlashModes = this.camera.flash.all;
      this.camera.toggleMode();
      assert.isTrue(this.camera.configureFlashModes.calledWith(allFlashModes));
    });
  });

  suite('flash', function() {
    suite('camera.configureFlashModes', function() {
      setup(function() {
        sinon.stub(this.camera, 'setFlashMode');
      });

      teardown(function() {
        this.camera.setFlashMode.restore();
      });

      test('Should return an \'available\' list of matching modes', function() {
        sinon.stub(this.camera, 'getMode').returns('camera');
        this.camera.configureFlashModes(['off', 'auto']);

        var flash = this.camera.flash;
        assert.deepEqual(flash.available, ['off', 'auto']);
      });
    });

    suite('camera.toggleFlash', function() {
      setup(function() {
        sinon.stub(this.camera, 'setFlashMode');
        this.camera.flash.available = ['foo', 'bar', 'baz'];
        this.camera.flash.current = 0;
      });

      teardown(function() {
        this.camera.setFlashMode.restore();
        this.camera.flash.available = [];
        this.camera.flash.current = null;
        this.camera.flash.all = [];
      });

      test('Should call camera.setFlash with the' +
           'next flash in the available list', function() {
        this.camera.toggleFlash();
        assert.isTrue(this.camera.setFlashMode.calledWith(1));
      });

      test('Should return the name of the new flash mode', function() {
        var output = this.camera.toggleFlash();
        assert.equal(output, 'bar');
      });

      test('Should increment if current isn\'t last', function() {
        this.camera.flash.current = 1;
        this.camera.toggleFlash();
        assert.ok(this.camera.setFlashMode.calledWith(2));
      });

      test('Should loop back to the first mode when at end', function() {
        this.camera.flash.current = 2;
        this.camera.toggleFlash();
        assert.ok(this.camera.setFlashMode.calledWith(0));
      });
    });

    suite('camera.getFlashMode', function() {
      teardown(function() {
        this.camera.flash.available = [];
        this.camera.flash.current = null;
      });

      test('Should retrun the name of the current flash mode', function() {
        this.camera.flash.available = ['a', 'b', 'c'];
        this.camera.flash.current = 1;
        assert.equal(this.camera.getFlashMode(), 'b');
      });

      test('Should return undefined if not set', function() {
        this.camera.flash.available = [];
        this.camera.flash.current = null;
        assert.equal(this.camera.getFlashMode(), undefined);
      });
    });
  });

  suite('storage', function() {

    suite('camera.storageCheck', function() {
      setup(function() {
        sinon.stub(this.camera, 'getDeviceStorageState');
        sinon.stub(this.camera, 'isSpaceOnStorage');
      });

      teardown(function() {
        this.camera.getDeviceStorageState.restore();
        this.camera.isSpaceOnStorage.restore();
        this.camera.state.set('storage', undefined);
      });

      test('Should check storage state, then storage space', function(done) {
        var getState = this.camera.getDeviceStorageState;
        var isSpace = this.camera.isSpaceOnStorage;

        getState.callsArgWith(0, 'somevalue');
        isSpace.callsArgWith(0, true);

        this.camera.storageCheck(function() {
          assert.ok(getState.calledBefore(isSpace));
          done();
        });
      });

      test('Should set the returned value at' +
           'the camera storage state value', function(done) {
        var camera = this.camera;
        var getState = camera.getDeviceStorageState;
        var isSpace = camera.isSpaceOnStorage;

        getState.callsArgWith(0, 'somevalue');
        isSpace.callsArgWith(0, true);

        camera.storageCheck(function() {
          assert.equal(camera.state.get('storage'), 'somevalue');
          done();
        });
      });

      test('Should set the storage state to \'nospace\' ' +
           'if there is no space left on the device', function(done) {
        var camera = this.camera;
        var getState = camera.getDeviceStorageState;
        var isSpace = camera.isSpaceOnStorage;

        getState.callsArgWith(0, 'available');
        isSpace.callsArgWith(0, false);

        camera.storageCheck(function() {
          assert.equal(camera.state.get('storage'), 'nospace');
          done();
        });
      });
    });

    suite('camera.isSpaceOnStorage', function() {
      setup(function() {
        var req = this.req = {};

        // Mock picture size
        this.camera._pictureSize = {
          width: 600,
          height: 400
        };

        // Mock async picture storage DB
        this.camera._pictureStorage = {
          freeSpace: function() {
            setTimeout(function() {
              req.onsuccess({ target: req });
            }, 0);
            return req;
          }
        };
      });

      teardown(function() {
        delete this.camera._pictureSize;
        delete this.camera._pictureStorage;
        delete this.req;
      });

      test('Should return true if there is enough space' +
           'for at least one image', function(done) {
        this.req.result = 9999999999;
        this.camera.isSpaceOnStorage(function(result) {
          assert.isTrue(result);
          done();
        });
      });

      test('Should return true if there is enough space' +
           'for at least one image', function(done) {
        this.req.result = 99;
        this.camera.isSpaceOnStorage(function(result) {
          assert.isFalse(result);
          done();
        });
      });
    });

    suite('camera.getDeviceStorageState', function() {
      setup(function() {
        var request = this.request = {};

        // Mock async picture storage DB
        this.camera._pictureStorage = {
          available: function() {
            setTimeout(function() {
              request.onsuccess({ target: request });
            }, 0);
            return request;
          }
        };
      });

      teardown(function() {
        delete this.camera._pictureStorage;
        delete this.request;
      });

      test('Should make request to pictureStorage if ' +
           'no storage state is set', function(done) {
        this.request.result = 'some-state';

        this.camera.getDeviceStorageState(function(result) {
          assert.equal(result, 'some-state');
          done();
        });
      });
    });
  });
});
