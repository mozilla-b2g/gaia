/* global ID3v2Metadata, fetchBlobView, fetchBuffer, makeBlobView,
   MockLazyLoader, readBlob, readPicSlice, assertBuffersEqual, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/id3v1.js');
require('/js/metadata/id3v2.js');

suite('id3v2 tags', function() {

  // We have a bunch of otherwise-identical mp3 files using different ID3
  // versions, covering all valid character encodings. Test them all.
  [2, 3, 4].forEach(function(version) {
    var tag_format = 'id3v2.' + version + '.0';
    suite('simple id3v2.' + version, function() {

      test('latin1', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-latin1.mp3';
        fetchBlobView(filename)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 9);
            assert.strictEqual(metadata.discnum, 1);
            assert.strictEqual(metadata.disccount, 1);
          })
          .then(pass(done), fail(done));
      });

      test('utf16', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-utf16.mp3';
        fetchBlobView(filename)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'Mötley Crüe');
            assert.strictEqual(metadata.album, 'Dr. Feelgood');
            assert.strictEqual(metadata.title, 'Kickstart My Heart');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 11);
            assert.strictEqual(metadata.discnum, 1);
            assert.strictEqual(metadata.disccount, 1);
          })
          .then(pass(done), fail(done));
      });

      if (version === 4) {
        test('utf16be', function(done) {
          var filename = '/test-data/id3v2.' + version + '-simple-utf16be.mp3';
          fetchBlobView(filename)
            .then(ID3v2Metadata.parse)
            .then(function(metadata) {
              assert.strictEqual(metadata.tag_format, tag_format);
              assert.strictEqual(metadata.artist, 'Gåte');
              assert.strictEqual(metadata.album, 'Jygri');
              assert.strictEqual(metadata.title, 'Bruremarsj frå Jämtland');
              assert.strictEqual(metadata.tracknum, 8);
              assert.strictEqual(metadata.trackcount, 12);
              assert.strictEqual(metadata.discnum, 1);
              assert.strictEqual(metadata.disccount, 1);
            })
            .then(pass(done), fail(done));
        });

        test('utf8', function(done) {
          var filename = '/test-data/id3v2.' + version + '-simple-utf8.mp3';
          fetchBlobView(filename)
            .then(ID3v2Metadata.parse)
            .then(function(metadata) {
              assert.strictEqual(metadata.tag_format, tag_format);
              assert.strictEqual(metadata.artist, 'Lunar Aurora');
              assert.strictEqual(metadata.album, 'Hoagascht');
              assert.strictEqual(metadata.title, 'Håbergoaß');
              assert.strictEqual(metadata.tracknum, 5);
              assert.strictEqual(metadata.trackcount, 8);
              assert.strictEqual(metadata.discnum, 1);
              assert.strictEqual(metadata.disccount, 1);
            })
            .then(pass(done), fail(done));
        });
      }
    });

  });

  suite('simple id3v1+2', function() {

    test('id3v1+2', function(done) {
      var filename = '/test-data/id3v1+2-simple.mp3';
      fetchBlobView(filename)
        .then(ID3v2Metadata.parse)
        .then(function(metadata) {
          // Here we should have the v2 tag content.
          assert.strictEqual(metadata.tag_format, 'id3v2.3.0');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, undefined);
        })
        .then(pass(done), fail(done));
    });

  });

  suite('album art', function() {

    var expectedPicture;
    setup(function(done) {
      fetchBuffer('/test-data/album-art.jpg').then(function(buffer) {
        expectedPicture = buffer;
        done();
      });
    });

    [2, 3, 4].forEach(function(version) {
      test('id3v2.' + version, function(done) {
        var blob, filename = '/test-data/id3v2.' + version + '-picture.mp3';
        fetchBuffer(filename)
          .then(function(buffer) {
            return (blob = new Blob([buffer]));
          })
          .then(makeBlobView)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
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

  });

  suite('extended header', function() {

    [3, 4].forEach(function(version) {
      var tag_format = 'id3v2.' + version + '.0';

      test('id3v2.' + version, function(done) {
        var filename = '/test-data/id3v2.' + version + '-extheader.mp3';
        fetchBlobView(filename)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 9);
          })
          .then(pass(done), fail(done));
      });
    });

  });

  suite('unsynchronized data', function() {

    var expectedPicture;
    setup(function(done) {
      fetchBuffer('/test-data/album-art.jpg').then(function(buffer) {
        expectedPicture = buffer;
        done();
      });
    });

    [3, 4].forEach(function(version) {
      var tag_format = 'id3v2.' + version + '.0';

      test('id3v2.' + version + ' whole tag', function(done) {
        var filename = '/test-data/id3v2.' + version + '-allunsync.mp3';
        fetchBlobView(filename)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 9);
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

    test('id3v2.4 selected frames', function(done) {
      var filename = '/test-data/id3v2.4-framesunsync.mp3';
      fetchBlobView(filename)
        .then(ID3v2Metadata.parse)
        .then(function(metadata) {
          assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, 9);
          assert.strictEqual(metadata.picture.flavor, 'unsynced');
          assert.strictEqual(metadata.picture.blob.type, 'image/jpeg');

          return readBlob(metadata.picture.blob);
        })
        .then(function(buffer) {
          assertBuffersEqual(buffer, expectedPicture);
        })
        .then(pass(done), fail(done));
    });

    test('id3v2.4 selected frames with data length indicator', function(done) {
      var filename = '/test-data/id3v2.4-framesunsync-datalen.mp3';
      fetchBlobView(filename)
        .then(ID3v2Metadata.parse)
        .then(function(metadata) {
          assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, 9);
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

  suite('multivalue frames', function() {

    ['latin1', 'utf16', 'utf16be', 'utf8'].forEach(function(encoding) {
      test('id3v2.4 ' + encoding, function(done) {
        var filename = '/test-data/id3v2.4-multivalue-' + encoding + '.mp3';
        fetchBlobView(filename)
          .then(ID3v2Metadata.parse)
          .then(function(metadata) {
            assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
            assert.strictEqual(metadata.artist, 'Dynatron / Perturbator');
            assert.strictEqual(metadata.album, 'I Am the Night');
            assert.strictEqual(metadata.title, 'Volcanic Machinery');
            assert.strictEqual(metadata.tracknum, 13);
            assert.strictEqual(metadata.trackcount, 15);
          })
          .then(pass(done), fail(done));
      });
    });

  });

  suite('invalid files', function() {
    var RealLazyLoader;

    setup(function() {
      RealLazyLoader = window.LazyLoader;
      window.LazyLoader = MockLazyLoader;
    });

    teardown(function() {
      window.LazyLoader = RealLazyLoader;
    });

    [2, 3, 4].forEach(function(version) {
      suite('invalid id3v2.' + version, function() {

        test('invalid frame size', function(done) {
          var filename = '/test-data/id3v2.' + version +
                         '-invalid-frame-size.mp3';
          fetchBlobView(filename)
            .then(ID3v2Metadata.parse)
            .then(function(metadata) {
              assert.strictEqual(metadata.tag_format, undefined);
              assert.strictEqual(metadata.artist, undefined);
              assert.strictEqual(metadata.album, undefined);
              assert.strictEqual(metadata.title, undefined);
              assert.strictEqual(metadata.tracknum, undefined);
              assert.strictEqual(metadata.trackcount, undefined);
              assert.strictEqual(metadata.discnum, undefined);
              assert.strictEqual(metadata.disccount, undefined);
            })
            .then(pass(done), fail(done));
        });

        test('invalid skipped frame', function(done) {
          var filename = '/test-data/id3v2.' + version +
                         '-invalid-skipped-frame-size.mp3';
          fetchBlobView(filename)
            .then(ID3v2Metadata.parse)
            .then(function(metadata) {
              assert.strictEqual(metadata.tag_format, undefined);
              assert.strictEqual(metadata.artist, undefined);
              assert.strictEqual(metadata.album, undefined);
              assert.strictEqual(metadata.title, undefined);
              assert.strictEqual(metadata.tracknum, undefined);
              assert.strictEqual(metadata.trackcount, undefined);
              assert.strictEqual(metadata.discnum, undefined);
              assert.strictEqual(metadata.disccount, undefined);
            })
            .then(pass(done), fail(done));
        });
      });
    });

    test('id3v1+2 with invalid ID3v2 frame size', function(done) {
      var filename = '/test-data/id3v1+2-invalid-frame-size.mp3';
      fetchBlobView(filename)
        .then(ID3v2Metadata.parse)
        .then(function(metadata) {
          // Here we should have the v1 tag content.
          assert.strictEqual(metadata.tag_format, 'id3v1');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child OLD');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, undefined);
        })
        .then(pass(done), fail(done));
    });

  });
});
