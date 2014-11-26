/* globals ServiceManager, Plug */
'use strict';

(function(exports) {
  function ConnectionServiceManager() {

  }

  ConnectionServiceManager.prototype = {
    __proto__: ServiceManager.prototype,

    listElementId: 'rendererList',
    serviceType: 'upnp:urn:schemas-upnp-org:service:ConnectionManager:1',
    serviceConstructor: Plug.UPnP_ConnectionManager
  };
  exports.ConnectionServiceManager = ConnectionServiceManager;
})(window);
