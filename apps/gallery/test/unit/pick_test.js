/*jshint maxlen:false, sub:true*/
/*global MockGetDeviceStorage, MockCropResizeRotate*/
/*global MocksHelper, LAYOUT_MODE, MediaDB, ImageEditor, Pick*/
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_mediadb.js');
require('/shared/test/unit/mocks/mock_crop_resize_rotate.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
require('/shared/js/media/jpeg-exif.js');
requireApp('/gallery/test/unit/mock_image_editor.js');
requireApp('/gallery/test/unit/mock_spinner.js');
requireApp('/gallery/js/pick.js');

var mocksHelper = new MocksHelper([
  'LazyLoader',
  'MediaDB',
  'ImageEditor',
  'Spinner'
]).init();

suite('pick', function() {

  mocksHelper.attachTestHelpers();

  var real$;

  var selectors;

  setup(function() {
    selectors = {};
  });

  suiteSetup(function() {
    window.cropResizeRotate = sinon.spy(MockCropResizeRotate);
    navigator.getDeviceStorage = sinon.spy(MockGetDeviceStorage);

    real$ = window.$;

    window.$ = function(selector) {
      return (selectors[selector] = selectors[selector] || {
        addEventListener: sinon.spy()
      });
    };

    window.LAYOUT_MODE = {
      pick: 'pick',
      crop: 'crop'
    };

    window.CONFIG_MAX_PICK_PIXEL_SIZE = 800 * 600;

    window.setView = sinon.spy();

    window.photodb = new MediaDB('pictures');
  });

  suiteTeardown(function() {
    window.$ = real$;
  });

  suite('start', function() {
    var activity = {
      source: {
        data: {
          type: 'image/jpeg'
        }
      }
    };

    test('Should call `setView` with `LAYOUT_MODE.pick`', function() {
      window.setView.reset();

      Pick.start(activity);
      assert.ok(window.setView.calledWith(LAYOUT_MODE.pick));
    });

    test('Should add "action" event listener to #pick-header', function() {
      Pick.start(activity);
      assert.ok(selectors['pick-header'].addEventListener.calledWith('action'));
    });

    test('Should add "action" event listener to #crop-top', function() {
      Pick.start(activity);
      assert.ok(selectors['crop-top'].addEventListener.calledWith('action'));
    });

    test('Should add "click" event listener to #crop-done-button', function() {
      Pick.start(activity);
      assert.ok(selectors['crop-done-button'].addEventListener.calledWith('click'));
    });
  });

  suite('select', function() {
    var activity = {
      source: {
        data: {
          type: 'image/jpeg'
        }
      }
    };

    var fileinfo = {
      name: '/foo/bar/baz.jpg',
      metadata: {}
    };

    test('Should show file name in the title bar if `nocrop` flag is set', function() {
      activity.source.data.nocrop = true;

      Pick.start(activity);
      Pick.select(fileinfo);
      assert.equal(selectors['crop-header'].textContent, 'baz');
      delete activity.source.data.nocrop;
    });

    test('Should call `setView` with `LAYOUT_MODE.crop`', function() {
      window.setView.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      assert.ok(window.setView.calledWith(LAYOUT_MODE.crop));
    });

    test('Should disable #crop-done-button', function() {
      Pick.start(activity);
      Pick.select(fileinfo);
      assert.isTrue(selectors['crop-done-button'].disabled);
    });

    test('Should get file from MediaDB', function() {
      window.photodb.getFile.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      assert.ok(window.photodb.getFile.calledWith(fileinfo.name));
    });

    test('Should crop/resize/rotate file', function() {
      window.cropResizeRotate.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      assert.ok(window.cropResizeRotate.called);
    });

    test('Should use external preview file if specified', function() {
      navigator.getDeviceStorage.reset();

      fileinfo.metadata.preview = {
        filename: '/foo/bar/baz_preview.jpg'
      };
      Pick.start(activity);
      Pick.select(fileinfo);
      assert.ok(navigator.getDeviceStorage.calledWith('pictures'));
    });
  });

  suite('cancel', function() {
    var activity = {
      source: {
        data: {
          type: 'image/jpeg'
        }
      },
      postError: sinon.spy()
    };

    var fileinfo = {
      name: '/foo/bar/baz.jpg',
      metadata: {}
    };

    test('Should post "pick cancelled" error', function() {
      activity.postError.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      Pick.cancel();
      assert.ok(activity.postError.calledWith('pick cancelled'));
    });
  });

  suite('restart', function() {
    var activity = {
      source: {
        data: {
          type: 'image/jpeg'
        }
      }
    };

    var fileinfo = {
      name: '/foo/bar/baz.jpg',
      metadata: {}
    };

    test('Should destroy `ImageEditor`', function(done) {
      ImageEditor.prototype.destroy.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      setTimeout(function() {
        Pick.restart();
        assert.ok(ImageEditor.prototype.destroy.called);
        done();
      });
    });

    test('Should call `setView` with `LAYOUT_MODE.pick`', function(done) {
      window.setView.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      setTimeout(function() {
        Pick.restart();
        assert.ok(window.setView.calledWith(LAYOUT_MODE.pick));
        done();
      });
    });
  });

  suite('end', function() {
    var activity = {
      source: {
        data: {
          type: 'image/jpeg'
        }
      },
      postResult: sinon.spy()
    };

    var fileinfo = {
      name: '/foo/bar/baz.jpg',
      metadata: {}
    };

    test('Should call `getCropRegion` on `ImageEditor`', function() {
      ImageEditor.prototype.getCropRegion.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      Pick.end();
      assert.ok(ImageEditor.prototype.getCropRegion.called);
    });

    test('Should *NOT* call `getCropRegion` on `ImageEditor` if `nocrop` specified',
      function() {
        ImageEditor.prototype.getCropRegion.reset();
        activity.source.data.nocrop = true;

        Pick.start(activity);
        Pick.select(fileinfo);
        Pick.end();
        assert.ok(ImageEditor.prototype.getCropRegion.notCalled);
        delete activity.source.data.nocrop;
      });

    test('Should call `postResult`', function() {
      activity.postResult.reset();

      Pick.start(activity);
      Pick.select(fileinfo);
      Pick.end();
      assert.ok(activity.postResult.called);
    });
  });

});
