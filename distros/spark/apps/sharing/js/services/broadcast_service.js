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
  var BroadcastService = (function (Service) {
    var BroadcastService = function BroadcastService() {
      var _this = this;
      Service.call(this);

      this._initialized = new Promise(function (resolve, reject) {
        navigator.mozSettings.addObserver("lightsaber.p2p_broadcast", function (e) {
          _this._broadcastLoaded(e.settingValue);
        });

        var broadcastSetting = navigator.mozSettings.createLock().get("lightsaber.p2p_broadcast", false);

        broadcastSetting.onsuccess = function () {
          _this._broadcastLoaded(broadcastSetting.result["lightsaber.p2p_broadcast"]);
          resolve();
        };

        broadcastSetting.onerror = function () {
          console.error("error getting `lightsaber.p2p_broadcast` setting");
          reject();
        };
      });
    };

    _extends(BroadcastService, Service);

    BroadcastService.prototype.getBroadcast = function () {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        _this2._initialized.then(function () {
          resolve(_this2._broadcast);
        }, reject);
      });
    };

    BroadcastService.prototype.setBroadcast = function (val) {
      new Promise(function (resolve, reject) {
        var request = navigator.mozSettings.createLock().set({
          "lightsaber.p2p_broadcast": val });

        request.onsuccess = function () {
          resolve();
        };

        request.onerror = function (e) {
          console.error("error getting `lightsaber.p2p_broadcast` setting");
          reject(e);
        };
      });
    };

    BroadcastService.prototype._broadcastLoaded = function (val) {
      this._broadcast = val;
      this._dispatchEvent("broadcast", { broadcast: val });
    };

    return BroadcastService;
  })(Service);

  exports["default"] = new BroadcastService();
});