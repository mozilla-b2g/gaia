define(["exports", "fxos-mvc/dist/mvc", "app/js/models/peer", "app/js/services/apps_service", "app/js/services/url_service"], function (exports, _fxosMvcDistMvc, _appJsModelsPeer, _appJsServicesAppsService, _appJsServicesUrlService) {
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
  var UrlService = _appJsServicesUrlService["default"];


  var TIMEOUT = 2000;

  var HttpClientService = (function (Service) {
    var HttpClientService = function HttpClientService() {
      Service.apply(this, arguments);
    };

    _extends(HttpClientService, Service);

    HttpClientService.prototype.downloadApp = function (app) {
      var _this = this;
      var url = UrlService.getAppDownloadUrl(app);

      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest({ mozAnon: true, mozSystem: true });
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.onload = function () {
          if (xhr.status === 200) {
            AppsService.installAppBlob(xhr.response).then(resolve, reject);
          }
        };
        _this._xhrAttachErrorListeners(xhr, reject, app.peer);
        xhr.send();
      });
    };

    HttpClientService.prototype.sendPeerInfo = function (fromPeer, toPeer) {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        var url = UrlService.getPeerUrl(toPeer);
        var body = Peer.stringify(fromPeer);

        var xhr = new XMLHttpRequest({ mozAnon: true, mozSystem: true });
        xhr.open("POST", url);
        xhr.onload = function () {
          if (xhr.status === 200) {
            resolve();
          }
        };
        _this2._xhrAttachErrorListeners(xhr, reject, toPeer);
        xhr.send(body);
      });
    };

    HttpClientService.prototype.signalDisconnecting = function (peer) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest({ mozAnon: true, mozSystem: true });
        xhr.open("GET", UrlService.getPeerDisconnectUrl(peer));
        xhr.send();
      });
    };

    HttpClientService.prototype._xhrAttachErrorListeners = function (xhr, reject, peer) {
      var _this3 = this;
      xhr.timeout = TIMEOUT;
      xhr.ontimeout = function () {
        reject({ name: "Timeout" });
        _this3._dispatchEvent("disconnect", { peer: peer });
      };
      xhr.onerror = function () {
        reject({ name: "Network error" });
        _this3._dispatchEvent("disconnect", { peer: peer });
      };
      xhr.addEventListener("load", function () {
        if (xhr.status !== 200) {
          reject({ name: "HTTP error", message: xhr.status });
          _this3._dispatchEvent("disconnect", { peer: peer });
        }
      });
    };

    return HttpClientService;
  })(Service);

  exports["default"] = new HttpClientService();
});