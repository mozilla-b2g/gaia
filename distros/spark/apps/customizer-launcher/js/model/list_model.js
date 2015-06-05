define(["exports", "components/fxos-mvc/dist/mvc", "js/lib/helpers"], function (exports, _componentsFxosMvcDistMvc, _jsLibHelpers) {
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

  var Model = _componentsFxosMvcDistMvc.Model;
  var AppsHelper = _jsLibHelpers.AppsHelper;
  var IconHelper = _jsLibHelpers.IconHelper;
  var ListModel = (function (Model) {
    var ListModel = function ListModel() {
      Model.apply(this, arguments);
    };

    _extends(ListModel, Model);

    ListModel.prototype.getAllApps = function () {
      return new Promise(function (resolve, reject) {
        AppsHelper.getAllApps().then(function (allApps) {
          resolve(allApps);
        });
      });
    };

    ListModel.prototype.filterCustomizerAddon = function (apps) {
      return apps.filter(function (app) {
        return app.manifestURL == "app://customizer.gaiamobile.org/manifest.webapp";
      });
    };

    ListModel.prototype.getCustomizerAddOn = function (allApps) {
      var _this = this;
      return new Promise(function (resolve, reject) {
        var addOnList = _this.filterCustomizerAddon(allApps);
        if (addOnList && addOnList.length == 1) {
          resolve(addOnList[0]);
        } else {
          reject(new Error("Cannot fetch customizer add on"));
        }
      });
    };

    ListModel.prototype.filterApps = function (apps) {
      var excludedApps = ["app://keyboard.gaiamobile.org/manifest.webapp", "app://customizer-launcher.gaiamobile.org/manifest.webapp"];

      return apps.filter(function (app) {
        return app.manifest.role !== "addon" && app.manifest.role !== "theme" && app.manifest.role !== "system" && excludedApps.indexOf(app.manifestURL) === -1;
      });
    };

    ListModel.prototype.fillAppDetails = function (app) {
      var detail = Object.create(null);
      detail.manifestURL = app.manifestURL;
      detail.name = app.manifest.name;
      detail.description = app.manifest.description;
      detail.icon = IconHelper.getIconURL(app, app.manifest.icons);
      detail.author = app.manifest.developer ? app.manifest.developer.name : "";
      detail.app = app;
      return detail;
    };

    ListModel.prototype.getAppList = function (allApps) {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        var installedApps = Object.create(null);
        var filterList = _this2.filterApps(allApps);
        filterList.forEach(function (app) {
          return installedApps[app.manifestURL] = _this2.fillAppDetails(app);
        });
        resolve(installedApps);
      });
    };

    return ListModel;
  })(Model);

  exports["default"] = ListModel;
});