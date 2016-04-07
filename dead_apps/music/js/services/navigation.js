/* exported NavigationService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function NavigationService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/navigation/:url', stopAfter((request) => {
    return new Promise((resolve) => {
      var url = decodeURIComponent(request.parameters.url);
      client.method('navigate', url)
        .then(() => resolve(respond({ success: true })))
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
