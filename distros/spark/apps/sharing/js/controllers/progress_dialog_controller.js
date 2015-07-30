define(["exports", "fxos-mvc/dist/mvc", "app/js/views/progress_dialog_view"], function (exports, _fxosMvcDistMvc, _appJsViewsProgressDialogView) {
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
  var ProgressDialogView = _appJsViewsProgressDialogView["default"];
  var ProgressDialogController = (function (Controller) {
    var ProgressDialogController = function ProgressDialogController() {
      this.view = new ProgressDialogView();
      this.view.init(this);
    };

    _extends(ProgressDialogController, Controller);

    ProgressDialogController.prototype.main = function () {
      var _this = this;
      this.view.render();
      document.body.appendChild(this.view.el);

      setTimeout(function () {
        _this.view.open();
      });
    };

    ProgressDialogController.prototype.teardown = function () {
      document.body.removeChild(this.view.el);
    };

    ProgressDialogController.prototype.success = function (app) {
      var _this2 = this;
      this.view.success(app);

      setTimeout(function () {
        _this2.view.close();
      }, 3000);
    };

    ProgressDialogController.prototype.error = function (e) {
      this.view.error(e);
    };

    return ProgressDialogController;
  })(Controller);

  exports["default"] = ProgressDialogController;
});