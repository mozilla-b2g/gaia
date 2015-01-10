/* global parseMetadata, MockLazyLoader, MockGetDeviceStorage, loadPicture */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/flac.js');
require('/js/metadata/vorbis_picture.js');

suite('flac tags', function() {
  var RealLazyLoader, RealGetDeviceStorage;

  var expectedPicture;
  setup(function(done) {
    this.timeout(1000);
    RealLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    RealGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    require('/js/metadata_scripts.js', function() {
      done();
    });

    loadPicture('/test-data/album-art.jpg', 'image/jpeg', 'embedded').then(
      function(data) {
        expectedPicture = data;
        done();
      }
    );
  });

  teardown(function() {
    window.LazyLoader = RealLazyLoader;
    navigator.getDeviceStorage = RealGetDeviceStorage;
  });

  test('vorbis comment', function(done) {
    parseMetadata('/test-data/vorbis-c.flac').then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.tag_format, 'flac');
        assert.strictEqual(metadata.artist, 'Black Sabbath');
        assert.strictEqual(metadata.album, 'Master of Reality');
        assert.strictEqual(metadata.title, 'Children of the Grave');
        assert.strictEqual(metadata.tracknum, 4);
        assert.strictEqual(metadata.trackcount, 8);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
        assert.deepEqual(metadata.picture, expectedPicture);
      });
    });
  });
});
