define(["exports", "fxos-web-server/dist/fxos-web-server", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/device_name_service", "app/js/services/share_service"], function (exports, _fxosWebServerDistFxosWebServer, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesDeviceNameService, _appJsServicesShareService) {
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
  var App = _appJsModelsApp["default"];
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var ShareService = _appJsServicesShareService["default"];
  /*import P2pService from 'app/js/services/p2p_service';*/

  var HttpServerService = (function (Service) {
    var HttpServerService = function HttpServerService() {
      var _this = this;
      Service.call(this);

      this._cache = {};

      window.addEventListener("beforeunload", this._deactivate.bind(this));

      DeviceNameService.addEventListener("devicenamechange", function (e) {
        _this._deviceName = e.deviceName;
      }, true);

      this._activate();
    };

    _extends(HttpServerService, Service);

    HttpServerService.prototype.clearPeerCache = function (peer) {
      delete this._cache[peer.address];
    };

    HttpServerService.prototype._serverPeer = function (evt) {
      var response = evt.response;
      var request = evt.request;

      var body = request.body;
      var data = JSON.parse(body);
      data.address = response.socket.host;
      if (this._cache[data.address] !== body) {
        this._cache[data.address] = body;
        // XXX/drs: We get "P2pService undefined" errors if we try using it
        // directly. I'm not sure why, but it's probably some kind of circular
        // reference issue. For now, this fixes it, but we should figure out why
        // we have to do this.
        window.p2pService.receivePeerInfo(data);
      }

      response.send("");
    };

    HttpServerService.prototype._getAppFromRequest = function (evt) {
      return new Promise(function (resolve, reject) {
        var request = evt.request;

        var appId = decodeURIComponent(request.params.app || "");

        ShareService.getApps().then(function (apps) {
          var app = App.getApp(apps, { manifestURL: appId });
          if (app) {
            resolve(app);
          } else {
            reject();
          }
        }, reject);
      });
    };

    HttpServerService.prototype._serverManifest = function (evt) {
      var response = evt.response;

      this._getAppFromRequest(evt).then(function (app) {
        response.headers["Content-Type"] = "application/x-web-app-manifest+json";
        var manifest = app.manifest;
        response.send(JSON.stringify(manifest));
      }, function () {
        return response.send("");
      });
    };

    HttpServerService.prototype._serverDownload = function (evt) {
      var response = evt.response;

      this._getAppFromRequest(evt).then(function (app) {
        app["export"]().then(function (blob) {
          response.headers["Content-Type"] = blob.type;
          response.sendFile(blob);
        });
      }, function () {
        return response.send("");
      });
    };

    HttpServerService.prototype._serverDisconnect = function (evt) {
      var response = evt.response;

      var peer = { address: response.socket.host };
      window.p2pService.receivePeerDisconnect(peer);

      this.clearPeerCache(peer);

      response.send("");
    };

    HttpServerService.prototype._activate = function () {
      var _this2 = this;
      if (this.httpServer) {
        return;
      }

      this.httpServer = new HTTPServer(8080);
      this.httpServer.addEventListener("request", function (evt) {
        var request = evt.request;

        var path = request.path;
        var routes = {
          "/manifest.webapp": function (evt) {
            return _this2._serverManifest(evt);
          },
          "/download": function (evt) {
            return _this2._serverDownload(evt);
          },
          "/disconnect": function (evt) {
            return _this2._serverDisconnect(evt);
          },
          "/peer": function (evt) {
            return _this2._serverPeer(evt);
          },
          "/": function (evt) {
            return evt.response.send("");
          }
        };
        var route = routes[path];
        if (route) {
          route(evt);
        }
      });
      this.httpServer.start();
    };

    HttpServerService.prototype._deactivate = function () {
      if (!this.httpServer) {
        return;
      }

      this.httpServer.stop();
      this.httpServer = null;
    };

    return HttpServerService;
  })(Service);

  exports["default"] = new HttpServerService();
});