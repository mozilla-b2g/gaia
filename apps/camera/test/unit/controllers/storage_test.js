suite('controllers/storage', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'controllers/storage',
      'lib/setting',
      'lib/storage',
      'app'
    ], function(StorageController, Setting, Storage, App) {
      self.StorageController = StorageController.StorageController;
      self.Setting = Setting;
      self.Storage = Storage;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.storage = sinon.createStubInstance(this.Storage);
    this.app.storage.createVideoFilepath = 'test';
    this.app.camera = {};
    this.app.settings = {
      pictureSizes: sinon.createStubInstance(this.Setting)
    };

    // Aliases
    this.camera = this.app.camera;
    this.settings = this.app.settings;
    this.storage = this.app.storage;

    this.settings.pictureSizes.selected
      .withArgs('data')
      .returns({ width: 400, height: 300 });

    // Create a test instance
    this.controller = new this.StorageController(this.app);
  });

  suite('StorageController()', function() {
    test('Should set the camera `camera.createVideoFilepath`', function() {
      assert.equal(this.camera.createVideoFilepath, 'test');
    });

    test('Should update maxFileSize when picture size changes', function() {
      var on = this.settings.pictureSizes.on;
      assert.isTrue(on.calledWith('change:selected', this.controller.updateMaxFileSize));
    });

    test('Should update maxFileSize when settings are configured', function() {
      assert.isTrue(this.app.on.calledWith('settings:configured', this.controller.updateMaxFileSize));
    });

    test('Should delete a picture from storage when one is deleted from the preview gallery', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:deletepicture', this.storage.deletePicture));
    });

    test('Should delete a video from storage when one is deleted from the preview gallery', function() {
      assert.isTrue(this.app.on.calledWith('previewgallery:deletevideo', this.storage.deleteVideo));
    });

    test('Should media when the camera generates it', function() {
      assert.isTrue(this.app.on.calledWith('camera:newimage', this.controller.storePicture));
      assert.isTrue(this.app.on.calledWith('camera:newvideo', this.controller.storeVideo));
    });

    test('Should check storage when the app becomes visible', function() {
      assert.isTrue(this.app.on.calledWith('visible', this.storage.check));
    });

    test('Should set the maxFileSize initially', function() {
      assert.isTrue(this.storage.setMaxFileSize.calledOnce);
    });

    test('Should run an intitial storage check', function() {
      this.storage.setMaxFileSize.restore();
      this.controller = new this.StorageController(this.app);
      assert.isTrue(this.storage.check.calledOnce);
    });
  });

  suite('StorageController#storePicture()', function() {
    setup(function() {
      this.storage.addPicture.callsArgWith(1, null, '<filepath>', '<abspath>', '<file-blob>');

      this.picture = { blob: '<memory-blob>' };
      this.controller.storePicture(this.picture);
    });

    test('Should store the picture', function() {
      assert.isTrue(this.storage.addPicture.calledWith('<memory-blob>'));
    });

    test('Should emit a `newmedia` app event', function() {
      assert.isTrue(this.app.emit.calledWith('newmedia', this.picture));
    });

    test('Should switch the <memory-blob> with the <file-blob>', function() {
      assert.equal(this.picture.blob, '<file-blob>');
    });

    test('Should store the <filepath>', function() {
      assert.equal(this.picture.filepath, '<filepath>');
    });
  });

  suite('StorageController#storeVideo()', function() {
    setup(function() {
      this.video = {};
      this.controller.storeVideo(this.video);
    });

    test('Should emit a `newmedia` app event', function() {
      assert.isTrue(this.app.emit.calledWith('newmedia', this.video));
    });

    test('Should flag it as `isVideo`', function() {
      assert.equal(this.video.isVideo, true);
    });
  });

  suite('StorageController#updateMaxFileSize()', function() {
    setup(function() {
      // Reset calls in constructor
      this.storage.setMaxFileSize.reset();
    });

    test('Should call `storage.setMaxFileSize` with picture file size estimate', function() {
      this.settings.pictureSizes.selected.withArgs('data').returns({ width: 400, height: 300 });
      this.controller.updateMaxFileSize();

      var expected = (400 * 300 / 2) + 25000;
      var bytes = this.storage.setMaxFileSize.args[0][0];

      assert.equal(this.storage.setMaxFileSize.callCount, 1);
      assert.equal(bytes, expected);
    });
  });
});
