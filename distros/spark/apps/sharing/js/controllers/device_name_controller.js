define(["exports", "fxos-mvc/dist/mvc", "app/js/services/device_name_service"], function (exports, _fxosMvcDistMvc, _appJsServicesDeviceNameService) {
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

  var Controller = _fxosMvcDistMvc.Controller;
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var DeviceNameController = (function (Controller) {
    var DeviceNameController = function DeviceNameController(options) {
      var _this = this;
      Controller.call(this, options);

      this.view.render();
      document.body.appendChild(this.view.el);

      DeviceNameService.addEventListener("devicenamechange", function (e) {
        return _this._updateDeviceName(e);
      }, true);
    };

    _extends(DeviceNameController, Controller);

    DeviceNameController.prototype.main = function () {
      this.view.el.open();
    };

    DeviceNameController.prototype.handleOpened = function () {};

    DeviceNameController.prototype.handleClosed = function () {
      DeviceNameService.signalDeviceNameCanceled();
    };

    DeviceNameController.prototype.handleSubmit = function () {
      DeviceNameService.setDeviceName(this.view.value);
    };

    DeviceNameController.prototype.handleInput = function () {
      this.view.el.els.submit.disabled = !this.view.value;
    };

    DeviceNameController.prototype._updateDeviceName = function (e) {
      this.view.value = e.deviceName;
    };

    return DeviceNameController;
  })(Controller);

  exports["default"] = DeviceNameController;
});