define(["exports", "fxos-mvc/dist/mvc", "gaia-header", "gaia-icons", "fxos-dev-mode-dialog"], function (exports, _fxosMvcDistMvc, _gaiaHeader, _gaiaIcons, _fxosDevModeDialog) {
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
  var MainView = (function (View) {
    var MainView = function MainView(options) {
      View.call(this, options);

      this.els = {};
      this.els.devModeDialog = document.createElement("fxos-dev-mode-dialog");
      this.el.appendChild(this.els.devModeDialog);

      this.on("action", "gaia-header");
      this.on("contextmenu", "gaia-header h1");
    };

    _extends(MainView, View);

    MainView.prototype.render = function () {};

    return MainView;
  })(View);

  exports["default"] = MainView;
});