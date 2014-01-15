(function() {
  'use strict';

  var DS_NAME = 'eme_store';
  var DS_CONFIG_ID = 1;

  // see duplicate in homescreen/everything.me.js
  function generateDeviceId() {
    var url = window.URL.createObjectURL(new Blob());
    var id = url.replace('blob:', '');

    window.URL.revokeObjectURL(url);

    return 'fxos-' + id;
  }

  window.eme = {
    api: null,

    /**
     * Get or create config and init search/eme instance.
     * Config is shared with the homescreen/eme instance via DataStore API.
     */
    init: function init() {
      var config = new Promise(function done(resolve, reject) {
        navigator.getDataStores(DS_NAME).then(function(stores) {
          if (stores.length === 1) {
            var db = stores[0];
            db.get(DS_CONFIG_ID).then(function get(emeConfig) {
              if (emeConfig) {
                // use existing config
                resolve(emeConfig);
              } else {
                // store new config
                emeConfig = {
                  'deviceId': generateDeviceId()
                };
                db.add(emeConfig, DS_CONFIG_ID).then(function success(id) {
                  resolve(emeConfig);
                }, function error(e) {
                  reject('config creation failed');
                });
              }
            }, function error(e) {
              reject(e.message);
            });
          } else {
            reject('invalid datastore setup');
          }
        });
      });

      config.then(function resolve(emeConfig) {
        eme.api.init(emeConfig);
      }, function reject(reason) {
        // no eme.api
      });

      this.init = function noop() {
        // avoid multiple init calls
      };
    }
  };

})();
