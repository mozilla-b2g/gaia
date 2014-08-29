/* globals Plug, deviceManager */
'use strict';

(function(exports) {
  var DEBUG = false;
  function ServiceManager() {

  }

  ServiceManager.prototype = {
    listElementId: 'elementList',
    serviceName: 'ConnectionManager',
    serviceType: 'upnp:urn:schemas-upnp-org:service:ConnectionManager:1',
    serviceConstructor: Plug.UPnP_ContentDirectory,
    savedServices: {},

    init: function sm_init() {
      this.debugEl = document.getElementById('debug');
      this.listElement = document.getElementById(this.listElementId);
      this.discover();

      return this;
    },

    debugLog: function sm_debugLog(msg, level) {
      if (!DEBUG && level == 'debug') {
        return;
      }
      var logEl = document.createElement('div');
      logEl.textContent = msg;
      this.debugEl.appendChild(logEl);
    },

    appendMixinProperties: function sm_appendConfigDocument(serviceWrapper) {
      var parser = new DOMParser();
      serviceWrapper.configDocument =
          parser.parseFromString(serviceWrapper.svc.config, 'text/xml');
      serviceWrapper.friendlyName = serviceWrapper.configDocument.
        getElementsByTagName('friendlyName')[0].textContent;
    },

    updateService: function sm_updateService(service) {
      var mediaServer = new this.serviceConstructor(service, { debug: false });
      this.appendMixinProperties(mediaServer);

      if (!this.savedServices[service.id]) {
        this.savedServices[service.id] = mediaServer;
        deviceManager.addService(mediaServer);

        var serverItem = this.serverView(mediaServer);
        this.listElement.appendChild(serverItem);
        mediaServer.serverItem = serverItem;
      }
    },

    serverView: function sm_serverView(serviceWrapper) {
      // Add server node
      var serverItem = document.createElement('li');
      var serverName = serviceWrapper.friendlyName;
      serverItem.className = 'server';
      serverItem.textContent = serverName;
      serverItem.dataset.serviceId = serviceWrapper.svc.id;
      return serverItem;
    },

    onServices: function sm_onServices(services) {
      var idx = services.length;
      services.addEventListener('servicefound', function servicefound(e) {
        this.updateService(services[idx]);
        idx++;
      }.bind(this));

      this.debugLog(services.length + ' service' +
      (services.length !== 1 ? 's' : '') +
      ' found in the current network');

      // Remove offline services
      for (var savedServiceId in this.savedServices) {
        var removed = true;
        for (var i = 0; i < services.length; i++) {
          if (services[i].id == savedServiceId) {
            removed = false;
            break;
          }
        }
        if (removed) {
          this.remove(savedServiceId);
        }
      }

      // Update services individually
      for (var j = 0; j < services.length; j++) {
        this.updateService(services[j]);
      }
    },

    get currentService() {
      return deviceManager.getSelectedService(this.serviceName);
    },

    remove: function sm_remove(serviceId) {
      var serverItem = this.savedServices[serviceId].serverItem;
      this.removeSiblingList(serverItem);
      serverItem.parentElement.removeChild(serverItem);
      delete this.savedServices[serviceId];
    },

    removeSiblingList: function sm_remove(elem) {
      if (elem.nextElementSibling.classList.contains('sublist')) {
        elem.parentElement.removeChild(elem.nextElementSibling);
      }
    },

    discover: function sm_discover() {
      if (navigator.getNetworkServices) {
        this.debugLog('Searching for UPnP services in the current network...');

        navigator.getNetworkServices(this.serviceType)
        .then(this.onServices.bind(this), function(e) {
            this.debugLog('An error occurred obtaining UPnP Services [CODE: ' +
                e.code + ']');
        });
      } else {
        this.debugLog(
          'navigator.getNetworkServices API is not supported in this browser');
      }
    }
  };

  exports.ServiceManager = ServiceManager;
})(window);
