/* exported AudioService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function AudioService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/audio/play', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('play')
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/audio/pause', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('pause')
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/audio/seek/:time', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('seek', request.parameters.time)
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/audio/fastseek/start/:direction', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('startFastSeek', request.parameters.direction === 'reverse')
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/audio/fastseek/stop', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('stopFastSeek')
        .then(() =>  resolve(respond({ success: true  })))
        .catch(() => resolve(respond({ success: false })));
    });
  }));

  worker.get('/api/audio/status', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaybackStatus')
        .then(status => resolve(respond(status)));
    });
  }));

  function respond(response) {
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
