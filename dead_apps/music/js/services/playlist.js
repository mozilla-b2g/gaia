/* exported PlaylistService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function PlaylistService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/playlists/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaylists')
        .then(playlists => resolve(respond(playlists)));
    });
  }));

  worker.get('/api/playlists/info/:id', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaylist', request.parameters.id)
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
