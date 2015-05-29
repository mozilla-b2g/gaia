define(["exports", "fxos-mvc/dist/mvc", "gaia-icons/gaia-icons", "gaia-text-input/gaia-text-input", "gaia-dialog/gaia-dialog-prompt", "app/js/services/device_name_service"], function (exports, _fxosMvcDistMvc, _gaiaIconsGaiaIcons, _gaiaTextInputGaiaTextInput, _gaiaDialogGaiaDialogPrompt, _appJsServicesDeviceNameService) {
  "use strict";

  var _classProps = function (child, staticProps, instanceProps) {
    if (staticProps) Object.defineProperties(child, staticProps);
    if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
  };

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

  var View = _fxosMvcDistMvc.View;
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var DeviceNameView = (function (View) {
    var DeviceNameView = function DeviceNameView() {
      View.apply(this, arguments);
    };

    _extends(DeviceNameView, View);

    DeviceNameView.prototype.render = function () {
      var _this = this;
      this.el = document.createElement("gaia-dialog-prompt");

      View.prototype.render.call(this);

      setTimeout(function () {
        _this.els = _this.el.els;

        _this.els.submit.addEventListener("click", function (e) {
          return _this.controller.handleSubmit(e);
        });
        _this.els.submit.disabled = true;

        _this.el.addEventListener("opened", function (e) {
          return _this.controller.handleOpened(e);
        });
        _this.el.addEventListener("closed", function (e) {
          return _this.controller.handleClosed(e);
        });

        _this.els.input.placeholder = "Name your device";
        _this.els.input.addEventListener("input", function (e) {
          return _this.controller.handleInput(e);
        });

        DeviceNameService.getDeviceName().then(function (deviceName) {
          _this.value = deviceName;
          if (deviceName) {
            _this.els.submit.disabled = false;
          }
        });
      });
    };

    _classProps(DeviceNameView, null, {
      value: {
        get: function () {
          return this.els.input.value;
        },
        set: function (val) {
          this.els.input.value = val;
        }
      }
    });

    return DeviceNameView;
  })(View);

  exports["default"] = DeviceNameView;
});