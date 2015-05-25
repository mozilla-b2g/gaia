define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app"], function (exports, _fxosMvcDistMvc, _appJsModelsApp) {
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
  var App = _appJsModelsApp["default"];
  var AppsService = (function (Service) {
    var AppsService = function AppsService() {
      var _this = this;
      Service.call(this);

      this._apps = [];
      this._getApps();

      var mgmt = navigator.mozApps.mgmt;
      mgmt.addEventListener("install", function (app) {
        return _this._handleInstall(app);
      });
      mgmt.addEventListener("uninstall", function (app) {
        return _this._handleUninstall(app);
      });
    };

    _extends(AppsService, Service);

    AppsService.prototype.installAppBlob = function (appData) {
      return new Promise(function (resolve, reject) {
        var sdcard = navigator.getDeviceStorage("sdcard");
        if (!sdcard) {
          console.error("No SD card!");
          reject({ name: "No SD card!" });
          return;
        }

        var fileName = "temp-app.zip";
        var delReq = sdcard["delete"](fileName);
        delReq.onsuccess = delReq.onerror = function () {
          var req = sdcard.addNamed(new Blob([appData], { type: "application/openwebapp+zip" }), fileName);

          req.onsuccess = function () {
            var getReq = sdcard.get(fileName);

            getReq.onsuccess = function () {
              var file = getReq.result;
              navigator.mozApps.mgmt["import"](file).then(function (app) {
                resolve(app);
              }, function (e) {
                console.error("error installing app", e);
                reject(e);
              });
            };

            getReq.onerror = function () {
              console.error("error getting file", getReq.error.name);
              reject(getReq.error);
            };
          };

          req.onerror = function (e) {
            console.error("error saving blob", e);
            reject(e);
          };
        };
      });
    };

    AppsService.prototype.markInstalledAppsInProximityApps = function (peers) {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        _this2._getApps().then(function () {
          resolve(peers);
        });
      });
      /*
          for (var peerIndex in peers) {
            var peer = peers[peerIndex];
             ['apps', 'addons', 'themes'].forEach(appType => {
              if (!peer[appType]) {
                return;
              }
               for (var i = peer[appType].length - 1; i >= 0; i--) {
                var app = peer[appType][i];
                var matchingApp = this._apps.find((installedApp) => {
                  return installedApp.manifest.name === app.manifest.name;
                });
                 if (matchingApp) {
                  peer[appType][i].installed = true;
                }
              }
            });
          }
          resolve(peers);
        });
      });
      */
    };

    AppsService.prototype.getApps = function () {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        _this3._getApps().then(function () {
          resolve(_this3._apps);
        }, reject);
      });
    };

    AppsService.prototype._getApp = function (app, resolve) {
      var _this4 = this;
      // XXX/drs: This is higher than we need, but some apps scale have
      // icons as low as 16px, which look really bad. I'd rather we
      // scale them down than up.
      navigator.mozApps.mgmt.getIcon(app, "128").then(function (icon) {
        var fr = new FileReader();
        fr.addEventListener("loadend", function () {
          app.icon = fr.result;
          _this4._apps.push(app);
          if (resolve) {
            resolve();
          }
        });
        fr.readAsDataURL(icon);
      }, function () {
        app.icon = "icons/default.png";
        _this4._apps.push(app);
        if (resolve) {
          resolve();
        }
      });
    };

    AppsService.prototype._getApps = function () {
      var _this5 = this;
      if (!this._initialized) {
        this._initialized = new Promise(function (oresolve, reject) {
          _this5._apps = [];

          var iconPromises = [];

          var req = navigator.mozApps.mgmt.getAll();
          req.onsuccess = function () {
            var result = req.result;

            for (var index in result) {
              var app = result[index];
              iconPromises.push(new Promise(function (resolve, reject) {
                return _this5._getApp(app, resolve);
              }));
            }

            Promise.all(iconPromises).then(function () {
              _this5._apps = App.filterDefaults(_this5._apps);
              oresolve(_this5._apps);
              _this5._dispatchEvent("updated");
            });
          };

          req.onerror = function (e) {
            console.error("error fetching installed apps: ", e);
            reject(e);
          };
        });
      }

      return this._initialized;
    };

    AppsService.prototype._handleInstall = function (e) {
      var _this6 = this;
      var app = e.application;

      var updateApp = function () {
        (new Promise(function (resolve, reject) {
          _this6._apps = _this6._apps.filter(function (installedApp) {
            return app.manifestURL !== installedApp.manifestURL;
          });
          _this6._getApp(app, resolve);
        })).then(function () {
          _this6._dispatchEvent("updated");
        });
      };

      if (app.downloading) {
        var downloaded = function () {
          app.removeEventListener("downloadsuccess", downloaded);
          updateApp();
        };
        app.addEventListener("downloadsuccess", downloaded);
      } else {
        updateApp();
      }
    };

    AppsService.prototype._handleUninstall = function (e) {
      var app = e.application;
      this._apps = this._apps.filter(function (installedApp) {
        return app.manifestURL !== installedApp.manifestURL;
      });
      this._dispatchEvent("updated");
    };

    return AppsService;
  })(Service);

  exports["default"] = new AppsService();
});