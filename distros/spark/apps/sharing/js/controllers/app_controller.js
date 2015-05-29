define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/apps_service", "app/js/services/http_client_service", "app/js/services/p2p_service"], function (exports, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesAppsService, _appJsServicesHttpClientService, _appJsServicesP2pService) {
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
  var App = _appJsModelsApp["default"];
  var AppsService = _appJsServicesAppsService["default"];
  var HttpClientService = _appJsServicesHttpClientService["default"];
  var P2pService = _appJsServicesP2pService["default"];
  var AppController = (function (Controller) {
    var AppController = function AppController(options) {
      var _this = this;
      Controller.call(this, options);

      this._appsUpdated = function () {
        return _this.main();
      };
    };

    _extends(AppController, Controller);

    AppController.prototype.main = function () {
      var _this2 = this;
      var appId = window.history.state;

      var proxApps = P2pService.getApps();

      this._app = App.getApp(proxApps, { manifestURL: appId });
      this.header = this._app && this._app.manifest.name;

      AppsService.getApps().then(function (installedApps) {
        _this2._app = App.markInstalledApps(installedApps, [_this2._app])[0];
        _this2._show();
      });
    };

    AppController.prototype._show = function () {
      this.view.show(this._app);
      document.body.appendChild(this.view.el);

      AppsService.addEventListener("updated", this._appsUpdated);
    };

    AppController.prototype.teardown = function () {
      document.body.removeChild(this.view.el);

      AppsService.removeEventListener("updated", this._appsUpdated);
    };

    AppController.prototype.download = function (e) {
      var _this3 = this;
      var confirmDownloadController = window.routingController.controller("confirm_download");
      confirmDownloadController.open(this._app, function () {
        var progressDialogController = window.routingController.controller("progress_dialog");
        progressDialogController.main();

        HttpClientService.downloadApp(_this3._app).then(progressDialogController.success.bind(progressDialogController), progressDialogController.error.bind(progressDialogController));
      });
    };

    return AppController;
  })(Controller);

  exports["default"] = AppController;
});