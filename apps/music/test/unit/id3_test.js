/* global parseMetadata */
'use strict';

require('/test/unit/metadata_utils.js');

// We have a bunch of otherwise-identical mp3 files using different ID3
// versions, covering all valid character encodings. Test them all.
[2, 3, 4].forEach(function(version) {
  suite('simple id3v2.' + version, function() {

    setup(function() {
      this.timeout(1000);
    });

    test('latin1', function (done) {
      parseMetadata('/test-data/id3v2.' + version + '-simple-latin1.mp3',
                    function(metadata) {
                      assert.equal(metadata.artist, 'AC/DC');
                      assert.equal(metadata.album,
                                   'Dirty Deeds Done Dirt Cheap');
                      assert.equal(metadata.title, 'Problem Child');
                      assert.equal(metadata.tracknum, 5);
                    },
                    done);
    });


    test('utf16', function (done) {
      parseMetadata('/test-data/id3v2.' + version + '-simple-utf16.mp3',
                    function(metadata) {
                      assert.equal(metadata.artist, 'Mötley Crüe');
                      assert.equal(metadata.album, 'Dr. Feelgood');
                      assert.equal(metadata.title, 'Kickstart My Heart');
                      assert.equal(metadata.tracknum, 5);
                    },
                    done);
    });

    if (version === 4) {
      test('utf16be', function (done) {
        parseMetadata('/test-data/id3v2.' + version + '-simple-utf16be.mp3',
                      function(metadata) {
                        assert.equal(metadata.artist, 'Gåte');
                        assert.equal(metadata.album, 'Jygri');
                        assert.equal(metadata.title, 'Bruremarsj frå Jämtland');
                        assert.equal(metadata.tracknum, 8);
                      },
                      done);
      });

      test('utf8', function (done) {
        parseMetadata('/test-data/id3v2.' + version + '-simple-utf8.mp3',
                      function(metadata) {
                        assert.equal(metadata.artist, 'Lunar Aurora');
                        assert.equal(metadata.album, 'Hoagascht');
                        assert.equal(metadata.title, 'Håbergoaß');
                        assert.equal(metadata.tracknum, 5);
                      },
                      done);
      });
    }
  });
});

suite('simple id3v1', function() {

  setup(function() {
    this.timeout(1000);
  });


  test('id3v1', function (done) {
    parseMetadata('/test-data/id3v1-simple.mp3',
                  function(metadata) {
                    assert.equal(metadata.artist, 'AC/DC');
                    assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
                    assert.equal(metadata.title, 'Problem Child');
                    assert.equal(metadata.tracknum, 5);
                  },
                  done);
  });

  test('id3 v1+v2', function (done) {
    parseMetadata('/test-data/id3v1+2-simple.mp3',
                 function(metadata) {
                   // Here we should have the v2 tag content.
                   assert.equal(metadata.artist, 'AC/DC');
                   assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
                   assert.equal(metadata.title, 'Problem Child');
                   assert.equal(metadata.tracknum, 5);
                 },
                 done);
  });
});

suite('album art', function() {

  setup(function() {
    this.timeout(1000);
  });

  [2, 3, 4].forEach(function(version) {
    test('id3v2.' + version, function (done) {
      parseMetadata('/test-data/id3v2.' + version + '-picture.mp3',
                    function(metadata) {
                      assert.equal(metadata.artist, 'AC/DC');
                      assert.equal(metadata.album,
                                   'Dirty Deeds Done Dirt Cheap');
                      assert.equal(metadata.title, 'Problem Child');
                      assert.equal(metadata.tracknum, 5);
                      assert.equal(metadata.picture.type, 'image/jpeg');
                      // For now, just test that we got the expected size
                      // for the album art.
                      assert.equal(metadata.picture.end -
                                   metadata.picture.start,
                                   3);
                    },
                    done);
    });
  });
});
