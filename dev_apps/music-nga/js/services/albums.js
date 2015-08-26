importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function AlbumsService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/albums/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getAlbums').then((albums) => {
        resolve(new Response(JSON.stringify(albums), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/albums/info/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = '/' + decodeURIComponent(request.parameters.filePath);
      client.method('getAlbum', filePath)
        .then((songs) => {
          resolve(new Response(JSON.stringify(songs), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch((error) => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));
}
