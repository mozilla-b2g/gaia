require('/shared/js/l10n.js');

suite('controllers/preview-gallery', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'lib/camera/camera',
      'controllers/preview-gallery',
      'lib/settings',
      'views/preview-gallery',
      'views/controls',
      'lib/storage',
      'lib/orientation'
    ], function(
      App, Camera, PreviewGalleryController, Settings, PreviewGalleryView,
      ControlsView, Storage, orientation) {
      self.PreviewGalleryController =
         PreviewGalleryController.PreviewGalleryController;
      self.Settings = Settings;
      self.PreviewGalleryView = PreviewGalleryView;
      self.ControlsView = ControlsView;
      self.Storage = Storage;
      self.Camera = Camera;
      self.App = App;
      self.orientation = orientation;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.activity = {};
    this.app.views = {
      controls: sinon.createStubInstance(this.ControlsView)
    };
    this.app.settings.previewGallery = {
      get: sinon.spy()
    };

    // Fake dialog calls the
    // 'delete' callback sync.
    this.app.dialog = {
      show: function(title, msg, cancel, del) { del.callback(); },
      hide: sinon.stub()
    };

    // Our test instance
    this.previewGalleryController = new this.PreviewGalleryController(this.app);

    // For convenience
    this.camera = this.app.camera;
    this.previewGallery = this.previewGalleryController.view;
    this.controller = this.previewGalleryController;
    this.storage = this.app.storage;
    this.dialog = this.app.dialog;
  });

  suite('PreviewGalleryController()', function() {
    setup(function() {
      var mozL10n = {
        get: function() {},
        translate: function() {}
      };
      if (!navigator.mozL10n) {
        navigator.mozL10n = mozL10n;
      }
      sinon.stub(navigator.mozL10n, 'get');

      var MozActivity = function() {};
      if (!window.MozActivity) {
        window.MozActivity = MozActivity;
      }
      sinon.stub(window, 'MozActivity');

      this.previewGalleryController.storage = {
        deleteImage: sinon.spy(),
        deleteVideo: sinon.spy(),
        on: sinon.spy()
      };

      this.previewGalleryController.settings = {
        activity: {
          get: sinon.spy()
        },
        previewGallery: {
          get: sinon.spy()
        }
      };

      this.previewGalleryController.resizeImageAndSave =
        function(options, done) {
          done(options.blob);
        };

      this.clock = sinon.useFakeTimers();

      CustomDialog.show = function(title, msg, cancelCb, deleteCb) {
        deleteCb.callback();
      };
    });

    teardown(function() {
      window.MozActivity.restore();
      navigator.mozL10n.get.restore();
    });

    test('Should listen to the following events', function() {
      this.previewGalleryController.bindEvents();

      assert.ok(this.app.on.calledWith('preview'));
      assert.ok(this.app.on.calledWith('newmedia'));
      assert.ok(this.app.on.calledWith('hidden'));
      assert.ok(this.app.on.calledWith('storage:itemdeleted'));
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
        blob: new Blob(['empty-image'], {'type': 'image/jpeg'}),
        filepath: 'root/folder1/folder2/fileName',
        isImage: true
      };
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.shareCurrentItem();

      assert.ok(this.app.emit.calledWith('busy', 'resizingImage'));

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

    suite('PreviewGalleryController#deleteCurrentItem()', function() {
      setup(function() {

      });

      test('Should deleteCurrentItem which is image', function() {
        var item = {
          blob: {},
          filepath: 'root/fileName',
          isVideo: false
        };

        this.previewGalleryController.items = [item];
        this.previewGalleryController.currentItemIndex = 0;
        this.previewGalleryController.deleteCurrentItem();

        assert.ok(this.app.emit.calledWith('previewgallery:deletepicture', 'root/fileName'));
      });

      test('Should deleteCurrentItem which is video', function() {
        var item = {
          blob: {},
          filepath: 'root/fileName',
          isVideo: true
        };

        this.previewGalleryController.items = [item];
        this.previewGalleryController.currentItemIndex = 0;
        this.previewGalleryController.deleteCurrentItem();

        assert.ok(this.app.emit.calledWith('previewgallery:deletevideo', 'root/fileName'));
      });
    });

    test('Check onNewMedia callback', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isVideo: true
      };

      this.app.activity = {
        active: false
      };

      this.previewGalleryController.items.unshift = sinon.spy();
      this.previewGalleryController.updateThumbnail = sinon.spy();
      this.previewGalleryController.onNewMedia(item);
      assert.ok(this.previewGalleryController.items.unshift.called);
      assert.ok(this.previewGalleryController.updateThumbnail.called);
    });

    test('Should Check Storage Changed', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isVideo: true
      };

      var data = {
        path: 'root/fileName'
      };

      this.app.activity = {
        active: false
      };

      this.previewGalleryController.configure = sinon.spy();
      this.previewGalleryController.updateThumbnail = sinon.spy();
      this.previewGalleryController.onNewMedia(item);
      this.previewGalleryController.onStorageChanged('unavailable');
      assert.ok(this.previewGalleryController.configure.called);
      assert.ok(this.previewGalleryController.updateThumbnail.called);
    });

    test('Should Check the Item Deleted', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isVideo: true
      };

      var data = {
        path: 'root/fileName'
      };

      this.app.activity = {
        active: false
      };

      this.previewGalleryController.updateThumbnail = sinon.spy();
      this.previewGalleryController.updatePreviewGallery = sinon.spy();
      this.previewGalleryController.onNewMedia(item);
      this.previewGalleryController.onItemDeleted(data);
      assert.ok(this.previewGalleryController.updatePreviewGallery.called);
    });

    test('Should go to next image on handleSwipe(\'left\')', function() {
      this.previewGalleryController.items = [1,2,3];
      this.previewGalleryController.currentItemIndex = 1;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.handleSwipe('left');
      assert.ok(this.previewGalleryController.previewItem.called);
      assert.equal(this.previewGalleryController.currentItemIndex, 2);
    });

    test('Should go to previous image on handleSwipe(\'right\')', function() {
      this.previewGalleryController.items = [1,2,3];
      this.previewGalleryController.currentItemIndex = 1;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.handleSwipe('right');
      assert.ok(this.previewGalleryController.previewItem.called);
      assert.equal(this.previewGalleryController.currentItemIndex, 0);
    });

    test('Should not go to next image if there is not one', function() {
      this.previewGalleryController.items = [1,2];
      this.previewGalleryController.currentItemIndex = 1;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.handleSwipe('left');
      assert.isFalse(this.previewGalleryController.previewItem.called);
      assert.equal(this.previewGalleryController.currentItemIndex, 1);
    });

    test('Should not go to previous image if there is not one', function() {
      this.previewGalleryController.items = [1,2];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.handleSwipe('right');
      assert.isFalse(this.previewGalleryController.previewItem.called);
      assert.equal(this.previewGalleryController.currentItemIndex, 0);
    });

    test('Should close the preview on blur', function() {
      this.previewGalleryController.closePreview = sinon.spy();
      this.previewGalleryController.onHidden();
      assert.ok(this.previewGalleryController.closePreview.called);
    });

    test('Should close the preview on blur if in \'secureMode\'', function() {
      this.app.inSecureMode = true;
      this.previewGalleryController.closePreview = sinon.spy();
      this.previewGalleryController.configure = sinon.spy();
      this.previewGalleryController.updateThumbnail = sinon.spy();
      this.previewGalleryController.onHidden();
      assert.ok(this.previewGalleryController.configure.called);
      assert.ok(this.previewGalleryController.updateThumbnail.called);
      assert.ok(this.previewGalleryController.closePreview.calledAfter(this.previewGalleryController.updateThumbnail));
    });

    // XXX: this is really a view test, but we don't have tests for the view yet
    test('Should lock and unlock orientation when opening and closing view',
         function() {
           this.orientation.unlock = sinon.spy();
           this.orientation.lock = sinon.spy();
           this.previewGalleryController.previewItem = sinon.spy();
           this.previewGalleryController.openPreview();
           assert.isTrue(this.orientation.unlock.called);
           assert.isTrue(this.previewGalleryController.previewItem.called);
           assert.isFalse(this.orientation.lock.called);
           this.previewGalleryController.closePreview();
           assert.isTrue(this.orientation.lock.called);
         });

    // XXX: this is really a view test, but we don't have tests for the view yet
    test('Should add and remove a resize handler when opening and closing view',
         function() {
           var add = sinon.spy(window, 'addEventListener').withArgs('resize');
           var remove =
             sinon.spy(window, 'removeEventListener').withArgs('resize');
           this.previewGalleryController.previewItem = sinon.spy();
           this.previewGalleryController.openPreview();
           assert.ok(add.calledTwice); // twice because VideoPlayer does too
           this.previewGalleryController.closePreview();
           assert.equal(remove.callCount, 1);
         });
  });

  suite('PreviewGalleryController#openPreview()', function() {
    setup(function() {
      sinon.stub(this.controller, 'previewItem');
      this.controller.settings = {
        activity: {
          get: sinon.spy()
        },
        previewGallery: {
          get: sinon.spy()
        }
      };
      this.controller.openPreview();
    });

    test('Should call previewItem', function() {
      assert.isTrue(this.controller.previewItem.called);
    });
  });

  suite('PreviewGalleryController#closePreview()', function() {
    setup(function() {
      this.controller.view = new this.PreviewGalleryView();
      this.previewGalleryView = this.controller.view;
      this.controller.view.close = sinon.spy();
      this.controller.view.destroy = sinon.spy();
      this.controller.closePreview();
    });

    test('Should set `previewGalleryOpen` to `false` on app', function() {
      assert.isTrue(this.previewGalleryView.close.called);
      assert.isTrue(this.previewGalleryView.destroy.called);
      assert.isTrue(this.controller.view === null);
    });
  });

  suite('PreviewGalleryController#onPreviewOptionClick()', function() {
    setup(function() {
     this.controller.view = new this.PreviewGalleryView();
     this.controller.view.showOptionsMenu = sinon.spy();
     this.controller.onOptionsClick();
    });

    test('Should open previewOption on onPreviewOptionClick', function() {
      assert.isTrue(this.controller.view.showOptionsMenu.called);
    });
  });

});
