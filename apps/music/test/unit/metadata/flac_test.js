/* global FLACMetadata, fetchBuffer, makeBlobView, MockLazyLoader, readPicSlice,
   assertBuffersEqual, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/flac.js');
require('/js/metadata/vorbis_picture.js');

suite('flac tags', function() {
  var RealLazyLoader;

  var expectedPicture;
  setup(function(done) {
    RealLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    fetchBuffer('/test-data/album-art.jpg').then(function(buffer) {
      expectedPicture = buffer;
      done();
    });
  });

  teardown(function() {
    window.LazyLoader = RealLazyLoader;
  });

  test('vorbis comment', function(done) {
    var blob;
    fetchBuffer('/test-data/vorbis-c.flac')
      .then(function(buffer) {
        return (blob = new Blob([buffer]));
      })
      .then(makeBlobView)
      .then(FLACMetadata.parse)
      .then(function(metadata) {
        assert.strictEqual(metadata.tag_format, 'flac');
        assert.strictEqual(metadata.artist, 'Black Sabbath');
        assert.strictEqual(metadata.album, 'Master of Reality');
        assert.strictEqual(metadata.title, 'Children of the Grave');
        assert.strictEqual(metadata.tracknum, 4);
        assert.strictEqual(metadata.trackcount, 8);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
        assert.strictEqual(metadata.picture.flavor, 'embedded');
        assert.strictEqual(metadata.picture.type, 'image/jpeg');

        return readPicSlice(blob, metadata.picture);
      })
      .then(function(buffer) {
        assertBuffersEqual(buffer, expectedPicture);
      })
      .then(pass(done), fail(done));
  });
});
