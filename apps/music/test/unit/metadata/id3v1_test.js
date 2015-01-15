/* global fetchBuffer, parseMetadata, parseMetadataBlob, MockLazyLoader,
   MockGetDeviceStorage */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/id3v1.js');

suite('id3v1 tags', function() {

  var RealLazyLoader, RealGetDeviceStorage;

  setup(function(done) {
    this.timeout(1000);
    RealLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    RealGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    require('/js/metadata_scripts.js', function() {
      done();
    });
  });

  teardown(function() {
    window.LazyLoader = RealLazyLoader;
    navigator.getDeviceStorage = RealGetDeviceStorage;
  });

  test('id3v1', function(done) {
    parseMetadata('/test-data/id3v1-simple.mp3').then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.tag_format, 'id3v1');
        assert.strictEqual(metadata.artist, 'AC/DC');
        assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.strictEqual(metadata.title, 'Problem Child');
        assert.strictEqual(metadata.tracknum, 5);
        assert.strictEqual(metadata.trackcount, undefined);
      });
    });
  });

  test('no metadata', function(done) {
    fetchBuffer('/test-data/no-tag.mp3').then(function(buffer) {
      var blob = new Blob([buffer]);
      blob.name = 'no-tag.mp3';
      return blob;
    }).then(parseMetadataBlob).then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.tag_format, undefined);
        assert.strictEqual(metadata.artist, '');
        assert.strictEqual(metadata.album, '');
        assert.strictEqual(metadata.title, 'no-tag');
      });
    }).catch(function(err) {
      done(err);
    });
  });

});
