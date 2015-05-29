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

  "use strict";

  var Service = _fxosMvcDistMvc.Service;


  var MOZ_SETTINGS_NOT_AVAILABLE_MSG = "navigator.mozSettings is not available";

  var SettingsHelper = (function () {
    var SettingsHelper = function SettingsHelper() {};

    SettingsHelper.get = function (name, defaultValue) {
      if (!name) {
        return Promise.reject("Setting name is missing");
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      }

      return new Promise(function (resolve, reject) {
        var setting = navigator.mozSettings.createLock().get(name, defaultValue);
        setting.onsuccess = function () {
          var settingValue = setting.result[name] || defaultValue;
          resolve(settingValue);
        };
        setting.onerror = function () {
          reject(setting.error);
        };
      });
    };

    SettingsHelper.set = function (settings) {
      if (!settings) {
        return Promise.reject("Settings are missing");
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      }

      return new Promise(function (resolve, reject) {
        var result = navigator.mozSettings.createLock().set(settings);
        result.onsuccess = function () {
          resolve(result.result);
        };
        result.onerror = function () {
          reject(result.error);
        };
      });
    };

    SettingsHelper.on = function (name, observer) {
      if (!name) {
        console.warn("Setting name is missing");
        return;
      }

      if (typeof observer !== "function") {
        console.warn("Setting observer must be a function");
        return;
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return;
      }

      navigator.mozSettings.addObserver(name, observer);
    };

    SettingsHelper.off = function (name, observer) {
      if (!name) {
        console.warn("Setting name is missing");
        return;
      }

      if (typeof observer !== "function") {
        console.warn("Setting observer must be a function");
        return;
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return;
      }

      navigator.mozSettings.removeObserver(name, observer);
    };

    return SettingsHelper;
  })();

  exports.SettingsHelper = SettingsHelper;
  var SettingsService = (function (Service) {
    var SettingsService = function SettingsService(_ref) {
      var _this = this;
      var name = _ref.name;
      var defaultValue = _ref.defaultValue;
      var observer = _ref.observer;
      var trigger = _ref.trigger;
      Service.call(this);

      var value = SettingsHelper.get(name, defaultValue).then(function (settingValue) {
        if (trigger && observer) {
          observer(settingValue);
        }
        return settingValue;
      }, function (reason) {
        console.warn("Unable to get", name, reason);
        if (trigger && observer) {
          observer(defaultValue);
        }
      });

      Object.defineProperty(this, "name", { value: name });
      Object.defineProperty(this, "value", {
        enumerable: true,
        get: function () {
          return value;
        },
        set: function (newValue) {
          var settings = {};
          settings[name] = newValue;
          SettingsHelper.set(settings)["catch"](function (reason) {
            return console.warn("Unable to set", name, reason);
          });
        }
      });

      SettingsHelper.on(name, function (_ref2) {
        var settingValue = _ref2.settingValue;
        value = Promise.resolve(settingValue);
        if (observer) {
          observer(settingValue);
        }
        _this._dispatchEvent("settingchange", settingValue);
      });
    };

    _extends(SettingsService, Service);

    return SettingsService;
  })(Service);

  exports.SettingsService = SettingsService;
});