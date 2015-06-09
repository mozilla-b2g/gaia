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
  var WifiService = (function (Service) {
    var WifiService = function WifiService(options) {
      var _this = this;
      Service.call(this, options);

      navigator.mozWifiManager.addEventListener("statuschange", function (e) {
        return _this._statusChange(e.status);
      });
    };

    _extends(WifiService, Service);

    WifiService.prototype.isConnected = function () {
      return navigator.mozWifiManager.connection.status === "connected";
    };

    WifiService.prototype._statusChange = function (status) {
      this._dispatchEvent("statuschange", { status: status });
    };

    return WifiService;
  })(Service);

  exports["default"] = new WifiService();
});