define(["exports", "fxos-mvc/dist/mvc", "app/js/views/main_view", "app/js/controllers/app_controller", "app/js/controllers/confirm_download_controller", "app/js/controllers/device_name_controller", "app/js/controllers/progress_dialog_controller", "app/js/controllers/proximity_apps_controller", "app/js/controllers/share_controller", "app/js/views/app_view", "app/js/views/confirm_download_view", "app/js/views/device_name_view", "app/js/services/activity_service", "app/js/services/achievements_service", "app/js/services/p2p_service"], function (exports, _fxosMvcDistMvc, _appJsViewsMainView, _appJsControllersAppController, _appJsControllersConfirmDownloadController, _appJsControllersDeviceNameController, _appJsControllersProgressDialogController, _appJsControllersProximityAppsController, _appJsControllersShareController, _appJsViewsAppView, _appJsViewsConfirmDownloadView, _appJsViewsDeviceNameView, _appJsServicesActivityService, _appJsServicesAchievementsService, _appJsServicesP2pService) {
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

  var RoutingController = _fxosMvcDistMvc.RoutingController;
  var MainView = _appJsViewsMainView["default"];
  var AppController = _appJsControllersAppController["default"];
  var ConfirmDownloadController = _appJsControllersConfirmDownloadController["default"];
  var DeviceNameController = _appJsControllersDeviceNameController["default"];
  var ProgressDialogController = _appJsControllersProgressDialogController["default"];
  var ProximityAppsController = _appJsControllersProximityAppsController["default"];
  var ShareController = _appJsControllersShareController["default"];
  var AppView = _appJsViewsAppView["default"];
  var ConfirmDownloadView = _appJsViewsConfirmDownloadView["default"];
  var DeviceNameView = _appJsViewsDeviceNameView["default"];
  var P2pService = _appJsServicesP2pService["default"];
  var MainController = (function (RoutingController) {
    var MainController = function MainController() {
      this.view = new MainView({ el: document.body });

      var indexController = new ProximityAppsController();

      RoutingController.call(this, {
        "": indexController,
        app: new AppController({
          view: new AppView()
        }),
        confirm_download: new ConfirmDownloadController({
          view: new ConfirmDownloadView()
        }),
        device_name: new DeviceNameController({
          view: new DeviceNameView()
        }),
        proximity_apps: indexController,
        progress_dialog: new ProgressDialogController(),
        share: new ShareController()
      });
    };

    _extends(MainController, RoutingController);

    MainController.prototype.main = function () {
      this.view.render();
      RoutingController.prototype.main.call(this);
      this.route();
      document.documentElement.classList.remove("loading");
    };

    MainController.prototype.route = function () {
      var _this = this;
      RoutingController.prototype.route.call(this);
      setTimeout(function () {
        _this.view.setHeader(_this.activeController.header);
        _this.view.toggleBackButton(_this.activeController !== _this._controllers[""]);
      });
    };

    MainController.prototype.back = function (e) {
      if (e.detail.type !== "back") {
        return;
      }

      if (window.location.hash === "" && window.activityHandled) {
        window.close();
      }

      window.location.hash = "";
    };

    MainController.prototype.developer = function (e) {
      P2pService.insertFakeData();
    };

    return MainController;
  })(RoutingController);

  exports["default"] = MainController;
});