define(["exports", "fxos-mvc/dist/mvc"], function (exports, _fxosMvcDistMvc) {
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
  var ConfirmDownloadController = (function (Controller) {
    var ConfirmDownloadController = function ConfirmDownloadController(options) {
      Controller.call(this, options);

      this.view.render();
    };

    _extends(ConfirmDownloadController, Controller);

    ConfirmDownloadController.prototype.open = function (app, cb) {
      document.body.appendChild(this.view.el);
      this.view.open(app);

      this._cb = cb;
    };

    ConfirmDownloadController.prototype.cancel = function () {
      this.view.close();
    };

    ConfirmDownloadController.prototype.install = function () {
      this.view.close();
      this._cb();
    };

    return ConfirmDownloadController;
  })(Controller);

  exports["default"] = ConfirmDownloadController;
});