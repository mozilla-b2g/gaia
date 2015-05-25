define(["exports", "fxos-mvc/dist/mvc", "app/js/services/share_service", "app/js/services/device_name_service"], function (exports, _fxosMvcDistMvc, _appJsServicesShareService, _appJsServicesDeviceNameService) {
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

  var Model = _fxosMvcDistMvc.Model;
  var ShareService = _appJsServicesShareService["default"];
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var Peer = (function (Model) {
    var Peer = function Peer() {
      Model.apply(this, arguments);
    };

    _extends(Peer, Model);

    Peer.getMe = function () {
      return new Promise(function (resolve, reject) {
        Promise.all([ShareService.getApps(), DeviceNameService.getDeviceName()]).then(function (result) {
          var apps = result[0];
          var deviceName = result[1];
          resolve({
            name: deviceName,
            session: window.session,
            apps: apps
          });
        }, reject);
      });
    };

    Peer.stringify = function (peer) {
      var peerObj = {};
      for (var i in peer) {
        peerObj[i] = peer[i];
      }

      peerObj.apps = peer.apps.map(function (app) {
        return {
          type: app.type,
          manifest: {
            name: app.manifest.name,
            description: app.manifest.description,
            developer: {
              name: (app.manifest.developer && app.manifest.developer.name) || ""
            },
            role: app.manifest.role,
            type: app.manifest.type
          },
          manifestURL: app.manifestURL,
          icon: app.icon
        };
      });

      return JSON.stringify(peerObj);
    };

    return Peer;
  })(Model);

  exports["default"] = Peer;
});