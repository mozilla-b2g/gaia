'use strict';

/* global WallpaperManager, MockLazyLoader, ImageUtils,
   MockNavigatorSettings, MockService, MocksHelper */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/image_utils.js');
require('/apps/system/js/wallpaper_manager.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/apps/system/test/unit/mock_lazy_loader.js');

var mocksForWallpaperManager = new MocksHelper([
  'Service',
  'LazyLoader'
]).init();

suite('WallpaperManager', function() {

  mocksForWallpaperManager.attachTestHelpers();
  var subject;  // The WallpaperManager instance we're testing.
  var wallpaperBlob, bigWallpaperBlob, smallWallpaperBlob;
  var dataURL, bigDataURL, smallDataURL, mockPublish;

  const DEFAULT_WALLPAPER = 'resources/images/backgrounds/default.png';

  suiteSetup(function(done) {
    var self = this;
    var sw, sh;

    // Don't display debug output
    WallpaperManager.DEBUG = false;

    // Fake URLs. Our xhr mock will recognize these strings and return blobs
    dataURL = 'data://justright';
    bigDataURL = 'data://toobig';
    smallDataURL = 'data://toosmall';

    // Map urls to blobs for the fake XHR
    var urlToBlobMap = this.urlToBlobMap = {};

    this.xhr = sinon.useFakeXMLHttpRequest();
    this.xhr.onCreate = function(request) {
      setTimeout(function() {
        var blob = urlToBlobMap[request.url];
        if (blob) {
          request.response = blob;
          request.onload();
        }
        else {
          request.onerror();
        }
      });
    };

    // How big (in device pixels) is the screen in its default orientation?
    if (MockService.mIsDefaultPortrait) {
      sw = Math.max(screen.width, screen.height);
      sh = Math.min(screen.width, screen.height);
    } else {
      // Otherwise, the width is the smaller dimension
      sw = Math.min(screen.width, screen.height);
      sh = Math.max(screen.width, screen.height);
    }

    this.screenWidth = sw * window.devicePixelRatio;
    this.screenHeight = sh * window.devicePixelRatio;

    // Create some image blobs
    var canvas = document.createElement('canvas');
    canvas.width = this.screenWidth;
    canvas.height = this.screenHeight;
    canvas.toBlob(function(blob) {
      wallpaperBlob = blob;

      canvas.width = self.screenWidth + 1;
      canvas.height = self.screenHeight + 1;
      canvas.toBlob(function(blob) {
        bigWallpaperBlob = blob;

        canvas.width = self.screenWidth >> 1;
        canvas.height = self.screenHeight >> 1;
        canvas.toBlob(function(blob) {
          smallWallpaperBlob = blob;

          // Now that we have the images defined, set up the URL mapping
          urlToBlobMap[DEFAULT_WALLPAPER] = wallpaperBlob;
          urlToBlobMap[dataURL] = wallpaperBlob;
          urlToBlobMap[bigDataURL] = bigWallpaperBlob;
          urlToBlobMap[smallDataURL] = smallWallpaperBlob;

          done();
        }, 'image/jpeg');
      }, 'image/jpeg');
    }, 'image/jpeg');
  });

  suiteTeardown(function() {
    this.xhr.restore();
  });

  setup(function() {
    this.sinon.stub(document, 'getElementById', function() {
      return document.createElement('div');
    });
    var self = this;
    // Mock settings
    this.realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    mockPublish = function(e) {
      if (self.onWallpaperChange) {
        setTimeout(function() {
          if (self.onWallpaperChange) {
            self.onWallpaperChange('wallpaperchange', e.detail);
          }
        });
      }
    };

    window.addEventListener('wallpaperchange', mockPublish);

    this.sinon.spy(MockLazyLoader, 'load');

    // Spy on WallpaperManager methods
    var proto = WallpaperManager.prototype;
    this.setWallpaperSpy = sinon.spy(proto, '_setWallpaper');
    this.toBlobSpy = sinon.spy(proto, '_toBlob');
    this.checkSizeSpy = sinon.spy(proto, '_checkSize');
    this.saveSpy = sinon.spy(proto, '_save');
    this.validateSpy = sinon.spy(proto, '_validate');
    this.publishSpy = sinon.spy(proto, '_publish');
    subject = new WallpaperManager();
  });

  teardown(function() {
    subject.stop();

    this.setWallpaperSpy.restore();
    this.toBlobSpy.restore();
    this.checkSizeSpy.restore();
    this.saveSpy.restore();
    this.validateSpy.restore();
    this.publishSpy.restore();

    window.removeEventListener('wallpaperchange', mockPublish);

    navigator.mozSettings = this.realMozSettings;
    MockNavigatorSettings.mTeardown();

    MockService.mIsDefaultPortrait = true;

    this.onWallpaperChange = null;
  });

  test('start() throws if called twice', function() {
    subject.start();
    assert.throws(function() { subject.start(); });
  });

  //
  // Test normal startup where we have a validated wallpaper blob in
  // the settings db. Verify that a wallpaperchange event is published
  // with a blob uri, and that the size of the image is not checked
  // or changed, and that the lazy loader is not invoked.
  //
  test('start with validated blob', function(done) {
    var self = this;
    // Start with a validated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaperBlob;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = true;

    // We do our assertions once we see a wallpaperchange event published.
    this.onWallpaperChange = function(type, data) {
      done(() => {
        // Check event type
        assert.equal(type, 'wallpaperchange');
        // Check that we get a blob url
        assert.equal(data.url.substring(0, 5), 'blob:');

        // Check that the methods were called the expected number of times
        sinon.assert.calledOnce(self.setWallpaperSpy);
        sinon.assert.notCalled(self.toBlobSpy);
        sinon.assert.notCalled(MockLazyLoader.load);
        sinon.assert.notCalled(self.checkSizeSpy);
        sinon.assert.notCalled(self.saveSpy);
        sinon.assert.calledOnce(self.publishSpy);
      });
    };

    subject.start();
  });

  //
  // Test normal startup followed by a change to a new wallpaper blob that
  // is too small.  Verify that the wallpaper is changed and that the
  // resulting wallpaper has the expected size and type. And that the
  // LazyLoader is used
  //
  test('change to new small wallpaper blob', function(done) {
    var self = this;
    // Start with a validated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaperBlob;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = true;

    // Wait 'till the initial wallpaper is published
    this.onWallpaperChange = function(type, data) {
      // Test assertions when we get the changed wallpaper
      self.onWallpaperChange = function(type, data) {
        // Check event type
        assert.equal(type, 'wallpaperchange');
        // Check that we get a blob url
        assert.equal(data.url.substring(0, 5), 'blob:');
        // Check that the methods were called the expected number of times

        // 3 times: initial, changed, and saved wallpapers
        assert.equal(self.setWallpaperSpy.callCount, 3);

        assert.ok(self.toBlobSpy.notCalled, '_toBlob called');
        assert.ok(MockLazyLoader.load.calledOnce);
        assert.ok(self.checkSizeSpy.calledOnce, 'checkSize called');
        assert.ok(self.saveSpy.calledOnce, 'save called');
        assert.ok(self.validateSpy.notCalled,
                  'validate not called');
        assert.equal(self.publishSpy.callCount, 2, 'publish called');
        assert.notEqual(MockNavigatorSettings.mSettings['wallpaper.image'],
                        smallWallpaperBlob);
        assert.notEqual(MockNavigatorSettings.mSettings['wallpaper.image'],
                        wallpaperBlob);
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                     true);

        var blob = MockNavigatorSettings.mSettings['wallpaper.image'];
        assert.equal(blob.type, ImageUtils.PNG);
        ImageUtils.getSizeAndType(blob).then(function resolve(data) {
          assert.equal(data.type, ImageUtils.PNG);
          assert.equal(data.width, self.screenWidth);
          assert.equal(data.height, self.screenHeight);
          done();
        });
      };

      navigator.mozSettings.createLock().set({
        'wallpaper.image': smallWallpaperBlob
      });
    };

    subject.start();
  });

  //
  // Test normal startup followed by a change to a new wallpaper blob that
  // is the right size.  Verify that the wallpaper is changed and that the
  // resulting wallpaper has the expected size and type. And that the
  // LazyLoader is used
  //
  test('change to new right-size wallpaper blob', function(done) {
    var self = this;
    // Start with a validated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaperBlob;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = true;

    // Wait 'till the initial wallpaper is published
    this.onWallpaperChange = function(type, data) {
      // Test assertions when we get the changed wallpaper
      self.onWallpaperChange = function(type, data) {
        // Check event type
        assert.equal(type, 'wallpaperchange');
        // Check that we get a blob url
        assert.equal(data.url.substring(0, 5), 'blob:');
        // Check that the methods were called the expected number of times

        assert.equal(self.setWallpaperSpy.callCount, 2);
        assert.ok(self.toBlobSpy.notCalled, '_toBlob called');
        assert.ok(MockLazyLoader.load.calledOnce);
        assert.ok(self.checkSizeSpy.calledOnce, 'checkSize called');
        assert.ok(self.saveSpy.notCalled, 'save not called');
        assert.ok(self.validateSpy.calledOnce, 'validate called');
        assert.equal(self.publishSpy.callCount, 2, 'publish called');
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image'],
                     wallpaperBlob);
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                     true);
        done();
      };

      navigator.mozSettings.createLock().set({
        'wallpaper.image': wallpaperBlob
      });
    };

    subject.start();
  });

  //
  // Test the startup process with a blob that has not been validated yet.
  // This seems to be what happens on first boot (Somewhere in the build
  // system the data uri is converted to a real blob.)
  //
  test('start with non-validated right-size blob', function(done) {
    var self = this;
    // Start with an unvalidated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaperBlob;

    // We do our assertions once we see a wallpaperchange event published.
    this.onWallpaperChange = function(type, data) {
      // Check event type
      assert.equal(type, 'wallpaperchange');
      // Check that we get a blob url
      assert.equal(data.url.substring(0, 5), 'blob:');
      // Check that the methods were called the expected number of times
      assert.ok(self.setWallpaperSpy.calledOnce);
      assert.ok(self.toBlobSpy.notCalled);
      assert.ok(MockLazyLoader.load.calledOnce);
      assert.ok(self.checkSizeSpy.calledOnce);
      assert.ok(self.saveSpy.notCalled);
      assert.ok(self.validateSpy.calledOnce);
      assert.ok(self.publishSpy.calledOnce);
      assert.equal(MockNavigatorSettings.mSettings['wallpaper.image'],
                   wallpaperBlob);
      assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                   true);
      done();
    };

    subject.start();
  });

  //
  // Test the startup process with a blob that has not been validated yet
  // and is not the right size. (This happens on first boot if we use a
  // FWVGA wallpaper on an WVGA device or vice versa, e.g.)
  //
  test('start with non-validated wrong-size blob', function(done) {
    var self = this;
    // Start with an unvalidated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = bigWallpaperBlob;

    // We do our assertions once we see a wallpaperchange event published.
    this.onWallpaperChange = function(type, data) {
      // Check event type
      assert.equal(type, 'wallpaperchange');
      // Check that we get a blob url
      assert.equal(data.url.substring(0, 5), 'blob:');
      // Check that the methods were called the expected number of times
      assert.ok(self.toBlobSpy.notCalled, '_toBlob not called');
      assert.ok(MockLazyLoader.load.calledOnce);
      assert.ok(self.checkSizeSpy.calledOnce, 'checkSize called');
      assert.ok(self.saveSpy.calledOnce, 'save called');
      assert.ok(self.validateSpy.notCalled, 'validate not called');
      assert.ok(self.publishSpy.calledOnce, 'publish called');
      assert.notEqual(MockNavigatorSettings.mSettings['wallpaper.image'],
                      wallpaperBlob);
      assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                   true);

      var blob = MockNavigatorSettings.mSettings['wallpaper.image'];
      assert.equal(blob.type, ImageUtils.PNG);
      ImageUtils.getSizeAndType(blob).then(function resolve(data) {
        assert.equal(data.type, ImageUtils.PNG);
        assert.equal(data.width, self.screenWidth);
        assert.equal(data.height, self.screenHeight);
        done();
      });
    };

    subject.start();
  });

  //
  // Test changed wallpaper in landscape orientation. Verify that
  // the wallpaper is resized and that the resulting wallpaper has
  // the expected size.
  //
  test('start and change wallpaper in landscape mode', function(done) {
    var self = this;
    MockService.mIsDefaultPortrait = false;
    // Start with a validated blob in the settings db
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaperBlob;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = true;

    // Wait 'till the initial wallpaper is published
    this.onWallpaperChange = function(type, data) {
      // Test assertions when we get the changed wallpaper
      self.onWallpaperChange = function(type, data) {
        // Check event type
        assert.equal(type, 'wallpaperchange');
        // Check that we get a blob url
        assert.equal(data.url.substring(0, 5), 'blob:');
        // Check that the methods were called the expected number of times

        // 3 times: initial, changed, and saved wallpapers
        assert.equal(self.setWallpaperSpy.callCount, 3);
        assert.ok(self.toBlobSpy.notCalled, '_toBlob not called');
        assert.ok(MockLazyLoader.load.calledOnce);
        assert.ok(self.checkSizeSpy.calledOnce, 'checkSize called');
        assert.ok(self.saveSpy.calledOnce, 'save called');
        assert.ok(self.validateSpy.notCalled,
                  'validate not called');
        assert.equal(self.publishSpy.callCount, 2, 'publish called');
        assert.notEqual(MockNavigatorSettings.mSettings['wallpaper.image'],
                        wallpaperBlob);
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                     true);

        var blob = MockNavigatorSettings.mSettings['wallpaper.image'];
        ImageUtils.getSizeAndType(blob).then(function resolve(data) {
          // Check the resized wallpaper in landscape orientation to have
          // width as bigger dimension that equals screenHeight.
          assert.equal(data.width, self.screenHeight);
          assert.equal(data.height, self.screenWidth);
          done();
        });
      };

      navigator.mozSettings.createLock().set({
        'wallpaper.image': wallpaperBlob
      });
    };

    subject.start();
  });

  //
  // The tests that follow call this utility function and test what happens
  // when we use URLs and invalid values as the wallpaper value.
  //
  function testWallpaperValue(self, input, expectedOutput, done,
                              toBlobCallCount,
                              checkSizeCallCount) {
    MockNavigatorSettings.mSettings['wallpaper.image'] = input;

    // We do our assertions once we see a wallpaperchange event published.
    self.onWallpaperChange = function(type, data) {
      try {
        // Check that the methods were called the expected number of times
        assert.equal(self.toBlobSpy.callCount,
                  toBlobCallCount || 1,
                  'convert to blob call count');
        assert.ok(MockLazyLoader.load.called,
                  'lazy loader used');
        assert.equal(self.checkSizeSpy.callCount,
                     checkSizeCallCount || 1,
                     'check wallpaper called');
        assert.ok(self.saveSpy.calledOnce,
                 'save called once');
        assert.ok(self.publishSpy.calledOnce, 'publish called once');
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image.valid'],
                     true);

        var blob = MockNavigatorSettings.mSettings['wallpaper.image'];
        if (expectedOutput) {
          assert.equal(blob, expectedOutput, 'saved blob is as expected');
          done();
        }
        else {
          ImageUtils.getSizeAndType(blob).then(function resolve(data) {
            assert.equal(data.width, self.screenWidth);
            assert.equal(data.height, self.screenHeight);
            done();
          })['catch'](function(err) {
            assert.isFalse(err);
          });
        }
      }
      catch(ex) {
        done(ex);
      }
    };

    subject.start();
  }

  // No value in the settings db at all
  test('undefined wallpaper', function(done) {
    testWallpaperValue(this, undefined, wallpaperBlob, done);
  });

  // Non-blob, non-URL value in the settings db
  test('invalid wallpaper', function(done) {
    testWallpaperValue(this, 1, wallpaperBlob, done);
  });

  // default wallpaper url in settings db
  test('default wallpaper url', function(done) {
    testWallpaperValue(this, DEFAULT_WALLPAPER, wallpaperBlob, done);
  });

  // Data url that resolves to a right-size image 
  test('right-size data uri', function(done) {
    testWallpaperValue(this, this.dataURL, wallpaperBlob, done);
  });

  // Data url that resolves to a small image
  test('small data uri', function(done) {
    testWallpaperValue(this, this.smallDataURL, null, done);
  });

  // Data url that resolves to a big image
  test('big data uri', function(done) {
    testWallpaperValue(this, this.bigDataURL, null, done);
  });

  // URL that causes an XHR error and forces fallback on default
  test('broken URL', function(done) {
    testWallpaperValue(this, '/foo/bar', wallpaperBlob, done, 2);
  });

  // Invalid image blob that forces fallback on default
  test('broken image blob', function(done) {
    var badBlob = new Blob(['GIF89a'], { type: 'image/gif' });
    testWallpaperValue(this, badBlob, wallpaperBlob, done, 1, 2);
  });

  // default wallpaper is wrong size
  test('default wallpaper url', function(done) {
    this.urlToBlobMap[DEFAULT_WALLPAPER] = smallWallpaperBlob;
    testWallpaperValue(this, DEFAULT_WALLPAPER, null, done);
  });
});
