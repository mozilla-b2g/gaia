/* global AlbumArt, MockFileStore, MockGetDeviceStorage, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/test/unit/metadata/mock_navigator_getdevicestorage.js');

suite('album art', function() {

  var RealGetDeviceStorage;

  setup(function(done) {
    RealGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    require('/js/metadata/album_art.js', function() {
      done();
    });
  });

  teardown(function() {
    navigator.getDeviceStorage = RealGetDeviceStorage;
  });

  var songBlob = new Blob();
  songBlob.name = '/path/to/file.mp3';

  test('embedded art', function(done) {
    var metadata = {
      picture: { flavor: 'embedded' }
    };

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        // Make sure we didn't do anything to the metadata.
        assert.deepEqual(metadata, {
          picture: { flavor: 'embedded' }
        });
      })
      .then(pass(done), fail(done));
  });

  test('unsynced art', function(done) {
    var imageData = 'an image';
    var metadata = {
      artist: 'artist',
      album: 'album',
      picture: {
        flavor: 'unsynced',
        blob: new Blob([imageData], {type: 'image/jpeg'})
      }
    };
    var pictureFilename = '/path/.music/covers/' + metadata.artist + '.' +
      metadata.album + '.' + imageData.length + '.jpg';

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        assert.deepEqual(metadata, {
          artist: 'artist',
          album: 'album',
          picture: { flavor: 'unsynced', filename: pictureFilename }
        });

        return MockFileStore.readAsText('pictures', pictureFilename);
      })
      .then(function(text) {
        assert.strictEqual(imageData, text);
      })
      .then(pass(done), fail(done));
  });

  test('unsynced art (no artist/album)', function(done) {
    var imageData = 'an image';
    var metadata = {
      picture: {
        flavor: 'unsynced',
        blob: new Blob([imageData], {type: 'image/jpeg'})
      }
    };
    var pictureFilename = '/path/.music/covers/_path_to_file.mp3.' +
      imageData.length + '.jpg';

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        assert.deepEqual(metadata, {
          picture: { flavor: 'unsynced', filename: pictureFilename }
        });

        return MockFileStore.readAsText('pictures', pictureFilename);
      })
      .then(function(text) {
        assert.strictEqual(imageData, text);
      })
      .then(pass(done), fail(done));
  });

  test('unsynced art (already stored)', function(done) {
    // These should be the same length!
    var oldImageData = 'an image';
    var newImageData = 'diffdata';

    var metadata = {
      artist: 'artist',
      album: 'album',
      picture: {
        flavor: 'unsynced',
        blob: new Blob([newImageData], {type: 'image/jpeg'})
      }
    };
    var pictureFilename = '/path/.music/covers/' + metadata.artist + '.' +
      metadata.album + '.' + newImageData.length + '.jpg';

    // Inject an existing image with slightly different data so we can tell
    // it from the metadata's "new" image.
    MockFileStore.set('pictures', pictureFilename, new Blob(
      [oldImageData], {type: 'image/jpeg'}
    ));

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        assert.deepEqual(metadata, {
          artist: 'artist',
          album: 'album',
          picture: { flavor: 'unsynced', filename: pictureFilename }
        });

        return MockFileStore.readAsText('pictures', pictureFilename);
      })
      .then(function(text) {
        assert.strictEqual(oldImageData, text);
      })
      .then(pass(done), fail(done));
  });

  test('external art', function(done) {
    var imageData = 'an image';
    var pictureFilename = '/path/to/cover.jpg';
    // Inject an external image into the same folder as our "file".
    MockFileStore.set('pictures', pictureFilename, new Blob(
      [imageData], {type: 'image/jpeg'}
    ));

    var metadata = {};

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        // Make sure we found the external cover art.
        assert.deepEqual(metadata, {
          picture: { flavor: 'external', filename: pictureFilename }
        });
      })
      .then(pass(done), fail(done));
  });

  test('no art', function(done) {
    var metadata = {};
    songBlob.name = '/another/path/to/file.mp3';

    AlbumArt.process(songBlob, metadata)
      .then(function(metadata) {
        // Make sure we didn't do anything to the metadata.
        assert.deepEqual(metadata, {});
      })
      .then(pass(done), fail(done));
  });

  test('temporary file', function(done) {
    var metadata = {};

    AlbumArt.process(new Blob(), metadata)
      .then(function(metadata) {
        // Make sure we didn't do anything to the metadata.
        assert.deepEqual(metadata, {});
      })
      .then(pass(done), fail(done));
  });

});
