define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/apps_service", "app/js/services/broadcast_service", "app/js/services/http_client_service", "app/js/services/p2p_service", "app/js/views/share_summary_view", "app/js/views/list_view"], function (exports, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesAppsService, _appJsServicesBroadcastService, _appJsServicesHttpClientService, _appJsServicesP2pService, _appJsViewsShareSummaryView, _appJsViewsListView) {
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
  var BroadcastService = _appJsServicesBroadcastService["default"];
  var HttpClientService = _appJsServicesHttpClientService["default"];
  var P2pService = _appJsServicesP2pService["default"];
  var ShareSummaryView = _appJsViewsShareSummaryView["default"];
  var ListView = _appJsViewsListView["default"];
  var ProximityAppsController = (function (Controller) {
    var ProximityAppsController = function ProximityAppsController() {
      var _this = this;
      this.shareSummaryView = new ShareSummaryView();
      this.shareSummaryView.init(this);
      this.proximityAppsView = new ListView({
        id: "proximity-apps",
        title: "Available apps",
        type: "download",
        attr: "apps"
      });
      this.proximityAppsView.init(this);
      this.proximityAddonsView = new ListView({
        id: "proximity-addons",
        title: "Available add-ons",
        type: "download",
        attr: "addons"
      });
      this.proximityAddonsView.init(this);
      this.proximityThemesView = new ListView({
        id: "proximity-themes",
        title: "Available themes",
        type: "download",
        attr: "themes"
      });
      this.proximityThemesView.init(this);

      BroadcastService.addEventListener("broadcast", function (e) {
        return _this._broadcastChanged(e);
      }, true);

      P2pService.addEventListener("proximity", function () {
        return _this._proximityChanged();
      }, true);

      AppsService.addEventListener("updated", function () {
        return _this._proximityChanged();
      }, true);

      this._proximityChanged();
    };

    _extends(ProximityAppsController, Controller);

    ProximityAppsController.prototype.main = function () {
      document.body.appendChild(this.shareSummaryView.el);

      document.body.appendChild(this.proximityAppsView.el);
      document.body.appendChild(this.proximityAddonsView.el);
      document.body.appendChild(this.proximityThemesView.el);
    };

    ProximityAppsController.prototype.teardown = function () {
      document.body.removeChild(this.shareSummaryView.el);

      document.body.removeChild(this.proximityAppsView.el);
      document.body.removeChild(this.proximityAddonsView.el);
      document.body.removeChild(this.proximityThemesView.el);
    };

    ProximityAppsController.prototype._broadcastChanged = function (e) {
      this.shareSummaryView.displayBroadcast(e.broadcast);
    };

    ProximityAppsController.prototype._proximityChanged = function () {
      var _this2 = this;
      var proxApps = P2pService.getApps();

      AppsService.getApps().then(function (installedApps) {
        _this2.proximityAppsView.render(App.markInstalledApps(installedApps, App.filterApps(proxApps)));

        _this2.proximityAddonsView.render(App.markInstalledApps(installedApps, App.filterAddons(proxApps)));

        _this2.proximityThemesView.render(App.markInstalledApps(installedApps, App.filterThemes(proxApps)));
      });
    };

    ProximityAppsController.prototype.download = function (e) {
      var id = e.target.dataset.id;
      var apps = P2pService.getApps();
      var app = App.getApp(apps, { manifestURL: id });

      var confirmDownloadController = window.routingController.controller("confirm_download");
      confirmDownloadController.open(app, function () {
        var progressDialogController = window.routingController.controller("progress_dialog");
        progressDialogController.main();

        HttpClientService.downloadApp(app).then(progressDialogController.success.bind(progressDialogController), progressDialogController.error.bind(progressDialogController));
      });
    };

    ProximityAppsController.prototype.description = function (e) {
      // In case the tap hit a child node of the <div> element with the data-app
      // attribute set.
      var appId = e.target.dataset.id || e.target.parentNode.dataset.id;
      window.location.hash = "app";
      window.history.pushState(appId, appId);
    };

    ProximityAppsController.prototype.openSharePanel = function () {
      window.location.hash = "share";
    };

    return ProximityAppsController;
  })(Controller);

  exports["default"] = ProximityAppsController;
});