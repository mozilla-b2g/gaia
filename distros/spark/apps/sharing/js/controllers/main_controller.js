define(["exports", "fxos-mvc/dist/mvc", "app/js/views/main_view", "app/js/controllers/app_controller", "app/js/controllers/confirm_download_controller", "app/js/controllers/device_name_controller", "app/js/controllers/progress_dialog_controller", "app/js/controllers/proximity_apps_controller", "app/js/controllers/share_controller", "app/js/views/app_view", "app/js/views/confirm_download_view", "app/js/views/device_name_view", "app/js/views/progress_dialog_view", "app/js/services/activity_service", "app/js/services/achievements_service"], function (exports, _fxosMvcDistMvc, _appJsViewsMainView, _appJsControllersAppController, _appJsControllersConfirmDownloadController, _appJsControllersDeviceNameController, _appJsControllersProgressDialogController, _appJsControllersProximityAppsController, _appJsControllersShareController, _appJsViewsAppView, _appJsViewsConfirmDownloadView, _appJsViewsDeviceNameView, _appJsViewsProgressDialogView, _appJsServicesActivityService, _appJsServicesAchievementsService) {
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
  var ProgressDialogView = _appJsViewsProgressDialogView["default"];
  var MainController = (function (Controller) {
    var MainController = function MainController() {
      Controller.call(this);

      this.view = new MainView({
        controller: this,
        el: document.body
      });

      window.Sharing = {
        AppController: new AppController({ view: new AppView() }),
        ConfirmDownloadController: new ConfirmDownloadController({ view: new ConfirmDownloadView() }),
        DeviceNameController: new DeviceNameController({ view: new DeviceNameView() }),
        ProgressDialogController: new ProgressDialogController({ view: new ProgressDialogView() }),
        ProximityAppsController: new ProximityAppsController(),
        ShareController: new ShareController()
      };

      window.requestAnimationFrame(function () {
        document.documentElement.classList.remove("loading");
      });
    };

    _extends(MainController, Controller);

    return MainController;
  })(Controller);

  exports["default"] = MainController;
});