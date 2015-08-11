importScripts('components/serviceworkerware/dist/sww.js');
importScripts('components/sww-raw-cache/dist/sww-raw-cache.js');
importScripts('js/services/albums.js');
importScripts('js/services/artists.js');
importScripts('js/services/artwork.js');
importScripts('js/services/audio.js');
importScripts('js/services/playlist.js');
importScripts('js/services/songs.js');
importScripts('resources.js');

var worker = new ServiceWorkerWare();

var albumsService = new AlbumsService(worker);
var artistsService = new ArtistsService(worker);
var artworkService = new ArtworkService(worker);
var audioService = new AudioService(worker);
var playlistService = new PlaylistService(worker);
var songsService = new SongsService(worker);

worker.use({
  onInstall: function() {
    return caches.open('offline').then((cache) => {
      var request = new Request('/index.html');
      return fetch(request).then((response) => {
        cache.put(request, response);
        return response;
      });
    });
  },

  onFetch: function(request, response) {
    // XXX: TEMP CONDITION FOR TESTING LOCALLY ON DESKTOP
    if (request.url.startsWith('http://localhost:3030/media')) {
      return request;
    }

    for (var i = RESOURCES.length - 1; i >= 0; i--) {
      if (request.url.split('?')[0].split('#')[0].endsWith(RESOURCES[i])) {
        return request;
      }
    }

    return caches.open('offline').then((cache) => {
      var request = new Request('/index.html');
      return cache.match(request).then((response) => {
        return response;
      });
    });
  }
});

worker.use(new self.StaticCacher(RESOURCES));
worker.use(new self.SimpleOfflineCache());

worker.init();
