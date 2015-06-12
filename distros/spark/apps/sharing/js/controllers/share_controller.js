define(["exports", "fxos-mvc/dist/mvc", "app/js/models/app", "app/js/services/apps_service", "app/js/services/broadcast_service", "app/js/services/device_name_service", "app/js/services/share_service", "app/js/views/share_settings_view", "app/js/views/list_view", "app/js/views/templates/composite"], function (exports, _fxosMvcDistMvc, _appJsModelsApp, _appJsServicesAppsService, _appJsServicesBroadcastService, _appJsServicesDeviceNameService, _appJsServicesShareService, _appJsViewsShareSettingsView, _appJsViewsListView, _appJsViewsTemplatesComposite) {
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
  var DeviceNameService = _appJsServicesDeviceNameService["default"];
  var ShareService = _appJsServicesShareService["default"];
  var ShareSettingsView = _appJsViewsShareSettingsView["default"];
  var ListView = _appJsViewsListView["default"];
  var CompositeTemplate = _appJsViewsTemplatesComposite["default"];
  var ShareController = (function (Controller) {
    var ShareController = function ShareController() {
      var _this = this;
      this.shareSettingsView = new ShareSettingsView({
        controller: this
      });
      this.sharedAppsView = new ListView({
        controller: this,
        id: "shared-apps",
        title: "My apps",
        type: "toggle",
        disabled: true
      });
      this.sharedAddonsView = new ListView({
        controller: this,
        id: "shared-addons",
        title: "My add-ons",
        type: "toggle",
        disabled: true
      });
      this.sharedThemesView = new ListView({
        controller: this,
        id: "shared-themes",
        title: "My themes",
        type: "toggle",
        disabled: true
      });
      this.view = new CompositeTemplate({
        controller: this,
        header: {
          title: "Share My Apps",
          action: "back"
        },
        id: "share-apps-container",
        views: [this.shareSettingsView, this.sharedAppsView, this.sharedAddonsView, this.sharedThemesView]
      });

      BroadcastService.addEventListener("broadcast", function (e) {
        return _this._broadcastChanged(e);
      }, true);

      DeviceNameService.addEventListener("devicenamechange", function (e) {
        return _this._deviceNameChanged(e);
      }, true);

      DeviceNameService.addEventListener("devicenamechange-cancel", function () {
        return _this.back();
      });

      AppsService.addEventListener("updated", function () {
        return _this._appsChanged();
      }, true);

      DeviceNameService.getDeviceName().then(function (deviceName) {
        _this._deviceNameChanged({ deviceName: deviceName });
      });
    };

    _extends(ShareController, Controller);

    ShareController.prototype.main = function () {
      this.view.el.classList.add("active");

      if (DeviceNameService.isDefault()) {
        Sharing.DeviceNameController.main();
      }
    };

    ShareController.prototype.teardown = function () {
      this.view.el.classList.remove("active");
    };

    ShareController.prototype._appsChanged = function () {
      var _this2 = this;
      // We want to fetch all of our apps, even if we're not broadcasting them, so
      // that we can show them greyed out.
      var options = { ignoreBroadcast: true };

      Promise.all([AppsService.getApps(), ShareService.getApps(options)]).then(function (results) {
        var installedApps = results[0];
        var sharedApps = results[1];
        var apps = App.markSharedApps(sharedApps, installedApps);

        _this2.sharedAppsView.render(App.filterApps(apps));
        _this2.sharedAddonsView.render(App.filterAddons(apps));
        _this2.sharedThemesView.render(App.filterThemes(apps));
      });
    };

    ShareController.prototype.toggleBroadcasting = function (toggle) {
      BroadcastService.setBroadcast(toggle);
    };

    ShareController.prototype._broadcastChanged = function (e) {
      var broadcast = e.broadcast;
      this.shareSettingsView.displayBroadcast(broadcast);
      this.sharedAppsView.toggle(!broadcast);
      this.sharedAddonsView.toggle(!broadcast);
      this.sharedThemesView.toggle(!broadcast);
    };

    ShareController.prototype._deviceNameChanged = function (e) {
      this.shareSettingsView.deviceName = e.deviceName;
    };

    ShareController.prototype.back = function () {
      this.teardown();
      Sharing.ProximityAppsController.main();
    };

    ShareController.prototype.toggle = function (e) {
      AppsService.getApps().then(function (apps) {
        var el = e.target.querySelector(".control");
        var app = App.getApp(apps, { manifestURL: el.dataset.id });
        ShareService.setAppShare(app, !el.checked).then(function () {
          return el.toggle();
        });
      });
    };

    ShareController.prototype.description = function (e) {
      this.toggle({ target: e.target.parentNode });
    };

    ShareController.prototype.rename = function () {
      Sharing.DeviceNameController.main();
    };

    return ShareController;
  })(Controller);

  exports["default"] = ShareController;
});