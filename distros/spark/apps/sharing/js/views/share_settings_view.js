define(["exports", "fxos-mvc/dist/mvc", "gaia-button", "gaia-switch"], function (exports, _fxosMvcDistMvc, _gaiaButton, _gaiaSwitch) {
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
  var ShareSettingsView = (function (View) {
    var ShareSettingsView = function ShareSettingsView() {
      this.el = document.createElement("gaia-list");
      this.el.id = "share-settings";

      this.render();
    };

    _extends(ShareSettingsView, View);

    ShareSettingsView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      setTimeout(function () {
        _this.els = {};

        _this.els.shareEnabled = _this.$("#share-enabled");
        _this.els.shareEnabled.addEventListener("change", function (e) {
          return _this._handleShareEnabledChange(e);
        });

        _this.els.shareDescription = _this.$("#share-description");

        _this.els.renameDevice = _this.$("#rename-device");
        _this.els.renameDevice.addEventListener("click", function (e) {
          return _this._handleRenameDevice(e);
        });

        _this.els.deviceName = _this.$("#device-name");
      });
    };

    ShareSettingsView.prototype.template = function () {
      var string = "\n      <li>\n        <div>\n          <h3>Share My Apps</h3>\n          <h4 id=\"share-description\">Turn on to share apps</h4>\n        </div>\n        <gaia-switch id=\"share-enabled\"></gaia-switch>\n      </li>\n      <li>\n        <div>\n          <h3>Device Name</h3>\n          <h4 id=\"device-name\">Loading...</h4>\n        </div>\n        <i class=\"forward-light\"></i>\n      </li>\n      <li class=\"borderless\">\n        <div aria-disabled=\"true\" id=\"rename-device\" class=\"button\">\n          Rename Device\n        </div>\n      </li>\n    ";

      return string;
    };

    ShareSettingsView.prototype.displayBroadcast = function (enabled) {
      var _this2 = this;
      setTimeout(function () {
        _this2.els.shareDescription.textContent = enabled ? "Sharing On" : "Turn on to share apps";

        if (enabled) {
          _this2.els.shareEnabled.setAttribute("checked", "");
        } else {
          _this2.els.shareEnabled.removeAttribute("checked");
        }
      }, 0);
    };

    ShareSettingsView.prototype._handleShareEnabledChange = function (e) {
      this.controller.toggleBroadcasting(e.target.checked);
    };

    ShareSettingsView.prototype._handleRenameDevice = function (e) {
      this.controller.handleRenameDevice();
    };

    _classProps(ShareSettingsView, null, {
      deviceName: {
        get: function () {
          console.error("DONT USE ME LOL!");
          return this.els.deviceName.textContent;
        },
        set: function (deviceName) {
          var _this3 = this;
          setTimeout(function () {
            _this3.els.renameDevice.removeAttribute("aria-disabled");
            _this3.els.deviceName.textContent = deviceName;
          });
        }
      }
    });

    return ShareSettingsView;
  })(View);

  exports["default"] = ShareSettingsView;
});