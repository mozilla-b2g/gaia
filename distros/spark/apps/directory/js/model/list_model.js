define(["exports", "components/fxos-mvc/dist/mvc"], function (exports, _componentsFxosMvcDistMvc) {
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
  var ListModel = (function (Model) {
    var ListModel = function ListModel() {
      Model.apply(this, arguments);
    };

    _extends(ListModel, Model);

    ListModel.prototype.getAppList = function () {
      var _this = this;
      return new Promise(function (resolve, reject) {
        var localApps = _this.loadApps("/apps.json");
        var remoteApps = _this.loadApps("http://directory.fxosapps.org/apps.json");
        Promise.all([localApps, remoteApps]).then(function (sources) {
          localApps = sources[0];
          remoteApps = sources[1];

          // Try to fetch the remote app list, but if it fails, use the packaged
          // one instead.
          resolve(Object.keys(remoteApps).length ? remoteApps : localApps);
        });
      });
    };

    ListModel.prototype.loadApps = function (url) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
        xhr.open("GET", url, true);
        xhr.responseType = "json";
        xhr.onload = function () {
          var apps = {};
          if (xhr.status === 200) {
            apps = xhr.response;
            localStorage.setItem("apps", JSON.stringify(apps));
          } else {
            console.log("Error fetching app list", xhr.status);
          }
          resolve(apps);
        };
        xhr.onerror = function (e) {
          console.log("Error fetching app list", e);
          resolve({});
        };
        xhr.send();
      });
    };

    return ListModel;
  })(Model);

  exports["default"] = ListModel;
});