importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function SongsService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/songs/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getSongs').then((songs) => {
        resolve(new Response(JSON.stringify(songs), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/songs/count', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getSongCount').then((count) => {
        resolve(new Response(JSON.stringify(count), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/songs/info/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = '/' + decodeURIComponent(request.parameters.filePath);
      client.method('getSong', filePath)
        .then((song) => {
          resolve(new Response(JSON.stringify(song), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch((error) => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));
}
