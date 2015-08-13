/* global threads */
'use strict';

var audio = document.getElementById('audio');

var currentFilePath;

var service = threads.service('music-service')
  .method('play', play)
  .method('pause', pause)
  .method('seek', seek)
  .method('getPlaybackStatus', getPlaybackStatus)

  .method('getArtists', getArtists)
  .method('getArtist', getArtist)

  .method('getAlbums', getAlbums)
  .method('getAlbum', getAlbum)

  .method('getSongs', getSongs)
  .method('getSong', getSong)
  .method('getSongFile', getSongFile)
  .method('getSongArtwork', getSongArtwork)
  .method('getSongThumbnail', getSongThumbnail)
  .method('shareSong', shareSong)

  .listen()
  .listen(new BroadcastChannel('music-service'));

audio.onloadeddata = function() {
  URL.revokeObjectURL(audio.src);
};

audio.onplay = function() {
  service.broadcast('play');
};

audio.onpause = function() {
  service.broadcast('pause');
};

audio.ondurationchange = function() {
  service.broadcast('durationChange', audio.duration);
};

audio.ontimeupdate = function() {
  service.broadcast('elapsedTimeChange', audio.currentTime);
};

function play(filePath) {
  if (!filePath) {
    audio.play();
    return;
  }

  getSongFile(filePath).then((file) => {
    currentFilePath = filePath;

    audio.src = null;
    audio.load();

    audio.src = URL.createObjectURL(file);
    audio.load();
    audio.play();
  });
}

function pause() {
  audio.pause();
}

function seek(time) {
  audio.currentTime = time;
}

function getPlaybackStatus() {
  return new Promise((resolve) => {
    resolve({
      filePath: currentFilePath,
      paused: audio.paused,
      duration: audio.duration,
      elapsedTime: audio.currentTime
    });
  });
}

function getArtists() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.artist', null, 'nextunique', artists => resolve(artists));
  });
}

function getArtist(filePath) {
  return getSong(filePath).then((song) => {
    var artist = song.metadata.artist;

    return new Promise((resolve) => {
      Database.enumerateAll('metadata.artist', artist, 'next', songs => resolve(songs));
    });
  });
}

function getAlbums() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.album', null, 'nextunique', albums => resolve(albums));
  });
}

function getAlbum(filePath) {
  return getSong(filePath).then((song) => {
    var album = song.metadata.album;

    return new Promise((resolve) => {
      Database.enumerateAll('metadata.album', album, 'next', songs => resolve(songs));
    });
  });
}

function getSongs() {
  return new Promise((resolve) => {
    Database.enumerateAll('metadata.title', null, 'next', songs => resolve(songs));
  });
}

function getSong(filePath) {
  return Database.getFileInfo(filePath);
}

function getSongFile(filePath) {
  return Database.getFile(filePath);
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

function shareSong(filePath) {
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

Database.init();
