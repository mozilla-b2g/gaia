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
        .then(() => {
          resolve(new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch(() => {
          resolve(new Response(JSON.stringify({ success: false }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        });
    });
  }));

  worker.get('/api/audio/pause', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('pause')
        .then(() => {
          resolve(new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch(() => {
          resolve(new Response(JSON.stringify({ success: false }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        });
    });
  }));

  worker.get('/api/audio/seek/:time', stopAfter((request) => {
    return new Promise((resolve) => {
      var time = parseInt(request.parameters.time, 10);

      client.method('seek', time)
        .then(() => {
          resolve(new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch(() => {
          resolve(new Response(JSON.stringify({ success: false }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        });
    });
  }));

  worker.get('/api/audio/status', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaybackStatus').then((status) => {
        resolve(new Response(JSON.stringify(status), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));
}
