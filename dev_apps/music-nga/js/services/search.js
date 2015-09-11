importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function SearchService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/search/:key/:query', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('search', request.parameters.key, request.parameters.query)
        .then(songs => resolve(respond(songs)));
    });
  }));

  function respond(response) {
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
