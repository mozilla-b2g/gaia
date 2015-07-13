/* global Playlist */
/* jshint multistr: true */
'use strict';

require('/js/playlist.js');

var sample1 = '#EXTM3U\n' +
    '#EXTINF:,It\'s Raining Again\n' +
    'Supertramp/_..Famous Last Words/03 It\'s Raining Again.mp3\n' +
    '#EXTINF:301,3e Sexe\n' +
    '/home/hub/Music/Indochine/3/13e_sexe.ogg\n' +
    '#EXTINF:-1,My Cool Stream\n' +
    'http://www.site.com:8000/listen.pls\n';

var MockGetDeviceStorage = function() {
  return {
    get: function(filepath) {
      return {
        set onsuccess(cb) {
          cb.call(this);
        },
        get result() {
          var file = new Blob([sample1], {});
          return file;
        }
      };
    },
  };
};

suite('m3u playlist', function() {
  var realNavigatorGetDeviceStorage;

  suiteSetup(function() {
    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;
    this.timeout(1000);
  });

  suiteTeardown(function() {
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
  });

  test('url', function() {
    assert.ok(Playlist.isUrl('file://tmp/foo.mp3'));
    assert.ok(Playlist.isUrl('http://www.stream.invalid/foo.mp3'));
    assert.ok(Playlist.isUrl('https://www.stream.invalid/foo.mp3'));
    assert.ok(Playlist.isUrl('mms://www.stream.invalid/foo.mp3'));
    assert.ok(Playlist.isUrl('rtmp://www.stream.invalid/foo.mp3'));
    assert.ok(!Playlist.isUrl('c:/tmp/foo.mp3'));
    assert.ok(!Playlist.isUrl('/tmp/foo.mp3'));
  });

  test('load', function() {
    var pl = new Playlist('/home/hub/Music/my playlist.m3u');
    pl.fromString(sample1);

    assert.strictEqual(pl.directory, '/home/hub/Music/');

    var n = pl._makeAbsolutePath('ACDC/Thunderstruck.mp3');
    assert.strictEqual('/home/hub/Music/ACDC/Thunderstruck.mp3', n);
    n = pl._makeAbsolutePath('/tmp/ACDC/Thunderstruck.mp3');
    assert.strictEqual('/tmp/ACDC/Thunderstruck.mp3', n);

    var songs = pl.songs;

    assert.strictEqual(songs.length, 3);

    assert.strictEqual(songs[0],
                       '/home/hub/Music/Supertramp/' +
                       '_..Famous Last Words/03 It\'s Raining Again.mp3');

    assert.strictEqual(songs[1],
                       '/home/hub/Music/Indochine/3/13e_sexe.ogg');

    assert.strictEqual(songs[2],
                       'http://www.site.com:8000/listen.pls');
  });

  test('parse', function(done) {
    Playlist.parse('apps/music/test-data/playlists/my_playlist.m3u')
      .then(function(pl) {
        done(function() {
          var songs = pl.songs;
          assert.strictEqual(songs.length, 3);

          assert.strictEqual(songs[0],
                             'apps/music/test-data/playlists/Supertramp/' +
                             '_..Famous Last Words/03 It\'s Raining Again.mp3');

          assert.strictEqual(songs[1],
                             '/home/hub/Music/Indochine/3/13e_sexe.ogg');
        });
      }, function(reason) {
        console.log('rejected', reason.message);
      });
  });

  test('playlist manipulation', function() {
    var pl = new Playlist('/home/hub/Music/my playlist.m3u');

    // add song.
    pl.addSong('/home/hub/Music/Stairway to haven.mp3');

    // add song at index.
    pl.addSong('/home/hub/Music/Communication breakdown.mp3', 0);

    pl.addSong('/home/hub/Music/Kashmir.mp3');

    // add extended format song.
    pl.addSong('/home/hub/Music/Song Remain the same.mp3');
    assert.strictEqual(pl.songs.length, 4);
    assert.strictEqual(pl.songs[0],
                       '/home/hub/Music/Communication breakdown.mp3');
    assert.strictEqual(pl.songs[1],
                       '/home/hub/Music/Stairway to haven.mp3');

    // test remove song
    pl.removeSong('/home/hub/Music/Kashmir.mp3');
    assert.strictEqual(pl.songs.length, 3);

    assert.strictEqual(pl.songs[2],
                      '/home/hub/Music/Song Remain the same.mp3');

    // add duplicate (valid)
    pl.addSong('/home/hub/Music/Kashmir.mp3', 0);
    assert.strictEqual(pl.songs.length, 4);
    pl.addSong('/home/hub/Music/Kashmir.mp3');
    assert.strictEqual(pl.songs.length, 5);
    assert.strictEqual(pl.songs[0],
                       '/home/hub/Music/Kashmir.mp3');
    assert.strictEqual(pl.songs[4],
                       '/home/hub/Music/Kashmir.mp3');

    // remove the duplicate
    pl.removeSong('/home/hub/Music/Kashmir.mp3');
    assert.strictEqual(pl.songs.length, 4);
    assert.strictEqual(pl.songs[0],
                       '/home/hub/Music/Communication breakdown.mp3');
    assert.strictEqual(pl.songs[3],
                       '/home/hub/Music/Kashmir.mp3');

    // remove by index
    pl.removeSongAt(2);
    assert.strictEqual(pl.songs.length, 3);
    assert.strictEqual(pl.songs[2],
                       '/home/hub/Music/Kashmir.mp3');
  });

  test('save', function() {
    var pl = new Playlist('/home/hub/Music/my playlist.m3u');

    pl.addSong('Stairway to haven.mp3');

    pl.addSong('/home/hub/Music/Song Remain the same.mp3');
    assert.strictEqual(pl.songs.length, 2);

    var output =  pl.toString();

    var lines = output.split('\n');
    assert.strictEqual(lines[0], '#EXTM3U');
    assert.strictEqual(lines[1], '/home/hub/Music/Stairway to haven.mp3');
    assert.strictEqual(lines[2], '/home/hub/Music/Song Remain the same.mp3');
  });
});
