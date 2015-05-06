suite('lib/storage', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'lib/storage'
    ], function(Storage) {
      self.Storage = Storage;
      done();
    });
  });

  setup(function() {
    this.clock = sinon.useFakeTimers();
    this.sandbox = sinon.sandbox.create();

    this.video = {};
    this.video.addEventListener = sinon.spy();
    this.video.delete = sinon.stub().returns(this.video);

    this.picture = {};
    this.picture.addEventListener = sinon.spy();
    this.picture.removeEventListener = sinon.spy();
    this.picture.delete = sinon.stub().returns(this.picture);

    // Stub getDeviceStorage
    if (!navigator.getDeviceStorage) { navigator.getDeviceStorage = function() {}; }
    this.sandbox.stub(navigator, 'getDeviceStorage');

    navigator.getDeviceStorage
      .withArgs('pictures')
      .returns(this.picture);

    navigator.getDeviceStorage
      .withArgs('videos')
      .returns(this.video);

    // Stub getDeviceStorages
    if (!navigator.getDeviceStorages) { navigator.getDeviceStorages = function() {}; }
    this.sandbox.stub(navigator, 'getDeviceStorages')
      .withArgs('pictures').returns([this.picture])
      .withArgs('videos').returns([this.video]);

    // Stub mozSettings
    navigator.mozSettings = {
      addObserver: sinon.stub()
    };

    var options = {
      createFilename: sinon.stub().callsArgWith(2, 'filename.file'),
      dcf: { init: sinon.spy() }
    };

    // For convenience
    this.createFilename = options.createFilename;

    // The test instance
    this.storage = new this.Storage(options);
    // Storage is a singleton. This forces reconfiguration for each suite
    this.storage.configure();
  });

  teardown(function() {
    this.clock.restore();
    this.sandbox.restore();
  });

  suite('Storage()', function() {
    test('Should listen for change events', function() {
      assert.isTrue(this.picture.addEventListener.calledWith('change'));
      assert.isTrue(navigator.mozSettings.addObserver.called);
    });

    test('Should set state when receiving change events with available reason', function() {
      this.sandbox.stub(this.storage, 'setState');
      this.sandbox.stub(this.storage, 'check');
      this.storage.onStorageChange({
        reason: 'available'
      });
      assert.isTrue(this.storage.setState.called);
      assert.isTrue(this.storage.check.called);
    });

    test('Should set state when receiving change events with unavailable reason', function() {
      this.sandbox.stub(this.storage, 'setState');
      this.sandbox.stub(this.storage, 'check');
      this.storage.onStorageChange({
        reason: 'unavailable'
      });
      assert.isTrue(this.storage.setState.called);
      assert.isTrue(this.storage.check.called);
    });

    test('Should set state when receiving change events with shared reason', function() {
      this.sandbox.stub(this.storage, 'setState');
      this.sandbox.stub(this.storage, 'check');
      this.storage.onStorageChange({
        reason: 'shared'
      });
      assert.isTrue(this.storage.setState.called);
      assert.isTrue(this.storage.check.called);
    });

    test('Should not set state when receiving change events with unexpected reason', function() {
      this.sandbox.stub(this.storage, 'setState');
      this.sandbox.stub(this.storage, 'check');
      this.storage.onStorageChange({
        reason: 'foo'
      });
      assert.isFalse(this.storage.setState.called);
      assert.isTrue(this.storage.check.called);
    });
  });

  suite('Storage#addPicture()', function() {
    setup(function() {
      this.picture.addNamed = sinon.spy(function() { return this.addNamed.req; });
      this.picture.addNamed.req = { result: '/path/to/picture.jpg' };

      this.picture.get = sinon.spy(function() { return this.get.req; });
      this.picture.get.req = { result: 'memory-backed-blob' };

      this.callback = sinon.spy();

      // Happy path
      this.storage.addPicture('fake-blob', this.callback);
      this.picture.addNamed.req.onsuccess({ target: this.picture.addNamed.req });
      this.picture.get.req.onsuccess({ target: this.picture.get.req });
    });

    test('Should create a filename if one not given', function() {
      assert.isTrue(this.storage.createFilename.calledWith(this.picture, 'image'));
    });

    test('Should add the given blob to picture storage', function() {
      assert.isTrue(this.picture.addNamed.calledWith('fake-blob', 'filename.file'));
    });

    test('Should refetch the memory-backed-blob', function() {
      assert.isTrue(this.picture.get.calledWith('filename.file'));
    });

    test('Should callback passing the relative path, absolute path and memory-backed-blob', function() {
      assert.isTrue(this.callback.calledWith(
        null,
        'filename.file',
        '/path/to/picture.jpg',
        'memory-backed-blob'));
    });
  });

  suite('Settings#isSpace()', function() {
    setup(function() {
      var picture = this.picture;
      var self = this;
      this.event = { target: { result: 100 } };
      this.picture.freeSpace = function() {
        setTimeout(function() { picture.onsuccess(self.event); });
        return picture;
      };
    });

    test('Should return false if space < `maxFileSize` value', function() {
      this.storage.maxFileSize = 50;
      this.storage.isSpace(function(result) {
        assert.isTrue(result);
      });

      this.clock.tick(1);
    });

    test('Should return true if space > `maxFileSize` value', function() {
      this.storage.maxFileSize = 200;
      this.storage.isSpace(function(result) {
        assert.isFalse(result);
      });

      this.clock.tick(1);
    });
  });

  suite('Settings#deletePicture()', function() {
    test('Should call the deviceStorageAPI', function() {
      this.storage.deletePicture('path/to/picture.jpg');
      assert.isTrue(this.picture.delete.calledWith('path/to/picture.jpg'));
    });

    test('Should work when called out of context', function() {
      var fn = this.storage.deletePicture;
      fn('path/to/picture.jpg');
      assert.isTrue(this.picture.delete.calledWith('path/to/picture.jpg'));
    });
  });

  suite('Settings#deleteVideo()', function() {
    test('Should call the deviceStorageAPI', function() {
      this.storage.deleteVideo('path/video.3gp');
      assert.isTrue(this.video.delete.calledWith('path/video.3gp'));
    });

    test('Should delete matching poster image', function() {
      this.storage.deleteVideo('path/video.3gp');
      assert.isTrue(this.picture.delete.calledWith('path/video.jpg'));
    });

    test('Should work when called out of context', function() {
      var fn = this.storage.deleteVideo;
      fn('path/video.3gp');
      assert.isTrue(this.video.delete.calledWith('path/video.3gp'));
    });
  });
});
