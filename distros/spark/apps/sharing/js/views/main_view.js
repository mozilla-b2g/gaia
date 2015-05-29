define(["exports", "fxos-mvc/dist/mvc", "gaia-header/dist/gaia-header", "gaia-icons/gaia-icons"], function (exports, _fxosMvcDistMvc, _gaiaHeaderDistGaiaHeader, _gaiaIconsGaiaIcons) {
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
    var MainView = function MainView() {
      View.apply(this, arguments);
    };

    _extends(MainView, View);

    MainView.prototype.template = function () {
      var string = "\n      <gaia-header data-action=\"back\">\n        <h1 data-action=\"developer\">P2P Sharing</h1>\n      </gaia-header>";

      return string;
    };

    MainView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      this.on("action", "gaia-header");
      this.on("contextmenu", "gaia-header h1");

      setTimeout(function () {
        _this.els = {};
        _this.els.header = _this.$("gaia-header");
        _this.els.headerText = _this.$("gaia-header h1");
      });
    };

    MainView.prototype.setHeader = function (text) {
      if (!this.els || !this.els.headerText) {
        return;
      }

      if (text) {
        this.els.headerText.textContent = text;
      } else {
        this.els.headerText.textContent = "P2P Sharing";
      }
    };

    MainView.prototype.toggleBackButton = function (enable) {
      if (this.els && this.els.header) {
        this.els.header.setAttribute("action", enable ? "back" : "");
      }
    };

    return MainView;
  })(View);

  exports["default"] = MainView;
});