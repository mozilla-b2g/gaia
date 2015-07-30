define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/apps_service", "app/js/services/broadcast_service"], function (exports, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesAppsService, _appJsServicesBroadcastService) {
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
  var AppsService = _appJsServicesAppsService["default"];
  var BroadcastService = _appJsServicesBroadcastService["default"];


  // Prune the database 60 seconds after opening the app.
  var PRUNE_TIMER = 60000;

  var ShareService = (function (Service) {
    var ShareService = function ShareService() {
      var _this = this;
      Service.call(this);

      this._shares = {};

      this._initialized = new Promise(function (resolve, reject) {
        navigator.getDataStores("p2p_shares").then(function (stores) {
          _this._store = stores[0];
          _this._store.getLength().then(function (length) {
            if (!length) {
              resolve();
              return;
            }

            var cursor = _this._store.sync();
            _this._runNextTask(cursor, resolve, reject, function (id, data) {
              return _this._loadShare(id, data);
            });
          });
        });

        setTimeout(function () {
          return _this._pruneStore();
        }, PRUNE_TIMER);
      }).then(function () {
        return _this._dispatchEvent("share");
      });
    };

    _extends(ShareService, Service);

    ShareService.prototype.getApps = function (options) {
      var _this2 = this;
      options = options || {};

      return new Promise(function (resolve, reject) {
        Promise.all([BroadcastService.getBroadcast(), AppsService.getApps(), _this2._initialized]).then(function (results) {
          var broadcast = results[0];
          if (!broadcast && !options.ignoreBroadcast) {
            resolve([]);
            return;
          }

          var apps = results[1];
          resolve(apps.filter(function (app) {
            return !!_this2._shares[app.manifestURL];
          }));
        }, reject);
      });
    };

    ShareService.prototype.setAppShare = function (app, enable) {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        if (enable) {
          _this3._store.add(app.manifestURL).then(function (id) {
            _this3._loadShare(id, app.manifestURL);
            resolve();
            _this3._dispatchEvent("share");
          }, reject);
        } else {
          _this3._store.remove(_this3._shares[app.manifestURL]).then(function (success) {
            if (success) {
              delete _this3._shares[app.manifestURL];
              resolve();
              _this3._dispatchEvent("share");
            } else {
              reject();
            }
          }, reject);
        }
      });
    };

    ShareService.prototype._runNextTask = function (cursor, resolve, reject, cb) {
      var _this4 = this;
      cursor.next().then(function (task) {
        return _this4._manageTask(cursor, task, resolve, reject, cb);
      });
    };

    ShareService.prototype._manageTask = function (cursor, task, resolve, reject, cb) {
      switch (task.operation) {
        case "done":
          resolve();
          break;
        case "add":
          cb(task.id, task.data);
        /* falls through */
        default:
          this._runNextTask(cursor, resolve, reject, cb);
          break;
      }
    };

    ShareService.prototype._loadShare = function (id, manifestURL) {
      this._shares[manifestURL] = id;
    };

    ShareService.prototype._pruneShare = function (id, data) {
      var _this5 = this;
      AppsService.getApps().then(function (apps) {
        var app = App.getApp(apps, { manifestURL: data });
        // If this app isn't installed, or has occurred multiple times in the
        // DataStore, delete it.
        if (!app || _this5._prunedShares[data]) {
          _this5._store.remove(id);
        }
        _this5._prunedShares[data] = id;
      });
    };

    ShareService.prototype._pruneStore = function () {
      var _this6 = this;
      new Promise(function (resolve, reject) {
        _this6._initialized.then(function () {
          // Keep an array with all of the app instances that we've run into so
          // far, to determine uniqueness.
          _this6._prunedShares = {};
          var cursor = _this6._store.sync();
          _this6._runNextTask(cursor, resolve, reject, function (id, data) {
            return _this6._pruneShare(id, data);
          });
        });
        // Clear the array as it's no longer needed.
      }).then(function () {
        return delete _this6._prunedShares;
      });
    };

    return ShareService;
  })(Service);

  exports["default"] = new ShareService();
});