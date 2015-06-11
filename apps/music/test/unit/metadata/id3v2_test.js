/* global parseMetadata, loadPicture, MockLazyLoader, MockGetDeviceStorage */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/id3v1.js');
require('/js/metadata/id3v2.js');

suite('id3v2 tags', function() {

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

  // We have a bunch of otherwise-identical mp3 files using different ID3
  // versions, covering all valid character encodings. Test them all.
  [2, 3, 4].forEach(function(version) {
    var tag_format = 'id3v2.' + version + '.0';
    suite('simple id3v2.' + version, function() {

      test('latin1', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-latin1.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.tag_format, tag_format);
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

      test('utf16', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-utf16.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'Mötley Crüe');
            assert.strictEqual(metadata.album, 'Dr. Feelgood');
            assert.strictEqual(metadata.title, 'Kickstart My Heart');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 11);
            assert.strictEqual(metadata.discnum, 1);
            assert.strictEqual(metadata.disccount, 1);
          });
        });
      });

      if (version === 4) {
        test('utf16be', function(done) {
          var filename = '/test-data/id3v2.' + version + '-simple-utf16be.mp3';
          parseMetadata(filename).then(function(metadata) {
            done(function() {
              assert.strictEqual(metadata.tag_format, tag_format);
              assert.strictEqual(metadata.artist, 'Gåte');
              assert.strictEqual(metadata.album, 'Jygri');
              assert.strictEqual(metadata.title, 'Bruremarsj frå Jämtland');
              assert.strictEqual(metadata.tracknum, 8);
              assert.strictEqual(metadata.trackcount, 12);
              assert.strictEqual(metadata.discnum, 1);
              assert.strictEqual(metadata.disccount, 1);
            });
          });
        });

        test('utf8', function(done) {
          var filename = '/test-data/id3v2.' + version + '-simple-utf8.mp3';
          parseMetadata(filename).then(function(metadata) {
            done(function() {
              assert.strictEqual(metadata.tag_format, tag_format);
              assert.strictEqual(metadata.artist, 'Lunar Aurora');
              assert.strictEqual(metadata.album, 'Hoagascht');
              assert.strictEqual(metadata.title, 'Håbergoaß');
              assert.strictEqual(metadata.tracknum, 5);
              assert.strictEqual(metadata.trackcount, 8);
              assert.strictEqual(metadata.discnum, 1);
              assert.strictEqual(metadata.disccount, 1);
            });
          });
        });
      }
    });

  });

  suite('simple id3v1+2', function() {

    test('id3v1+2', function(done) {
      parseMetadata('/test-data/id3v1+2-simple.mp3').then(function(metadata) {
        done(function() {
          // Here we should have the v2 tag content.
          assert.strictEqual(metadata.tag_format, 'id3v2.3.0');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, undefined);
        });
      });
    });

  });

  suite('album art', function() {

    var expectedPicture;
    setup(function(done) {
      loadPicture('/test-data/album-art.jpg', 'image/jpeg', 'embedded').then(
        function(data) {
          expectedPicture = data;
          done();
        }
      );
    });

    [2, 3, 4].forEach(function(version) {
      test('id3v2.' + version, function(done) {
        var filename = '/test-data/id3v2.' + version + '-picture.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.deepEqual(metadata.picture, expectedPicture);
          });
        });
      });
    });

  });

  suite('extended header', function() {

    [3, 4].forEach(function(version) {
      var tag_format = 'id3v2.' + version + '.0';

      test('id3v2.' + version, function(done) {
        var filename = '/test-data/id3v2.' + version + '-extheader.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 9);
          });
        });
      });
    });

  });

  suite('unsynchronized data', function() {

    var expectedPicture;
    setup(function(done) {
      loadPicture('/test-data/album-art.jpg', 'image/jpeg', 'unsynced').then(
        function(data) {
          expectedPicture = data;
          done();
        }
      );
    });

    [3, 4].forEach(function(version) {
      var tag_format = 'id3v2.' + version + '.0';

      test('id3v2.' + version + ' whole tag', function(done) {
        var filename = '/test-data/id3v2.' + version + '-allunsync.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.tag_format, tag_format);
            assert.strictEqual(metadata.artist, 'AC/DC');
            assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
            assert.strictEqual(metadata.title, 'Problem Child');
            assert.strictEqual(metadata.tracknum, 5);
            assert.strictEqual(metadata.trackcount, 9);
            assert.deepEqual(metadata.picture, expectedPicture);
          });
        });
      });
    });

    test('id3v2.4 selected frames', function(done) {
      var filename = '/test-data/id3v2.4-framesunsync.mp3';
      parseMetadata(filename).then(function(metadata) {
        done(function() {
          assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
          assert.strictEqual(metadata.artist, 'AC/DC');
          assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
          assert.strictEqual(metadata.title, 'Problem Child');
          assert.strictEqual(metadata.tracknum, 5);
          assert.strictEqual(metadata.trackcount, 9);
          assert.deepEqual(metadata.picture, expectedPicture);
        });
      });
    });
  });

  suite('multivalue frames', function() {

    ['latin1', 'utf16', 'utf16be', 'utf8'].forEach(function(encoding) {
      test('id3v2.4 ' + encoding, function(done) {
        var filename = '/test-data/id3v2.4-multivalue-' + encoding + '.mp3';
        parseMetadata(filename).then(function(metadata) {
          done(function() {
            assert.strictEqual(metadata.tag_format, 'id3v2.4.0');
            assert.strictEqual(metadata.artist, 'Dynatron / Perturbator');
            assert.strictEqual(metadata.album, 'I Am the Night');
            assert.strictEqual(metadata.title, 'Volcanic Machinery');
            assert.strictEqual(metadata.tracknum, 13);
            assert.strictEqual(metadata.trackcount, 15);
          });
        });
      });
    });

  });

  suite('invalid files', function() {

    [2, 3, 4].forEach(function(version) {
      suite('invalid id3v2.' + version, function() {

        test('invalid frame size', function(done) {
          var filename = '/test-data/id3v2.' + version +
                         '-invalid-frame-size.mp3';
          parseMetadata(filename).catch(function(e) {
            done();
          });
        });

        test('invalid skipped frame', function(done) {
          var filename = '/test-data/id3v2.' + version +
                         '-invalid-skipped-frame-size.mp3';
          parseMetadata(filename).catch(function() {
            done();
          });
        });
      });
    });

  });
});
