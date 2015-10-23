suite('controllers/media', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'controllers/media',
      'lib/settings',
    ], function(App, MediaController, Settings) {
      self.MediaController =
         MediaController.MediaController;
      self.Settings = Settings;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.require = sinon.stub();
    this.app.activity = {};
    this.app.settings.previewGallery = {
      get: sinon.spy()
    };

    // Our test instance
    this.controller = new this.MediaController(this.app);
  });

  suite('MediaController()', function() {
    setup(function() {
      this.controller.settings = {
        previewGallery: {
          get: sinon.spy()
        }
      };

      this.clock = sinon.useFakeTimers();
    });

    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('storage:itemdeleted'));
      assert.ok(this.app.on.calledWith('storage:changed'));
      assert.ok(this.app.on.calledWith('previewgallery:deletevideo'));
      assert.ok(this.app.on.calledWith('previewgallery:deletepicture'));
      assert.ok(this.app.on.calledWith('newmedia'));
      assert.ok(this.app.on.calledWith('hidden'));
      assert.ok(this.app.on.calledWith('lazyloaded'));
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

      this.controller.items.unshift = sinon.spy();
      this.controller.updateThumbnail = sinon.spy();
      this.controller.onNewMedia(item);
      assert.ok(this.controller.items.unshift.called);
      assert.ok(this.controller.updateThumbnail.called);
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

      this.controller.configure = sinon.spy();
      this.controller.updateThumbnail = sinon.spy();
      this.controller.onNewMedia(item);
      this.controller.onStorageChanged('unavailable');
      assert.ok(this.controller.configure.called);
      assert.ok(this.controller.updateThumbnail.called);
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

      this.controller.updateThumbnail = sinon.spy();
      this.controller.updatePreviewGallery = sinon.spy();
      this.controller.onNewMedia(item);
      this.controller.onItemDeleted(data);
      sinon.assert.calledWith(this.app.emit, 'media:deleted');
    });

    test('Should close the preview on blur if in \'secureMode\'', function() {
      this.app.inSecureMode = true;
      this.controller.closePreview = sinon.spy();
      this.controller.configure = sinon.spy();
      this.controller.updateThumbnail = sinon.spy();
      this.controller.onHidden();
      assert.ok(this.controller.configure.called);
      assert.ok(this.controller.updateThumbnail.called);
      sinon.assert.calledWith(this.app.emit, 'media:configured');
    });
  });
});
