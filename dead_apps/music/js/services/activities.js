/* exported ActivitiesService */
/* global Response, ServiceWorkerWare, bridge */
'use strict';

importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function ActivitiesService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/activities/share/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = decodeURIComponent(request.parameters.filePath);
      client.method('share', filePath)
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
