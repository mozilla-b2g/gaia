suite('controllers/preview-gallery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/preview-gallery',
      'lib/settings',
      'views/preview-gallery',
      'views/controls',
      'lib/storage'
    ], function(
      App, Camera, PreviewGalleryController, Settings, PreviewGalleryView,
      ControlsView, Storage, Broadcast) {
      self.PreviewGalleryController =
         PreviewGalleryController.PreviewGalleryController;
      self.Settings = Settings;
      self.PreviewGalleryView = PreviewGalleryView;
      self.ControlsView = ControlsView;
      self.Storage = Storage;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.views = {
      previewGallery: sinon.createStubInstance(this.PreviewGalleryView),
      controls: sinon.createStubInstance(this.ControlsView)
    };
    this.app.storage = sinon.createStubInstance(this.Storage);
    this.app.storage = { on: sinon.spy() };
    this.app.storage.image = { delete: sinon.stub() };
    this.app.storage.video = { delete: sinon.stub() };
    this.app.storage.image.delete.withArgs('root/fileName').returns({});
    this.app.storage.video.delete.withArgs('root/fileName').returns({});
    this.app.settings = sinon.createStubInstance(this.Settings);

    // For convenience
    this.camera = this.app.camera;
    this.previewGallery = this.app.views.previewGallery;
    this.storage = this.app.storage;

    // Our test instance
    this.previewGalleryController = new this.PreviewGalleryController(this.app);
  });

  suite('PreviewGalleryController()', function() {
    setup(function() {
      var mozL10n = { get: function() {} };
      if (!navigator.mozL10n) { navigator.mozL10n = mozL10n; }
      sinon.stub(window, 'confirm');
      window.confirm.returns(true);
      sinon.stub(window, 'MozActivity');
      sinon.stub(navigator.mozL10n, 'get');
    });

    teardown(function() {
      window.confirm.restore();
      window.MozActivity.restore();
      navigator.mozL10n.get.restore();
    });

    test('Should listen to the following events', function() {
      this.previewGalleryController.bindEvents();
      assert.ok(this.app.on.calledWith('preview'));
      assert.ok(this.app.on.calledWith('newmedia'));
      assert.ok(this.app.on.calledWith('blur'));

      assert.ok(this.previewGallery.on.calledWith('click:gallery'));
      assert.ok(this.previewGallery.on.calledWith('click:share'));
      assert.ok(this.previewGallery.on.calledWith('click:delete'));
      assert.ok(this.previewGallery.on.calledWith('click:back'));
      assert.ok(this.previewGallery.on.calledWith('itemChange'));

      assert.ok(this.storage.on.calledWith('itemdeleted'));
    });

    test('Should open the gallery app when gallery button is pressed',
      function() {
      this.previewGalleryController.onGalleryButtonClick();
      var arg = window.MozActivity.args[0][0];

      assert.ok(arg.name === 'browse');
      assert.ok(arg.data.type === 'photos');
    });

    test('Should shareCurrentItem whose type is image', function() {
      var item = {
        blob: {},
        filepath: 'root/folder1/folder2/fileName',
        isImage: true
      };
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.shareCurrentItem();
      // Get first argument, of first call
      var arg = window.MozActivity.args[0][0];

      assert.ok(arg.name === 'share');
      assert.ok(arg.data.type === 'image/*');
      assert.ok(arg.data.number === 1);
      assert.ok(arg.data.blobs[0] === item.blob);
      assert.ok(arg.data.filenames[0] === 'fileName');
      assert.ok(arg.data.filepaths[0] === item.filepath);
    });

    test('Should shareCurrentItem whose type is video', function() {
      var item = {
        blob: {},
        filepath: 'root/folder1/folder2/fileName',
        isVideo: true
      };
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.shareCurrentItem();
      // Get first argument, of first call
      var arg = window.MozActivity.args[0][0];

      assert.ok(arg.name === 'share');
      assert.ok(arg.data.type === 'video/*');
      assert.ok(arg.data.number === 1);
      assert.ok(arg.data.blobs[0] === item.blob);
      assert.ok(arg.data.filenames[0] === 'fileName');
      assert.ok(arg.data.filepaths[0] === item.filepath);
    });

    test('Should deleteCurrentItem which is image', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isImage: true
      };
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.deleteItem = sinon.spy();
      this.previewGalleryController.deleteCurrentItem();

      assert.ok(this.previewGalleryController.deleteItem
                .calledWith('root/fileName'));
    });

    test('Should deleteCurrentItem which is video', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isImage: false
      };
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;

      this.previewGalleryController.deleteItem = sinon.spy();
      this.previewGalleryController.deleteCurrentItem();

      assert.ok(this.previewGalleryController.deleteItem
                .calledWith('root/fileName'));
    });

    test('Check onNewMedia callback', function() {
      var item = {
         media: {
           blob: {},
           type: 'video/mpeg'
         }
      };

      this.previewGalleryController.items.unshift = sinon.spy();
      this.previewGalleryController.onNewMedia(item);
      assert.ok(this.previewGalleryController.items.unshift.called);
    });

    test('Should Check the Item Deleted', function() {
      var data = {
        path: 'home/DCIM/abc.jpg'
      };
      this.previewGalleryController.deleteItem = sinon.spy();
      this.previewGalleryController.onItemDeleted(data);
      assert.ok(this.previewGalleryController.deleteItem.called);
    });

    test('Should close the preview gallery when onItemChange is \'up\'',
      function() {
        var e = {
          detail: {
            direction: 'up',
            vy: -2
          }
        };
      this.previewGalleryController.previewGallery.close = sinon.spy();
      this.previewGalleryController.onItemChange(e);
      assert.ok(this.previewGalleryController.previewGallery.close.called);
    });

    test('Should go to next image when onItemChange is \'left\'', function() {
      var e = {
        detail: {
          direction: 'left',
          vx: -2
        }
      };
      this.previewGalleryController.currentItemIndex = -2;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.onItemChange(e);
      assert.ok(this.previewGalleryController.previewItem.called);
    });

    test('Should go to previous image when onItemChange is \'right\'',
      function() {
        var e = {
          detail: {
            direction: 'right',
            vx: 2
          }
        };
      this.previewGalleryController.currentItemIndex = 2;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.onItemChange(e);
      assert.ok(this.previewGalleryController.previewItem.called);
    });
  });
});
