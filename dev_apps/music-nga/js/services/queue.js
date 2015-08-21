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
        .then((song) => {
          resolve(new Response(JSON.stringify(song), {
            headers: { 'Content-Type': 'application/json' }
          }));
        })
        .catch(() => {
          resolve(new Response('', { status: 404 }));
        });
    });
  }));

  worker.get('/api/queue/previous', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('previousSong')
        .then((success) => {
          resolve(new Response(JSON.stringify({ success: success }), {
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

  worker.get('/api/queue/next', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('nextSong')
        .then((success) => {
          resolve(new Response(JSON.stringify({ success: success }), {
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

  worker.get('/api/queue/album/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = '/' + decodeURIComponent(request.parameters.filePath);

      client.method('queueAlbum', filePath)
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

  worker.get('/api/queue/artist/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = '/' + decodeURIComponent(request.parameters.filePath);

      client.method('queueArtist', filePath)
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

  worker.get('/api/queue/song/:filePath', stopAfter((request) => {
    return new Promise((resolve) => {
      var filePath = '/' + decodeURIComponent(request.parameters.filePath);

      client.method('queueSong', filePath)
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

  worker.get('/api/queue/repeat', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getRepeatSetting').then((repeat) => {
        resolve(new Response(JSON.stringify(repeat), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/queue/repeat/:repeat', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('setRepeatSetting', request.parameters.repeat).then(() => {
        resolve(new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/queue/shuffle', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('getShuffleSetting').then((shuffle) => {
        resolve(new Response(JSON.stringify(shuffle), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));

  worker.get('/api/queue/shuffle/:shuffle', stopAfter((request) => {
    return new Promise((resolve) => {
      client.method('setShuffleSetting', request.parameters.shuffle).then(() => {
        resolve(new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }));
}
