/* exported activitiesService, albumsService, artistsService, artworkService,
            audioService, databaseService, navigationService, playlistService,
            queueService, searchService, songsService */
/* global RESOURCES, Request, ServiceWorkerWare, ActivitiesService,
          AlbumsService, ArtistsService, ArtworkService, AudioService,
          DatabaseService, NavigationService, PlaylistService, QueueService,
          SearchService, SongsService, caches, fetch */
'use strict';

importScripts('components/serviceworkerware/dist/sww.js');
importScripts('components/sww-raw-cache/dist/sww-raw-cache.js');
importScripts('js/services/activities.js');
importScripts('js/services/albums.js');
importScripts('js/services/artists.js');
importScripts('js/services/artwork.js');
importScripts('js/services/audio.js');
importScripts('js/services/database.js');
importScripts('js/services/navigation.js');
importScripts('js/services/playlist.js');
importScripts('js/services/queue.js');
importScripts('js/services/search.js');
importScripts('js/services/songs.js');
importScripts('resources.js');

var worker = new ServiceWorkerWare();

var activitiesService = new ActivitiesService(worker);
var albumsService = new AlbumsService(worker);
var artistsService = new ArtistsService(worker);
var artworkService = new ArtworkService(worker);
var audioService = new AudioService(worker);
var databaseService = new DatabaseService(worker);
var navigationService = new NavigationService(worker);
var playlistService = new PlaylistService(worker);
var queueService = new QueueService(worker);
var searchService = new SearchService(worker);
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
