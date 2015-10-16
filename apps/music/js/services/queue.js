/* exported QueueService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function QueueService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/queue/current', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('currentSong')
        .then(song => resolve(respond(song)))
        .catch(() => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));

  worker.get('/api/queue/previous', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('previousSong')
        .then(success => resolve(respond({ success: success })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/next', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('nextSong')
        .then(success => resolve(respond({ success: success })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/album/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('queueAlbum', filePath)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/artist/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('queueArtist', filePath)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/playlist/:id/shuffle', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('queuePlaylist', request.parameters.id)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/playlist/:id/song/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var id = request.parameters.id;
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('queuePlaylist', id, filePath)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/song/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('queueSong', filePath)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/repeat/:repeat', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('setRepeatSetting', request.parameters.repeat)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/queue/shuffle/:shuffle', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('setShuffleSetting', request.parameters.shuffle)
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
