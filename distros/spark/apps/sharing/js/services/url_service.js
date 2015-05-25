define(["exports", "fxos-mvc/dist/mvc"], function (exports, _fxosMvcDistMvc) {
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
  var UrlService = (function (Service) {
    var UrlService = function UrlService() {
      Service.apply(this, arguments);
    };

    _extends(UrlService, Service);

    UrlService.getPeerUrl = function (peer) {
      return "http://" + peer.address + ":8080/peer";
    };

    UrlService.getPeerPingUrl = function (peer) {
      return "http://" + peer.address + ":8080";
    };

    UrlService.getPeerDisconnectUrl = function (peer) {
      return "http://" + peer.address + ":8080/disconnect";
    };

    UrlService.getAppDownloadUrl = function (app) {
      var id = encodeURIComponent(app.manifestURL);
      return "http://" + app.peer.address + ":8080/download?app=" + id;
    };

    UrlService.getAppManifestUrl = function (app) {
      var id = encodeURIComponent(app.manifestURL);
      return "http://" + app.peer.address + ":8080/manifest?app=" + id;
    };

    return UrlService;
  })(Service);

  exports["default"] = UrlService;
});