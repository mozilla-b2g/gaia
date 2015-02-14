/* global AudioMetadata, fetchBuffer, MockLazyLoader, readBlob,
   assertBuffersEqual, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/shared/js/omadrm/fl.js');
require('/js/metadata/forward_lock.js');
require('/js/metadata/id3v1.js');
require('/js/metadata/id3v2.js');
require('/js/metadata/ogg.js');
require('/js/metadata/vorbis_picture.js');

suite('core metadata parsing', function() {

  var RealLazyLoader, expectedPicture;

  setup(function(done) {
    RealLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    require('/js/metadata/core.js')
      .then(function() {
        return fetchBuffer('/test-data/album-art.jpg');
      })
      .then(function(data) {
        expectedPicture = data;
        done();
      });
  });

  teardown(function() {
    window.LazyLoader = RealLazyLoader;
  });

  test('3gp video rejected', function(done) {
    var blob = new Blob([new Uint8Array(256)]);
    blob.name = 'DCIM/video.3gp';
    AudioMetadata.parse(blob)
      .then(fail(done, '3gp video wasn\'t rejected'), pass(done));
  });

  test('small file rejected', function(done) {
    var blob = new Blob([]);
    AudioMetadata.parse(blob)
      .then(fail(done, 'small file wasn\'t rejected'), pass(done));
  });

  test('ordinary file', function(done) {
    fetchBuffer('/test-data/vorbis-c.ogg')
      .then(function(data) {
        return AudioMetadata.parse(new Blob([data]));
      })
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

  test('no metadata', function(done) {
    var filename = '/test-data/no-tag.mp3';
    fetchBuffer(filename)
      .then(function(buffer) {
        var blob = new Blob([buffer]);
        blob.name = filename;
        return blob;
      })
      .then(AudioMetadata.parse)
      .then(function(metadata) {
        assert.strictEqual(metadata.tag_format, undefined);
        assert.strictEqual(metadata.artist, '');
        assert.strictEqual(metadata.album, '');
        assert.strictEqual(metadata.title, 'no-tag');
      })
      .then(pass(done), fail(done));
  });

});
