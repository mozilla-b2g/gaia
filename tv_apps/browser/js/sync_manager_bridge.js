(function(exports) {
  'use strict';

  var SyncManagerBridge = {
    _port: null,
    _requests: new Map(),

    set onsyncchange(callback) {
      this._onsyncchange = callback;
    },

    connect: function() {
      if (this._port) {
        return Promise.resolve(this._port);
      }

      return new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = event => {
          var app = event.target.result;
          app.connect('gaia-sync-management').then(ports => {
            if (!ports || !ports.length) {
              return reject();
            }
            this._port = ports[0];
            this._port.onmessage = this.onmessage.bind(this);
            resolve(this._port);
          }).catch(reject);
        };
      });
    },

    iacRequest: function(request) {
      return new Promise(resolve => {
        this.connect().then(port => {
          if (request.id) {
            this._requests.set(request.id, resolve);
          }
          port.postMessage(request);
        });
      });
    },

    onmessage: function(event) {
      var message = event.data;
      if (!message) {
        return;
      }

      if (message.id && this._requests.has(message.id)) {
        this._requests.get(message.id)(message);
        this._requests.delete(message.id);
        return;
      }

      if (message.name !== 'onsyncchange') {
        return;
      }

      if (this._onsyncchange) {
        this._onsyncchange(message);
      }
    },

    getInfo: function() {
      return this.iacRequest({
        name: 'getInfo',
        id: Date.now()
      });
    },
  };

  ['enable',
   'disable',
   'sync'].forEach(requestName => {
     SyncManagerBridge[requestName] = () => {
       return SyncManagerBridge.iacRequest({
         name: requestName
       });
     };
  });

  window.SyncManagerBridge = SyncManagerBridge;
})(window);
