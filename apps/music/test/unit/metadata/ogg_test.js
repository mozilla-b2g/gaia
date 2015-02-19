/* global OggMetadata, fetchBlobView, fetchBuffer, MockLazyLoader, readBlob,
   assertBuffersEqual, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/ogg.js');
require('/js/metadata/vorbis_picture.js');

suite('ogg tags', function() {
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
    fetchBlobView('/test-data/vorbis-c.ogg')
      .then(OggMetadata.parse)
      .then(function(metadata) {
        assert.strictEqual(metadata.tag_format, 'vorbis');
        assert.strictEqual(metadata.artist, 'Angra');
        assert.strictEqual(metadata.album, 'Holy Land');
        assert.strictEqual(metadata.title, 'Carolina IV');
        assert.strictEqual(metadata.tracknum, 4);
        assert.strictEqual(metadata.trackcount, 10);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
        assert.strictEqual(metadata.picture.flavor, 'unsynced');
        assert.strictEqual(metadata.picture.blob.type, 'image/jpeg');

        return readBlob(metadata.picture.blob);
      })
      .then(function(buffer) {
        assertBuffersEqual(buffer, expectedPicture);
      })
      .then(pass(done), fail(done));
  });
});
