/*jshint maxlen:false*/
'use strict';

suite('camera', function() {
  var Camera;

  suiteSetup(function(done) {
    req(['camera'], function(_camera) {
      Camera = _camera;
      done();
    });
  });

  setup(function() {
    navigator.getDeviceStorage = navigator.getDeviceStorage || function() {};
    sinon.stub(navigator, 'getDeviceStorage');
    if (!navigator.mozCameras) {
      navigator.mozCameras = {
        getListOfCameras: function() { return []; },
        getCamera: function() {},
        release: function() {}
      };
    }
    this.camera = new Camera({});
  });

  teardown(function() {
    navigator.getDeviceStorage.restore();
  });

  suite('camera.toggleCamera', function() {
    test('Should have toggle the cameraNumber', function() {
      var camera = this.camera;

      // 1 should toggle to 0
      camera.set('selectedCamera', 1);
      camera.toggleCamera();
      assert.equal(camera.get('selectedCamera'), 0);

      // 0 should toggle to 1
      camera.set('selectedCamera', 0);
      camera.toggleCamera();
      assert.equal(camera.get('selectedCamera'), 1);
    });
  });

  // suite.skip('camera.toggleMode', function() {
  //   setup(function() {
  //     this.camera.flash.all = [];
  //     sinon.stub(this.camera, 'configureFlash');
  //   });

  //   teardown(function() {
  //     this.camera.configureFlash.restore();
  //   });

  //   test('Should call camera.configureFlash' +
  //        'with the current cameras.flashModes', function() {
  //     var allFlashModes = this.camera.flash.all;
  //     this.camera.toggleMode();
  //     assert.isTrue(this.camera.configureFlash.calledWith(allFlashModes));
  //   });
  // });

  suite('flash', function() {
    suite('camera.configureFlash', function() {
      setup(function() {
        sinon.stub(this.camera, 'setFlashMode');
      });

      teardown(function() {
        this.camera.setFlashMode.restore();
      });

      test('Should return an \'available\' list of matching modes', function() {
        this.camera.set('mode', 'photo');
        this.camera.configureFlash(['off', 'auto']);

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
  });
});
