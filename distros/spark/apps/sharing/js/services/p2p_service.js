define(["exports", "dns-sd.js/dist/dns-sd", "fxos-mvc/dist/mvc", "app/js/models/peer", "app/js/services/apps_service", "app/js/services/broadcast_service", "app/js/services/device_name_service", "app/js/services/http_client_service", "app/js/services/http_server_service", "app/js/services/share_service", "app/js/services/wifi_service"], function (exports, _dnsSdJsDistDnsSd, _fxosMvcDistMvc, _appJsModelsPeer, _appJsServicesAppsService, _appJsServicesBroadcastService, _appJsServicesDeviceNameService, _appJsServicesHttpClientService, _appJsServicesHttpServerService, _appJsServicesShareService, _appJsServicesWifiService) {
  "use strict";

  var _extends = function (child, parent) {
    child.prototype = Object.create(parent.prototype, {
      constructor: {
        value: child,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    child.__proto__ = parent;
  };

  var Service = _fxosMvcDistMvc.Service;
  var Peer = _appJsModelsPeer["default"];
  var AppsService = _appJsServicesAppsService["default"];
  var BroadcastService = _appJsServicesBroadcastService["default"];
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var HttpClientService = _appJsServicesHttpClientService["default"];
  var HttpServerService = _appJsServicesHttpServerService["default"];
  var ShareService = _appJsServicesShareService["default"];
  var WifiService = _appJsServicesWifiService["default"];
  /*import IconService from 'app/js/services/icon_service';*/

  var P2pService = (function (Service) {
    var P2pService = function P2pService() {
      var _this = this;
      Service.call(this);

      window.p2pService = this;

      this._peers = [];

      this._ipAddresses = new Promise(function (resolve, reject) {
        IPUtils.getAddresses(function (ipAddress) {
          // XXX/drs: This will break if we have multiple IP addresses.
          resolve([ipAddress]);
        });
      });

      this._enableP2pConnection();

      window.addEventListener("visibilitychange", function () {
        return DNSSD.startDiscovery();
      });

      window.addEventListener("beforeunload", function () {
        return _this._beforeUnload();
      });

      AppsService.addEventListener("updated", function () {
        return _this.sendPeersInfo();
      });

      DeviceNameService.addEventListener("devicenamechange", function () {
        return _this.sendPeersInfo();
      });

      HttpClientService.addEventListener("disconnect", function (e) {
        return _this.receivePeerInfo({ address: e.peer.address });
      });

      BroadcastService.addEventListener("broadcast", function () {
        return _this.sendPeersInfo();
      });

      ShareService.addEventListener("share", function () {
        return _this.sendPeersInfo();
      });

      WifiService.addEventListener("statuschange", function (status) {
        return _this._wifiStatusChange(status);
      });
    };

    _extends(P2pService, Service);

    P2pService.prototype.getApps = function () {
      if (!this._peers.length) {
        return [];
      }

      var reduceApps = function (el) {
        var apps = el && el.apps || [];
        return apps.map(function (app) {
          app.peer = el;
          return app;
        });
      };

      if (this._peers.length === 1) {
        return reduceApps(this._peers[0]);
      }

      return this._peers.reduce(function (prev, cur) {
        return reduceApps(prev).concat(reduceApps(cur));
      });
    };

    P2pService.prototype.receivePeerInfo = function (peer) {
      var _this2 = this;
      for (var i = 0; i < this._peers.length; i++) {
        if (this._peers[i].address === peer.address) {
          if (peer.address && Object.keys(peer).length === 1) {
            HttpServerService.clearPeerCache(peer);
            this._peers.splice(i, 1);
            this._dispatchEvent("proximity");
            return;
          }

          if (this._peers[i].session !== peer.session) {
            Peer.getMe().then(function (me) {
              return _this2._sendPeerInfo(me, peer);
            });
          }

          this._peers[i] = peer;
          this._dispatchEvent("proximity");
          return;
        }
      }

      this._peers.push(peer);
      this._dispatchEvent("proximity");
    };

    P2pService.prototype._sendPeerInfo = function (me, peer) {
      HttpClientService.sendPeerInfo(me, peer);
    };

    P2pService.prototype.sendPeersInfo = function () {
      var _this3 = this;
      Peer.getMe().then(function (me) {
        return _this3._peers.forEach(function (peer) {
          return _this3._sendPeerInfo(me, peer);
        });
      });
    };

    P2pService.prototype.receivePeerDisconnect = function (peer) {
      for (var i = 0; i < this._peers.length; i++) {
        if (this._peers[i].address === peer.address) {
          this._peers.splice(i, 1);
          this._dispatchEvent("proximity");
        }
      }
    };

    P2pService.prototype._deletePeer = function (peer) {
      this.receivePeerInfo({ address: peer.address });
    };

    P2pService.prototype._enableP2pConnection = function () {
      var _this4 = this;
      DNSSD.registerService("_fxos-sharing._tcp.local", 8080, {});

      DNSSD.addEventListener("discovered", function (e) {
        var isSharingPeer = e.services.find(function (service) {
          return service === "_fxos-sharing._tcp.local";
        });

        if (!isSharingPeer) {
          return;
        }

        var address = e.address;

        _this4._ipAddresses.then(function (ipAddresses) {
          // Make sure we're not trying to connect to ourself.
          if (ipAddresses.indexOf(address) !== -1) {
            return;
          }

          var peer = { address: address };

          Peer.getMe().then(function (me) {
            _this4._sendPeerInfo(me, peer);
          });
        });
      });

      DNSSD.startDiscovery();
      setInterval(function () {
        return DNSSD.startDiscovery();
      }, 30000 /* every 30 seconds */);
      setInterval(function () {
        return _this4.sendPeersInfo();
      }, 30000 /* every 30 seconds */);
    };

    P2pService.prototype._beforeUnload = function () {
      this._peers.forEach(function (peer) {
        HttpClientService.signalDisconnecting(peer);
      });
    };

    P2pService.prototype._wifiStatusChange = function (status) {
      if (status !== "connected") {
        this._peers = [];
        this._dispatchEvent("proximity");
      }
    }

    /**
     * Debug tool. Used only to insert fake data for testing.
     */
    /*
    insertFakeData() {
      var icons = IconService.instance.icons;
       setTimeout(() => {
        this._updatePeerInfo('127.0.0.1', {name: '', apps: [{
          manifestURL: 'abc',
          icon: icons[0],
          manifest: {
            name: 'Sharing',
            description: 'doo',
            developer: {
              name: 'Dougiashdfihajksdhfkashdfkjhkasjhdfasdffd'
            }
          },
        }, {
          manifestURL: 'def',
          icon: icons[1],
          manifest: {
            name: 'HelloWorld',
            description: 'too',
            developer: {
              name: 'Hammasjdjkfhakshdfjkhaskjd'
            }
          }
        }, {
          manifestURL: 'ghi',
          icon: icons[2],
          manifest: {
            name: 'Rail Rush',
            description: 'game',
            developer: {
              name: 'Gamer'
            }
          }
        }], addons: [{
          manifestURL: 'jkl',
          icon: icons[3],
          role: 'addon',
          manifest: {
            name: 'test',
            description: 'ham',
            developer: {
              name: 'abcabcacbasdasdasd'
            }
          }
        }]});
      }, 0);
       setTimeout(() => {
        this._updatePeerInfo('192.168.100.100', {name: 'garbage', apps: []});
      }, 2000);
    }
    */
    ;

    return P2pService;
  })(Service);

  exports["default"] = new P2pService();
});