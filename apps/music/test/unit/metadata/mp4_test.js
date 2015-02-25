/* global parseMetadata, loadPicture, MockLazyLoader, MockGetDeviceStorage */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/mp4.js');

suite('mp4', function () {
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


  suite('mp4 tags', function() {
    var expectedPicture;
    setup(function(done) {
      loadPicture('/test-data/album-art.jpg', 'image/jpeg', 'embedded').then(
        function(data) {
          expectedPicture = data;
          done();
        }
      );
    });


    test('m4a tags', function(done) {
      parseMetadata('/test-data/aac-tags.m4a').then(function(metadata) {
        done(function() {
          assert.strictEqual(metadata.tag_format, 'mp4');
          assert.strictEqual(metadata.artist, 'The Tragically Hip');
          assert.strictEqual(metadata.album, 'Trouble At The Henhouse');
          assert.strictEqual(metadata.title, 'Giftshop');
          assert.strictEqual(metadata.tracknum, 1);
          assert.strictEqual(metadata.trackcount, 12);
          assert.strictEqual(metadata.discnum, 1);
          assert.strictEqual(metadata.disccount, 1);
          assert.deepEqual(metadata.picture, expectedPicture);
        });
      });
    });
  });

});
