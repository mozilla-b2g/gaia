define(["exports", "fxos-mvc/dist/mvc", "gaia-dialog", "gaia-progress", "gaia-button"], function (exports, _fxosMvcDistMvc, _gaiaDialog, _gaiaProgress, _gaiaButton) {
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

  var View = _fxosMvcDistMvc.View;
  var ProgressDialogView = (function (View) {
    var ProgressDialogView = function ProgressDialogView() {
      View.apply(this, arguments);
    };

    _extends(ProgressDialogView, View);

    ProgressDialogView.prototype.template = function () {
      var string = "\n      <h1>Downloading app</h1>\n      <gaia-progress></gaia-progress>\n    ";
      return string;
    };

    ProgressDialogView.prototype.render = function () {
      this.el = document.createElement("gaia-dialog");

      View.prototype.render.call(this);

      this.el.addEventListener("closed", this.controller.teardown.bind(this.controller));
      this.el.addEventListener("touchstart", this._handleTouchStart.bind(this));
    };

    ProgressDialogView.prototype.success = function (app) {
      this.el.innerHTML = "\n      <p>Successfully downloaded " + app.manifest.name + "!</p>\n    ";
      this._loading = false;
    };

    ProgressDialogView.prototype.error = function (e) {
      var _this = this;
      this.el.innerHTML = "\n      <p>Error downloading app: " + (e.name || "") + " " + (e.description || "") + "</p>\n      <section><gaia-button>Ok</gaia-button></section>\n    ";
      this._loading = false;

      setTimeout(function () {
        var button = _this.el.querySelector("gaia-button");
        button.addEventListener("click", _this.close.bind(_this));
      });
    };

    ProgressDialogView.prototype.open = function (app) {
      this.el.open();
      this._loading = true;
    };

    ProgressDialogView.prototype.close = function () {
      this.el.close();
    };

    ProgressDialogView.prototype._handleTouchStart = function (e) {
      if (this._loading) {
        e.preventDefault();
      }
    };

    return ProgressDialogView;
  })(View);

  exports["default"] = ProgressDialogView;
});