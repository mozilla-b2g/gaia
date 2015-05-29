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
  var DeviceNameService = (function (Service) {
    var DeviceNameService = function DeviceNameService() {
      var _this = this;
      Service.call(this);

      navigator.mozSettings.addObserver("lightsaber.device_name", function (e) {
        _this._deviceName = e.settingValue;
        _this._dispatchEvent("devicenamechange", { deviceName: e.settingValue });
      });

      this._initialized = new Promise(function (resolve, reject) {
        var request = navigator.mozSettings.createLock().get("lightsaber.device_name");

        request.onsuccess = function () {
          var result = request.result["lightsaber.device_name"];

          if (result) {
            _this._deviceName = result;
            resolve();
          } else {
            _this._isDefault = true;
          }
        };

        request.onerror = function (e) {
          console.error("error getting lightsaber.device_name: " + e);
          reject(e);
        };
      }).then(function () {
        _this._dispatchEvent("devicenamechange", { deviceName: _this._deviceName });
      });
    };

    _extends(DeviceNameService, Service);

    DeviceNameService.prototype.setDeviceName = function (deviceName) {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        if (!deviceName) {
          reject();
          return;
        }

        var request = navigator.mozSettings.createLock().set({
          "lightsaber.device_name": deviceName });

        request.onsuccess = function () {
          _this2._isDefault = false;
          _this2._dispatchEvent("devicenamechange", { deviceName: deviceName });
          resolve();
        };

        request.onerror = function (e) {
          console.error("error setting lightsaber.device_name: " + e);
          reject(e);
        };
      });
    };

    DeviceNameService.prototype.getDeviceName = function () {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        return _this3._initialized.then(function () {
          resolve(_this3._deviceName);
        });
      });
    };

    DeviceNameService.prototype.isDefault = function () {
      return this._isDefault;
    };

    DeviceNameService.prototype.signalDeviceNameCanceled = function () {
      if (this._isDefault) {
        this._dispatchEvent("devicenamechange-cancel");
      }
    };

    return DeviceNameService;
  })(Service);

  exports["default"] = new DeviceNameService();
});