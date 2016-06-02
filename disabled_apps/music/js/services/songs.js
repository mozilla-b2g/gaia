/* exported SongsService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function SongsService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/songs/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getSongs')
        .then(songs => resolve(respond(songs)));
    });
  }));

  worker.get('/api/songs/count', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getSongCount')
        .then(count => resolve(respond(count)));
    });
  }));

  worker.get('/api/songs/info/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('getSong', filePath)
        .then(song => resolve(respond(song)))
        .catch((error) => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));

  worker.get('/api/songs/rating/:rating/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var rating = request.parameters.rating;
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('setSongRating', rating, filePath)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  function respond(response) {
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
