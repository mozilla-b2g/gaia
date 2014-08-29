/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
  * You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(global) {
  // Spec information:
  // http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
  const SSDP_PORT = 1900;
  const SSDP_ADDRESS = '239.255.255.250';
  const SSDP_DISCOVER_MX = 2;

  const SSDP_DISCOVER_PACKET =
    'M-SEARCH * HTTP/1.1\r\n' +
    'HOST: ' + SSDP_ADDRESS + ':' + SSDP_PORT + '\r\n' +
    'MAN: \"ssdp:discover\"\r\n' +
    'MX: ' + SSDP_DISCOVER_MX + '\r\n' +
    'ST: %SEARCH_TARGET%\r\n\r\n';

  const SSDP_RESPONSE_HEADER = /HTTP\/\d{1}\.\d{1} \d+ .*/;
  const SSDP_HEADER = /^([^:]+):\s*(.*)$/;

  var SimpleServiceDiscovery = {
    _targets: [],
    _commands: {},
    search: function _search(aInterval) {
      aInterval = aInterval || 0;
      if (aInterval > 0) {
        this._searchRepeat = setInterval(this._search.bind(this), aInterval);
      }
      this._search();
    },
    stopSearch: function _stopSearch() {
      if (this._searchRepeat) {
        clearInterval(this._searchRepeat);
      }
    },
    registerTarget: function _registerTarget(target) {
      if (this._targets.indexOf(target) < 0) {
        this._targets.push(target);
      }
    },

    // internal function
    _usingLAN: function _usingLAN() {
      // XXX need a way to check current network interface.
      return true;
    },
    _search: function _search() {
      // We only search if on local network
      if (!this._usingLAN()) {
        return;
      }

      // create socket if not exist
      if (!this._searchSocket) {
        this._searchSocket = new UDPSocket({loopback: true});
        this._searchSocket.joinMulticastGroup(SSDP_ADDRESS);
        this._searchSocket.onmessage = this._onmessage.bind(this);
      }

      this._searchSocket.opened.then((function() {
        // Perform a UDP broadcast to search for SSDP devices
        this._searchTimeout = setTimeout(this._searchShutdown.bind(this), SSDP_DISCOVER_MX * 1000);

        var data = SSDP_DISCOVER_PACKET;
        this._targets.forEach((function(target) {
          var msgData = data.replace('%SEARCH_TARGET%', target);
          var ok = this._searchSocket.send(msgData, SSDP_ADDRESS, SSDP_PORT);
        }).bind(this));
      }).bind(this));
    },
    _searchShutdown: function _searchShutdown() {
      if (this._searchSocket) {
        // This will call onStopListening.
        this._searchSocket.close();
        delete this._searchSocket;
      }
    },
    _onmessage: function _onmessage(e) {
      // Listen for responses from specific targets. There could be more than one
      // available.

      var msg = String.fromCharCode.apply(null, new Uint8Array(e.data));
      var lines = msg.toString().split('\r\n');
      var firstLine = lines.shift();
      var method = SSDP_RESPONSE_HEADER.test(firstLine) ? 'RESPONSE'
                                                        : firstLine.split(' ')[0].toUpperCase();
      var headers = {};
      lines.forEach(function(line) {
        if (line.length) {
          var pairs = line.match(/^([^:]+):\s*(.*)$/);
          if (pairs) {
            headers[pairs[1].toLowerCase()] = pairs[2];
          }
        }
      });
      if (this._commands[method]) {
        this._commands[method].apply(this, [headers]);
      }
    },
    _found: function _found(aService) {
      // Use the REST api to request more information about this service
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', aService.location, true);
      xhr.overrideMimeType('text/xml');

      xhr.addEventListener('load', (function() {
        if (xhr.status == 200) {
          // walk through root device and all the embedded devices
          var devices = xhr.responseXML.querySelectorAll('device');
          for (var i = 0; i < devices.length; i++) {
            this._parseDescriptor(devices[i], aService.location);
          }
        }
      }).bind(this), false);

      xhr.send(null);
    },
    _parseDescriptor: function _parseDescriptor(device, refUrl) {
      var udn = device.querySelector('UDN').innerHTML;

      var serviceList = device.querySelector('serviceList').querySelectorAll('service');
      for (var i = 0; i < serviceList.length; i++) {
        var service = serviceList[i];
        var serviceId = service.querySelector('serviceId').innerHTML;
        var eventsUrl = this._getAbsoluteURL(service.querySelector('eventSubURL'), refUrl);
        var options = {};
        options.id = udn + '::' + serviceId;
        options.deviceId = udn;
        options.name = serviceId;
        options.type = 'upnp:' + service.querySelector('serviceType').innerHTML;
        options.url = this._getAbsoluteURL(service.querySelector('controlURL').innerHTML, refUrl);
        options.config = device.outerHTML;
        if (eventsUrl) {
          options.eventsUrl = eventsUrl.innerHTML;
        }
        options.expiryTimestamp = ''; //TODO
        serviceHelper.add(new SSDPServiceRecord(options));
      }
    },
    _getAbsoluteURL: function _getAbsoluteURL(url, refUrl) {
      if (/^https?:\/\//.test(url)) {
        return url;
      } else {
        var absURL = new URL(url, refUrl);
        return absURL.toString();
      }
    }
  };

  SimpleServiceDiscovery._commands['RESPONSE'] = function _response(headers) {
    if (headers.location && this._targets.indexOf(headers.st) >= 0) {
      this._found(headers);
    }
  };
  SimpleServiceDiscovery._commands['NOTIFY'] = function _notify(headers) {
    switch (headers.nts) {
      case 'ssdp:alive':
        this._commands['RESPONSE'].apply(this, [headers]);
        break;
      case 'ssdp:byebye':
        serviceHelper.remove(new SSDPServiceRecord({id: headers.usn}));
        break;
    }
  };
  SimpleServiceDiscovery._commands['M-SEARCH'] = function _msearch(headers) {
  };

  function SSDPServiceRecord(options) {
    this.update(options);
  }

  SSDPServiceRecord.prototype = {
    id: '',
    deviceId: '',
    name: '',
    type: '',
    url: '',
    eventsUrl: '',
    config: '',
    expiryTimestamp: '',
    update: function(options) {
      var self = this;
      ['id', 'deviceId', 'name', 'type', 'url', 'config', 'expiryTimestamp'].forEach(function(option) {
        self[option] = options[option];
      });

      if (options.eventsUrl) {
        this.eventsUrl = options.eventsUrl;
      }
    }
  };

  // polyfill Network Service Discovery API
  function NetworkService(record) {
    this._record = record;
    //XXX need weak reference
    this._callbacks = { 'available': [], 'unavailable': [], 'notify': [] };
  }

  NetworkService.prototype = {
    online: true,
    get id() { return this._record.id; },
    get name() { return this._record.name; },
    get type() { return this._record.type; },
    get url() { return this._record.url; },
    get config() { return this._record.config; },

    set onavailable(callback) {
      this.addEventListener('available', callback);
    },

    set onunavailable(callback) {
      this.addEventListener('unavailable', callback);
    },

    set onnotify(callback) {
      this.addEventListener('notify', callback);
    },

    // EventTarget
    addEventListener: function(type, callback, capture) {
      if (!this._callbacks.hasOwnProperty(type)) {
        return;
      }
      this._callbacks[type].push(callback);
    },
    removeEventListener: function(type, callback, capture) {
      if (!this._callbacks.hasOwnProperty(type)) {
        return;
      }
      var callbacks = this._callbacks[type];

      var index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    },
    dispatchEvent: function(event) {
      if (this._callbacks.hasOwnProperty(event.type)) {
        var callbacks = this._callbacks[event.type];
        if (!event.detail || !event.detail.target) {
          event.detail = { target: this };
        }
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i](event);
        }
      }
      return event.cancelable === false || event.defaultPrevented === false;
    }
  };

  function NetworkServices(types, services) {
    this._services = services || [];
    this._types = types || [];
    for (var i = 0; i < services.length; i++) {
      this[i] = services[i];
    }
    //XXX need weak reference
    this._callbacks = { 'servicefound': [], 'servicelost': [] };
  }

  NetworkServices.prototype = {
    _append: function(service) {
      var i = this._services.length;
      this[i] = service;
      this._services.push(service);
    },

    servicesAvailable: 0,

    get length() {
      return this._services.length;
    },

    getServiceById: function(id) {
      for (var i = 0; i < this._services.length; i++) {
        if (this._services[i].id === id) {
          return this._services[i];
        }
      }
      return null;
    },

    set onservicefound(callback) {
      this.addEventListener('servicefound', callback);
    },

    set onservicelost(callback) {
      this.addEventListener('servicelost', callback);
    },

    // EventTarget
    addEventListener: function(type, callback) {
      if (!this._callbacks.hasOwnProperty(type)) {
        return;
      }
      this._callbacks[type].push(callback);
    },
    removeEventListener: function(type, callback, capture) {
      if (!this._callbacks.hasOwnProperty(type)) {
        return;
      }
      var callbacks = this._callbacks[type];

      var index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    },
    dispatchEvent: function(event) {
      if (this._callbacks.hasOwnProperty(event.type)) {
        var callbacks = this._callbacks[event.type];
        if (!event.detail || !event.detail.target) {
          event.detail = {target: this};
        }
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i](event);
        }
      }
      return event.cancelable === false || event.defaultPrevented === false;
    }
  };

  function _hasRequestedType(service, types) {
    return types.some(function(type) {
      return type === service.type;
    });
  }

  var serviceHelper = (function() {
    return {
      add: function(record) {
        // try update existing service
        var index = availableServiceRecords.findIndex(function(activeService) {
          return activeService.id === record.id;
        });

        if (index >= 0) {
          availableServiceRecords[index].update(record);
          return;
        }

        // new service available
        availableServiceRecords.push(record);

        activeServiceManagers.forEach(function(manager) {
          // wiring to existed NetworkService objects
          var index = manager._services.findIndex(function(service) {
            return service.id === record.id;
          });
          if (index >= 0 && manager._services[index].online === false) {
            var service = manager._services[index];
            service._record = record;
            service.online = true;
            setTimeout(function() {
              service.dispatchEvent(new CustomEvent('available',
                                                    { bubbles: false,
                                                      cancelable: false,
                                                      detail: {target: service}
                                                    }));
            }, 0);
          }

          // notify correspoding service managers
          if (_hasRequestedType(record, manager._types)) {
            // XXX should we append new service to existing manager?
            if (index < 0) {
              var netService = new NetworkService(record);
              manager._append(netService);
            }
            manager.servicesAvailable++;
            setTimeout(function() {
              manager.dispatchEvent(new CustomEvent('servicefound',
                                                    { bubbles: false,
                                                      cancelable: false,
                                                      detail: {target: manager}
                                                    }));
            }, 0);
          }
        });

      },
      remove: function(record) {
        var index = availableServiceRecords.findIndex(function(activeService) {
          return activeService.id === record.id;
        });

        if (index >= 0) {
          var activeService = availableServiceRecords[index];

          activeServiceManagers.forEach(function(manager) {
            var index = manager._services.findIndex(function(service) {
              return service.id === record.id;
            });
            if (index >= 0 && manager._services[index].online === true) {
              // notify service unavailable
              var service = manager._services[index];
              service.online = false;
              setTimeout(function() {
                service.dispatchEvent(new CustomEvent('unavailable',
                                                      { bubbles: false,
                                                        cancelable: false,
                                                        detail: {target: service}
                                                      }));
              }, 0);
            }

            // notify service lost
            if (_hasRequestedType(activeService, manager._types)) {
              manager.servicesAvailable--;
              setTimeout(function() {
                manager.dispatchEvent(new CustomEvent('servicelost',
                                                      { bubbles: false,
                                                        cancelable: false,
                                                        detail: {target: manager}
                                                      }));
              }, 0);
            }
          });

          // XXX unregister UPnP event
          if (activeService.eventsUrl) {
            console.log('unregister event for ' + activeService.eventsUrl);
          }

          // remove from available service list
          availableServiceRecords.splice(index, 1);
        }
      }
    };
  })();

  var availableServiceRecords = []; // list of NetworkService
  var activeServiceManagers = []; // list of NetworkServices //XXX need weak reference
  var targetRegister = {
    'upnp:': {
      register: function(target) {
        SimpleServiceDiscovery.registerTarget(target.substr(5)); // remove upnp: prefix
      },
      search: function() {
        SimpleServiceDiscovery.search();
      }
    }
  };

  function getNetworkServices(type) {
    const UNKNOWN_TYPE_PREFIX_ERR = 'UnknownTypePrefixError';
    const PERMISSION_DENIED_ERR = 'PermissionDeniedError';

    function _isValidServiceType(type) {
      return type && Object.keys(targetRegister).some(function(prefix) { return type.startsWith(prefix); });
    }

    function _register(types) {
      var needSearch = {};
      types.forEach(function(type) {
        var found = Object.keys(targetRegister).find(function(prefix) { return type.startsWith(prefix); });
        if (found) {
          targetRegister[found].register(type);
          if (!needSearch.hasOwnProperty(found)) {
            needSearch[found] = true;
          }
        }
      });
      // trigger search on the discovery service if new search target is registered
      Object.keys(needSearch).forEach(function(type) {
        targetRegister[type].search();
      });
    }

    var requestedControlTypes = [].concat(type).filter(_isValidServiceType);

    if (requestedControlTypes.length === 0) {
      return Promise.reject(new DOMError(UNKNOWN_TYPE_PREFIX_ERR));
    }

    _register(requestedControlTypes);

    var allPromises = [];
    availableServiceRecords.forEach(function(service) {
      if (_hasRequestedType(service, requestedControlTypes)) {
        // XXX doesn't check CORS yet
        // create a new instance of NetworkService
        allPromises.push(Promise.resolve(new NetworkService(service)));
      }
    });

    return Promise.all(allPromises).then(function(servicesFound) {
      var services = servicesFound.filter(function(service) {
        //XXX might also filter by user preference
        return service !== null;
      });

      for (var i = 0; i < services.length; i++) {
        if (services[i]._record.eventsUrl) {
          //XXX perform UPnP event subscription
          console.log('register for ' + services[i]._record.eventsUrl);
        }
      }

      var serviceManager = new NetworkServices(requestedControlTypes, services);
      serviceManager.servicesAvailable = availableServiceRecords.reduce(function(count, service) {
        return (_hasRequestedType(service, requestedControlTypes)) ? count + 1 : count;
      }, 0);
      activeServiceManagers.push(serviceManager);

      return Promise.resolve(serviceManager);
    });
  }

  // export NetworkServices and NetworkServices as pre-defined types
  global.NetworkService = NetworkService;
  global.NetworkServices = NetworkServices;
  navigator.getNetworkServices = getNetworkServices;

  global.addEventListener('unload', function() {
    delete navigator.getNetworkServices;
  });
})(window);
