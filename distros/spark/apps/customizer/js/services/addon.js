define(["exports"], function (exports) {
  "use strict";

  /* global MozActivity */

  /* global AddonGenerator */

  var GENERATED_ADDON_COUNT_KEY = "__CUSTOMIZER__generatedAddonCount";

  var AddonService = {};

  AddonService.getAddons = function (host) {
    return new Promise(function (resolve, reject) {
      var request = navigator.mozApps.mgmt.getAll();
      request.onsuccess = function () {
        var addons = request.result.filter(function (app) {
          var manifest = app.manifest || {};
          if (manifest.role !== "addon") {
            return false;
          }

          if (!host) {
            return true;
          }

          return !!((manifest.customizations || []).find(function (customization) {
            return (customization.filter || "").indexOf(host) !== -1;
          }));
        });

        resolve(addons);
      };
      request.onerror = function () {
        reject(request);
      };
    });
  };

  AddonService.getAddon = function (manifestURL) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.getAddons().then(function (addons) {
        var addon = addons.find(function (addon) {
          return addon.manifestURL === manifestURL;
        });
        if (!addon) {
          reject();
          return;
        }

        resolve(addon);
      })["catch"](reject);
    });
  };

  AddonService.getGenerator = function (target) {
    var _this2 = this;
    return new Promise(function (resolve, reject) {
      _this2.getAddons(window.location.host).then(function (addons) {
        var number = parseInt(localStorage.getItem(GENERATED_ADDON_COUNT_KEY), 10) || 0;
        var name = window.prompt("Enter a name for this add-on", "Addon " + (number + 1));
        if (!name) {
          reject();
          return;
        }

        var generator = new AddonGenerator({
          target: target,
          name: name
        });

        resolve(generator);
      })["catch"](reject);
    });
  };

  AddonService.generate = function (target, callback) {
    if (typeof callback !== "function") {
      return;
    }

    return AddonService.getGenerator(target).then(function (generator) {
      callback(generator);

      var addonBlob = new Blob([generator.generate()], { type: "application/zip" });
      AddonService.install(addonBlob);
    });
  };

  AddonService.install = function (blob) {
    var _this3 = this;
    return new Promise(function (resolve, reject) {
      var activity = new MozActivity({
        name: "import-app",
        data: {
          blob: blob
        }
      });

      activity.onsuccess = function () {
        _this3.getAddon(activity.result.manifestURL).then(function (addon) {
          var number = parseInt(localStorage.getItem(GENERATED_ADDON_COUNT_KEY), 10) || 0;
          localStorage.setItem(GENERATED_ADDON_COUNT_KEY, number + 1);

          resolve(addon);
        })["catch"](function (error) {
          console.error("Unable to get the addon after importing", error);
          reject(error);
        });
      };

      activity.onerror = function (error) {
        console.error("Unable to install the addon", error);
        reject(error);
      };
    });
  };
});