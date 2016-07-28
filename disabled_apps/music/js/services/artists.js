/* exported ArtistsService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function ArtistsService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/artists/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getArtists')
        .then(artists => resolve(respond(artists)));
    });
  }));

  worker.get('/api/artists/info/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('getArtist', filePath)
        .then(songs => resolve(respond(songs)))
        .catch((error) => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));

  function respond(response) {
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
