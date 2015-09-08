importScripts('components/bridge/client.js');

var client = bridge.client({
  service: 'music-service',
  endpoint: new BroadcastChannel('music-service')
});

function PlaylistService(worker) {
  var stopAfter = ServiceWorkerWare.decorators.stopAfter;

  worker.get('/api/playlists/list', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaylists').then((playlists) => {
        resolve(new Response(JSON.stringify(playlists), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/playlists/info/:id', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getPlaylist', request.parameters.id)
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
