define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/apps_service", "app/js/services/broadcast_service", "app/js/services/http_client_service", "app/js/services/p2p_service", "app/js/services/wifi_service", "app/js/views/share_summary_view", "app/js/views/list_view", "app/js/views/proximity_empty_view", "app/js/views/templates/composite"], function (exports, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesAppsService, _appJsServicesBroadcastService, _appJsServicesHttpClientService, _appJsServicesP2pService, _appJsServicesWifiService, _appJsViewsShareSummaryView, _appJsViewsListView, _appJsViewsProximityEmptyView, _appJsViewsTemplatesComposite) {
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
  var WifiService = _appJsServicesWifiService["default"];
  var ShareSummaryView = _appJsViewsShareSummaryView["default"];
  var ListView = _appJsViewsListView["default"];
  var ProximityEmptyView = _appJsViewsProximityEmptyView["default"];
  var CompositeTemplate = _appJsViewsTemplatesComposite["default"];
  var ProximityAppsController = (function (Controller) {
    var ProximityAppsController = function ProximityAppsController() {
      var _this = this;
      this.shareSummaryView = new ShareSummaryView({
        controller: this
      });
      this.proximityEmptyView = new ProximityEmptyView({
        controller: this
      });
      this.proximityAppsView = new ListView({
        controller: this,
        id: "proximity-apps",
        title: "Available apps",
        type: "download",
        attr: "apps"
      });
      this.proximityAddonsView = new ListView({
        controller: this,
        id: "proximity-addons",
        title: "Available add-ons",
        type: "download",
        attr: "addons"
      });
      this.proximityThemesView = new ListView({
        controller: this,
        id: "proximity-themes",
        title: "Available themes",
        type: "download",
        attr: "themes"
      });
      this.marketplacesView = new ListView({
        controller: this,
        id: "marketplaces",
        title: "Marketplaces",
        type: "link",
        attr: "marketplaces"
      });
      this.view = new CompositeTemplate({
        controller: this,
        header: {
          title: "P2P Sharing"
        },
        active: true,
        id: "proximity-apps-container",
        views: [this.shareSummaryView, this.proximityEmptyView, this.proximityAppsView, this.proximityAddonsView, this.proximityThemesView, this.marketplacesView]
      });

      BroadcastService.addEventListener("broadcast", function (e) {
        return _this._broadcastChanged(e);
      }, true);

      P2pService.addEventListener("proximity", function () {
        return _this._renderList();
      }, true);

      AppsService.addEventListener("updated", function () {
        return _this._renderList();
      }, true);

      WifiService.addEventListener("statuschange", function () {
        return _this._renderList();
      });

      this._renderList();
    };

    _extends(ProximityAppsController, Controller);

    ProximityAppsController.prototype.main = function () {
      this.view.el.classList.add("active");
    };

    ProximityAppsController.prototype.teardown = function () {
      this.view.el.classList.remove("active");
    };

    ProximityAppsController.prototype.download = function (e) {
      var id = e.target.dataset.id;
      var apps = P2pService.getApps();
      var app = App.getApp(apps, { manifestURL: id });

      Sharing.ConfirmDownloadController.open(app, function () {
        var progressDialogController = Sharing.ProgressDialogController;

        progressDialogController.main();

        HttpClientService.downloadApp(app).then(progressDialogController.success.bind(progressDialogController), progressDialogController.error.bind(progressDialogController));
      });
    };

    ProximityAppsController.prototype.open = function (e) {
      var id = e.target.dataset.id;
      navigator.mozApps.mgmt.getAll().then(function (apps) {
        apps.forEach(function (app) {
          if (app.manifestURL === id) {
            app.launch();
          }
        });
      });
    };

    ProximityAppsController.prototype.description = function (e) {
      // In case the tap hit a child node of the <div> element with the data-id
      // attribute set.
      var appId = e.target.dataset.id || e.target.parentNode.dataset.id;
      var list = e.target.closest(".app-list");
      if (list.classList.contains("link")) {
        this.open(e);
      } else {
        Sharing.AppController.main(appId);
      }
    };

    ProximityAppsController.prototype.openSharePanel = function () {
      this.teardown();
      Sharing.ShareController.main();
    };

    ProximityAppsController.prototype._broadcastChanged = function (e) {
      this.shareSummaryView.displayBroadcast(e.broadcast);
    };

    ProximityAppsController.prototype._renderList = function () {
      var _this2 = this;
      var proxApps = P2pService.getApps();

      AppsService.getApps(true /* include defaults */).then(function (installedApps) {
        var apps = App.filterApps(proxApps);
        var addons = App.filterAddons(proxApps);
        var themes = App.filterThemes(proxApps);
        var marketplaces = App.filterMarketplaces(installedApps);

        var proximityEmpty = apps.length === 0 && addons.length === 0 && themes.length === 0;
        var noNetwork = !WifiService.isConnected();
        _this2.proximityEmptyView.render();
        _this2.proximityEmptyView.show({
          proximityEmpty: proximityEmpty,
          noNetwork: noNetwork
        });

        _this2.proximityAppsView.render(App.markInstalledApps(installedApps, apps));

        _this2.proximityAddonsView.render(App.markInstalledApps(installedApps, addons));

        _this2.proximityThemesView.render(App.markInstalledApps(installedApps, themes));

        _this2.marketplacesView.render(marketplaces);
      });
    };

    return ProximityAppsController;
  })(Controller);

  exports["default"] = ProximityAppsController;
});