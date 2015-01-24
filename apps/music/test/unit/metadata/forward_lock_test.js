/* global fetchBuffer, ForwardLock, parseMetadataBlob, MockLazyLoader,
   MockGetDeviceStorage */
'use strict';

require('/test/unit/metadata/utils.js');
require('/shared/js/omadrm/fl.js');
require('/js/metadata/forward_lock.js');
require('/js/metadata/id3v1.js');
require('/js/metadata/id3v2.js');

suite('forwardlock files', function() {

  var RealLazyLoader, RealGetDeviceStorage, RealForwardLockGetKey;

  var secret = 0xDEADBEEF;
  function mockGetKey(secret, callback) {
    callback(secret);
  }

  setup(function(done) {
    this.timeout(1000);
    RealLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    RealGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    RealForwardLockGetKey = ForwardLock.getKey;
    ForwardLock.getKey = mockGetKey.bind(this, secret);

    require('/js/metadata_scripts.js', function() {
      done();
    });
  });

  teardown(function() {
    window.LazyLoader = RealLazyLoader;
    navigator.getDeviceStorage = RealGetDeviceStorage;
    ForwardLock.getKey = RealForwardLockGetKey;
  });

  test('mp3 with id3v2 tag', function(done) {
    var vendorMetadata = {vendor: 'Songs for Cool Kids, Inc'};
    fetchBuffer('/test-data/id3v2.4-simple-latin1.mp3').then(function(buffer) {
      return ForwardLock.lockBuffer(
        secret, buffer, 'audio/mpeg', vendorMetadata
      );
    }).then(parseMetadataBlob).then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.locked, true);
        assert.strictEqual(metadata.vendor, vendorMetadata.vendor);
        assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
        assert.strictEqual(metadata.artist, 'AC/DC');
        assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.strictEqual(metadata.title, 'Problem Child');
        assert.strictEqual(metadata.tracknum, 5);
        assert.strictEqual(metadata.trackcount, 9);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
      });
    });
  });

  test('mp3 with no metadata', function(done) {
    var vendorMetadata = {vendor: 'Songs for Cool Kids, Inc',
                          name: 'The Song That Never Ends'};
    fetchBuffer('/test-data/no-tag.mp3').then(function(buffer) {
      return ForwardLock.lockBuffer(
        secret, buffer, 'audio/mpeg', vendorMetadata
      );
    }).then(parseMetadataBlob).then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.locked, true);
        assert.strictEqual(metadata.vendor, vendorMetadata.vendor);
        assert.strictEqual(metadata.artist, '');
        assert.strictEqual(metadata.album, '');
        assert.strictEqual(metadata.title, vendorMetadata.name);
      });
    }).catch(done);
  });

  test('decrypting forwardlock with no secret key', function(done) {
    fetchBuffer('/test-data/id3v2.4-simple-latin1.mp3').then(function(buffer) {
      return ForwardLock.lockBuffer(
        secret, buffer, 'audio/mpeg', {vendor: 'vendor'}
      );
    }).then(function(blob) {
      ForwardLock.getKey = mockGetKey.bind(this, null);
      return blob;
    }).catch(function(err) {
      // Make sure we haven't hit an error yet...
      done(new Error('failed to encrypt our test file'));
    }).then(parseMetadataBlob).then(function(metadata) {
      done(new Error('parsing should have failed, but succeeded somehow?'));
    }).catch(function() {
      done(null);
    });
  });

});
