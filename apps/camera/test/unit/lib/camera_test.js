suite('camera', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['lib/camera'], function(Camera) {
      self.Camera = Camera;
      done();
    });
  });

  setup(function() {
    var mozCameras = { getListOfCameras: function() {} };
    if (!navigator.mozCameras) { navigator.mozCameras = mozCameras; }
    if (!navigator.getDeviceStorage) { navigator.getDeviceStorage = function() {}; }
    sinon.stub(navigator, 'getDeviceStorage').returns({});
    sinon.stub(navigator.mozCameras, 'getListOfCameras').returns([]);
  });

  teardown(function() {
    navigator.mozCameras.getListOfCameras.restore();
    navigator.getDeviceStorage.restore();
  });

  suite('Camera#focus()', function() {
    setup(function() {
      this.camera = {
        autoFocus: {},
        set: sinon.spy(),
        mozCamera: { autoFocus: sinon.stub() },
        focus: this.Camera.prototype.focus,
        orientation: sinon.stub()
      };

      this.clock = sinon.useFakeTimers();
    });

    teardown(function() {
      this.clock.restore();
    });

    test('Should not call mozCamera.autoFocus if not supported', function() {
      var done = sinon.spy();
      this.camera.autoFocus.auto = false;
      this.camera.focus(done);
      assert.ok(!this.camera.mozCamera.autoFocus.called);
      assert.ok(done.called);
    });

    test('Should call to focus the camera if supported', function() {
      var done = sinon.spy();

      this.camera.autoFocus.auto = true;
      this.camera.mozCamera.autoFocus.callsArgWith(0, true);

      this.camera.focus(done);

      // Check the focus state was first set to 'focusing'
      assert.ok(this.camera.set.args[0][0] === 'focus');
      assert.ok(this.camera.set.args[0][1] === 'focusing');

      // Check the call to `autoFocus` was made
      assert.ok(this.camera.mozCamera.autoFocus.called);

      // Check the second focus state was then set to 'focused'
      assert.ok(this.camera.set.args[1][0] === 'focus');
      assert.ok(this.camera.set.args[1][1] === 'focused');

      // The callback
      assert.ok(done.called, 'callback called');
    });

    test('Should repond correctly on focus failure', function() {
      var done = sinon.spy();

      this.camera.autoFocus.auto = true;
      this.camera.mozCamera.autoFocus.callsArgWith(0, false);

      this.camera.focus(done);

      // Check the focus state was first set to 'focusing'
      assert.ok(this.camera.set.args[0][0] === 'focus');
      assert.ok(this.camera.set.args[0][1] === 'focusing');

      // Check the call to `autoFocus` was made
      assert.ok(this.camera.mozCamera.autoFocus.called);

      // Check the second focus state was then set to 'focused'
      assert.ok(this.camera.set.args[1][0] === 'focus');
      assert.ok(this.camera.set.args[1][1] === 'fail');

      // The callback
      assert.ok(done.calledWith('failed'));

      this.clock.tick(1001);
      assert.ok(this.camera.set.calledWith('focus', 'none'));
    });
  });

  suite('Camera#startRecording()', function() {
    setup(function() {
      this.options = {
        orientation: { get: sinon.stub().returns(0) },
        recordSpaceMin: 999,
        recordSpacePadding: 100
      };

      this.camera = new this.Camera(this.options);

      this.camera.mozCamera = {
        startRecording: sinon.stub()
      };

      // Stub all camera methods
      sinon.stub(this.camera);

      // Happy default
      this.camera.getFreeVideoStorageSpace.callsArgWith(0, null, 9999);
      this.camera.createVideoFilepath.callsArgWith(0, 'file/path/video.3gp');
      this.camera.get.withArgs('selectedCamera').returns('back');
      this.camera.get.withArgs('maxFileSizeBytes').returns(0);

      // Unstab the method we are testing
      this.camera.startRecording.restore();
    });


    test('Should emit a \'busy\' event', function() {
      this.camera.startRecording();
      assert.ok(this.camera.emit.calledWith('busy'));
    });

    test('Should error if not enough storage space', function() {
      this.camera.getFreeVideoStorageSpace = sinon.stub().callsArgWith(0, null, 9);
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

    test('Should call mozCamera.startRecording with the current rotation', function() {
      this.camera.orientation.get.returns(90);
      this.camera.startRecording();

      var args = this.camera.mozCamera.startRecording.args[0];
      var config = args[0];

      assert.ok(config.rotation === 90);
    });

    test('Should rotation should be inversed for front camera', function() {
      this.camera.get.withArgs('selectedCamera').returns('front');
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
      this.camera.createVideoFilepath = sinon.stub().callsArgWith(0, 'dir/my-video.3gp');
      this.camera.startRecording();
      var filepath = this.camera.mozCamera.startRecording.args[0][2];
      assert.ok(filepath === 'dir/my-video.3gp');
    });

    test('Should set the following onSuccess', function() {
      this.camera.mozCamera.startRecording.callsArg(3);
      this.camera.startRecording();
      assert.ok(this.camera.set.calledWith('recording', true));
      assert.ok(this.camera.emit.calledWith('ready'));
      assert.ok(this.camera.startVideoTimer.called);
    });

    test('Should call onRecordingError on error', function() {
      this.camera.mozCamera.startRecording.callsArg(4);
      this.camera.startRecording();
      assert.ok(this.camera.onRecordingError.called);
    });
  });

  suite('Camera#configureFocus()', function() {
    setup(function() {
      this.camera = {
        autoFocus: {},
        configureFocus: this.Camera.prototype.configureFocus
      };
    });

    test('Should convert modes to a hash', function() {
      var modes = ['auto', 'infinity', 'normal', 'macro'];
      this.camera.configureFocus(modes);

      assert.ok('auto' in this.camera.autoFocus);
      assert.ok('infinity' in this.camera.autoFocus);
      assert.ok('normal' in this.camera.autoFocus);
      assert.ok('macro' in this.camera.autoFocus);
    });

    test('Should empty hash each time', function() {
      this.camera.configureFocus(['infinity']);
      assert.ok('infinity' in this.camera.autoFocus);
      this.camera.configureFocus(['auto', 'normal']);
      assert.ok('auto' in this.camera.autoFocus);
      assert.ok('normal' in this.camera.autoFocus);
      assert.ok(!('infinity' in this.camera.autoFocus));
    });
  });

  suite('Camera#setISOMode()', function() {
    setup(function() {
      this.mozCamera = {
        capabilities: {
        isoModes: ['auto', 'ISO_HJR', 'ISO100', 'ISO200',
                   'ISO400', 'ISO800', 'ISO1600']
        },
        isoMode: null
      };
      this.sandbox.stub(this.camera, 'mozCamera', this.mozCamera);
      this.sandbox.stub(this.camera, 'get', function() {
        return this.mozCamera.capabilities;
      });
    });

    test('Should set the ISOMode value "auto"', function() {
      this.value = 'auto';
      this.camera.setISOMode(this.value);

      assert.equal(this.camera.mozCamera.isoMode, this.value);
    });
  });

});
