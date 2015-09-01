importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function DatabaseService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/database/status', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getDatabaseStatus').then((status) => {
        resolve(new Response(JSON.stringify(status), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));
}
