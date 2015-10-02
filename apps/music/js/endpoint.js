/* exported open */ // Should not be needed, but JSHint complains
/* global AlbumArtCache, AudioMetadata, Database, LazyLoader, PlaybackQueue,
          bridge, navigateToURL */
'use strict';

var audio = document.getElementById('audio');

var loadQueueSettings = PlaybackQueue.loadSettings();

var currentFilePath = null;
var currentQueue    = null;
var isInterrupted   = false;
var isFastSeeking   = false;
var isStopped       = true;

var service = bridge.service('music-service')
  .method('play', play)
  .method('pause', pause)
  .method('seek', seek)
  .method('startFastSeek', startFastSeek)
  .method('stopFastSeek', stopFastSeek)
  .method('getPlaybackStatus', getPlaybackStatus)

  .method('currentSong', currentSong)
  .method('previousSong', previousSong)
  .method('nextSong', nextSong)
  .method('queueAlbum', queueAlbum)
  .method('queueArtist', queueArtist)
  .method('queuePlaylist', queuePlaylist)
  .method('queueSong', queueSong)
  .method('getRepeatSetting', getRepeatSetting)
  .method('setRepeatSetting', setRepeatSetting)
  .method('getShuffleSetting', getShuffleSetting)
  .method('setShuffleSetting', setShuffleSetting)

  .method('getAlbums', getAlbums)
  .method('getAlbum', getAlbum)

  .method('getArtists', getArtists)
  .method('getArtist', getArtist)

  .method('getPlaylists', getPlaylists)
  .method('getPlaylist', getPlaylist)

  .method('getSongs', getSongs)
  .method('getSongCount', getSongCount)
  .method('getSong', getSong)
  .method('getSongFile', getSongFile)
  .method('setSongRating', setSongRating)
  .method('search', search)

  .method('getSongArtwork', getSongArtwork)
  .method('getSongThumbnail', getSongThumbnail)
  .method('getSongArtworkURL', getSongArtworkURL)
  .method('getSongThumbnailURL', getSongThumbnailURL)

  .method('share', share)
  .method('open', open)

  .method('getDatabaseStatus', getDatabaseStatus)

  .method('navigate', navigate)

  .listen()
  .listen(new BroadcastChannel('music-service'));

audio.addEventListener('loadeddata', function() {
  URL.revokeObjectURL(audio.src);
});

audio.addEventListener('play', function() {
  service.broadcast('play');
});

audio.addEventListener('pause', function() {
  service.broadcast('pause');
});

audio.addEventListener('durationchange', function() {
  service.broadcast('durationChange', audio.duration);
});

audio.addEventListener('timeupdate', function() {
  service.broadcast('elapsedTimeChange', audio.currentTime);
});

audio.addEventListener('ended', function() {
  nextSong(true);
});

audio.addEventListener('mozinterruptbegin', function() {
  isInterrupted = true;

  service.broadcast('interruptBegin');
});

audio.addEventListener('mozinterruptend', function() {
  isInterrupted = false;

  service.broadcast('interruptEnd');
});

function play(filePath) {
  if (!filePath) {
    audio.play();
    return;
  }

  getSongFile(filePath).then((file) => {
    if (isStopped) {
      return;
    }

    currentFilePath = filePath;

    audio.src = null;
    audio.load();

    audio.mozAudioChannelType = 'content';
    audio.src = URL.createObjectURL(file);
    audio.load();
    audio.play();

    getSong(filePath).then((song) => {
      Database.incrementPlayCount(song);
    });

    service.broadcast('songChange');
  });
}

function pause() {
  audio.pause();
}

function stop() {
  isStopped = true;

  audio.pause();

  currentFilePath = null;
  currentQueue = null;

  audio.src = null;
  audio.load();

  service.broadcast('stop');
}

function seek(time) {
  audio.fastSeek(parseInt(time, 10));
}

function startFastSeek(reverse) {
  if (isFastSeeking) {
    return;
  }

  reverse = reverse === true || reverse === 'reverse';

  isFastSeeking = true;

  function fastSeek() {
    if (!isFastSeeking) {
      audio.volume = 1;
      return;
    }

    audio.volume = 0.5;
    seek(audio.currentTime + (reverse ? -2 : 2));
    setTimeout(fastSeek, 50);
  }

  fastSeek();
}

function stopFastSeek() {
  isFastSeeking = false;
}

function getPlaybackStatus() {
  return Promise.resolve({
    queueIndex:    currentQueue ? currentQueue.index    : -1,
    queueRawIndex: currentQueue ? currentQueue.rawIndex : -1,
    queueLength:   currentQueue ? currentQueue.length   : -1,
    filePath:      currentFilePath,
    paused:        audio.paused,
    duration:      audio.duration,
    elapsedTime:   audio.currentTime,
    isInterrupted: isInterrupted,
    isFastSeeking: isFastSeeking,
    stopped:       isStopped
  });
}

function currentSong() {
  if (!currentQueue) {
    return Promise.reject();
  }

  return currentQueue.current();
}

function previousSong() {
  if (!currentQueue) {
    return Promise.reject();
  }

  currentQueue.previous();

  return currentSong().then(song => play(song.name));
}

function nextSong(automatic = false) {
  if (!currentQueue) {
    return Promise.reject();
  }

  var hasNextSong = currentQueue.next(automatic);
  if (!hasNextSong) {
    return Promise.resolve(stop());
  }

  return currentSong().then(song => play(song.name));
}

function queueArtist(filePath) {
  return loadQueueSettings.then(() => {
    return getArtist(filePath).then((songs) => {
      var index = songs.findIndex(song => song.name === filePath);
      currentQueue = new PlaybackQueue.StaticQueue(songs, index);

      return currentSong().then((song) => {
        isStopped = false;
        play(song.name);
      });
    });
  });
}

function queueAlbum(filePath) {
  return loadQueueSettings.then(() => {
    return getAlbum(filePath).then((songs) => {
      var index = songs.findIndex(song => song.name === filePath);
      currentQueue = new PlaybackQueue.StaticQueue(songs, index);

      return currentSong().then((song) => {
        isStopped = false;
        play(song.name);
      });
    });
  });
}

function queuePlaylist(id, filePath) {
  return loadQueueSettings.then(() => {
    return getPlaylist(id).then((songs) => {
      var playlist = Database.playlists.find(playlist => playlist.id === id);
      return setShuffleSetting(playlist.shuffle).then(() => {
        var index = filePath ?
          songs.findIndex(song => song.name === filePath) :
          (playlist.shuffle ? Math.floor(Math.random() * songs.length) : 0);
        currentQueue = new PlaybackQueue.StaticQueue(songs, index);

        return currentSong().then((song) => {
          isStopped = false;
          play(song.name);
        });
      });
    });
  });
}

function queueSong(filePath) {
  return loadQueueSettings.then(() => {
    return getSongs().then((songs) => {
      var index = songs.findIndex(song => song.name === filePath);
      currentQueue = new PlaybackQueue.StaticQueue(songs, index);

      return currentSong().then((song) => {
        isStopped = false;
        play(song.name);
      });
    });
  });
}

function getRepeatSetting() {
  return loadQueueSettings.then(() => PlaybackQueue.repeat);
}

function setRepeatSetting(repeat) {
  repeat = parseInt(repeat, 10) || 0;
  return loadQueueSettings.then(() => PlaybackQueue.repeat = repeat);
}

function getShuffleSetting() {
  return loadQueueSettings.then(() => PlaybackQueue.shuffle ? 1 : 0);
}

function setShuffleSetting(shuffle) {
  if (typeof shuffle !== 'boolean') {
    shuffle = shuffle !== 'false' && parseInt(shuffle || 0, 10) !== 0;
  }

  return loadQueueSettings.then(() => PlaybackQueue.shuffle = shuffle);
}

function getAlbums() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.album', null, 'nextunique', (albums) => {
      resolve(albums);
    });
  });
}

function getAlbum(filePath) {
  return getSong(filePath).then((song) => {
    var album = song.metadata.album;

    return new Promise((resolve) => {
      Database.enumerateAll('metadata.album', album, 'next', (songs) => {
        songs.sort((a, b) => {
          return (a.metadata.discnum - b.metadata.discnum) ||
                 (a.metadata.tracknum - b.metadata.tracknum);
        });

        resolve(songs);
      });
    });
  });
}

function getArtists() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.artist', null, 'nextunique', (artists) => {
      resolve(artists);
    });
  });
}

function getArtist(filePath) {
  return getSong(filePath).then((song) => {
    var artist = song.metadata.artist;

    return new Promise((resolve) => {
      Database.enumerateAll('metadata.artist', artist, 'next', (songs) => {
        songs.sort((a, b) => {
          var albumSort = a.metadata.album < b.metadata.album ?
            -1 : (a.metadata.album > b.metadata.album ?  1 : 0);

          return albumSort || (a.metadata.discnum - b.metadata.discnum) ||
                              (a.metadata.tracknum - b.metadata.tracknum);
        });

        resolve(songs);
      });
    });
  });
}

function getPlaylists() {
  return Promise.resolve(Database.playlists);
}

function getPlaylist(id) {
  var playlist = Database.playlists.find(playlist => playlist.id === id);

  return new Promise((resolve) => {
    Database.enumerateAll(playlist.index, null, playlist.direction, (songs) => {
      resolve(songs);
    });
  });
}

function getSongs() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.title', null, 'next', (songs) => {
      resolve(songs);
    });
  });
}

function getSongCount() {
  return new Promise((resolve) => {
    Database.count('metadata.title', null, count => resolve(count));
  });
}

function getSong(filePath) {
  return Database.getFileInfo(filePath);
}

function getSongFile(filePath) {
  return getSong(filePath).then((song) => {
    return Database.getFile(song);
  });
}

function getSongArtwork(filePath) {
  return LazyLoader.load('/js/metadata/album_art_cache.js').then(() => {
    return getSong(filePath).then((song) => {
      return AlbumArtCache.getFullSizeBlob(song);
    });
  });
}

function getSongThumbnail(filePath) {
  return LazyLoader.load('/js/metadata/album_art_cache.js').then(() => {
    return getSong(filePath).then((song) => {
      return AlbumArtCache.getThumbnailBlob(song);
    });
  });
}

function getSongArtworkURL(filePath) {
  return LazyLoader.load('/js/metadata/album_art_cache.js').then(() => {
    return getSong(filePath).then((song) => {
      return AlbumArtCache.getFullSizeURL(song);
    });
  });
}

function getSongThumbnailURL(filePath) {
  return LazyLoader.load('/js/metadata/album_art_cache.js').then(() => {
    return getSong(filePath).then((song) => {
      return AlbumArtCache.getThumbnailURL(song);
    });
  });
}

function setSongRating(rating, filePath) {
  rating = parseInt(rating, 10) || 0;
  return getSong(filePath).then((song) => {
    return Database.setSongRating(song, rating);
  });
}

function search(key, query) {
  return new Promise((resolve) => {
    var results = [];

    Database.search(key, query, (result) => {
      if (result === null) {
        resolve(results);
      } else {
        results.push(result);
      }
    });
  });
}

function getDatabaseStatus() {
  return Promise.resolve(Database.status);
}

function navigate(url) {
  navigateToURL(url);
}

function share(filePath) {
  return getSong(filePath).then((song) => {
    if (song.metadata.locked || !window.MozActivity) {
      return;
    }

    return Promise.all([
        getSongFile(filePath),
        getSongThumbnail(filePath)
      ]).then(([file, thumbnail]) => {
        var path = song.name;
        var filename = path.substring(path.lastIndexOf('/') + 1);

        return new window.MozActivity({
          name: 'share',
          data: {
            type: 'audio/*',
            number: 1,
            blobs: [file],
            filenames: [filename],
            filepaths: [path],
            metadata: [{
              title: song.metadata.title,
              artist: song.metadata.artist,
              album: song.metadata.album,
              picture: thumbnail
            }]
          }
        });
      });
  });
}

function open(blob) {
  var scripts = [
    '/js/metadata/metadata_scripts.js',
    '/js/metadata/album_art.js'
  ];

  return LazyLoader.load(scripts).then(() => {
    return AudioMetadata.parse(blob).then((metadata) => {
      var filePath = blob.name;

      isStopped = false;
      play(filePath);

      return {
        blob: blob,
        metadata: metadata,
        name: filePath
      };
    });
  });
}

Database.init();
