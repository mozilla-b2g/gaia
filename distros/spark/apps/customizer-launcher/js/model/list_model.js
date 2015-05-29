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

    ListModel.prototype.filterApps = function (apps) {
      var excludedApps = ["Built-in Keyboard", "Settings"];

      return apps.filter(function (app) {
        return app.manifest.role !== "addon" && app.manifest.role !== "theme" && app.manifest.role !== "system" && excludedApps.indexOf(app.manifest.name) === -1;
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

    ListModel.prototype.getAppList = function () {
      var _this = this;
      return new Promise(function (resolve, reject) {
        var installedApps = Object.create(null);
        AppsHelper.getAllApps().then(function (allApps) {
          var filterList = _this.filterApps(allApps);
          filterList.forEach(function (app) {
            installedApps[app.manifestURL] = _this.fillAppDetails(app);
          });

          _this.logObject(installedApps);
          resolve(installedApps);
        });
      });
    };

    ListModel.prototype.logObject = function (app) {
      for (var i in app) {
        console.log("property & values: ", i + " : & : ");
        console.log(app[i]);
      }
    };

    return ListModel;
  })(Model);

  exports["default"] = ListModel;
});