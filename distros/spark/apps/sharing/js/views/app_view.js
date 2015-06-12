define(["exports", "fxos-mvc/dist/mvc", "gaia-button"], function (exports, _fxosMvcDistMvc, _gaiaButton) {
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
  var AppView = (function (View) {
    var AppView = function AppView(options) {
      View.call(this, options);

      this.el = document.createElement("div");
      this.el.id = "app-view";

      this.render();
    };

    _extends(AppView, View);

    AppView.prototype.template = function () {
      var string = "\n      <gaia-header action=\"close\" data-action=\"close\">\n        <h1></h1>\n      </gaia-header>\n      <gaia-list class=\"app-list\">\n        <li>\n          <img></img>\n          <div flex class=\"description\">\n            <h3></h3>\n            <h4></h4>\n          </div>\n          <gaia-button class=\"control\">\n            <span></span>\n          </gaia-button>\n        </li>\n      </gaia-list>\n      <p></p>\n    ";
      return string;
    };

    AppView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      setTimeout(function () {
        _this.on("action", "gaia-header");
        _this.on("click", "gaia-button");

        _this.els = {};
        _this.els.title = _this.$("h1");
        _this.els.icon = _this.$("img");
        _this.els.name = _this.$("h3");
        _this.els.owner = _this.$("h4");
        _this.els.description = _this.$("p");
        _this.els.button = _this.$("gaia-button");
        _this.els.buttonText = _this.els.button.querySelector("span");
      });
    };

    AppView.prototype.show = function (app) {
      this.el.classList.add("active");
      this.els.icon.src = app.icon || "icons/default.png";
      this.els.title.textContent = app.manifest.name;
      this.els.name.textContent = app.manifest.name;
      this.els.owner.textContent = app.manifest.developer && app.manifest.developer.name;
      this.els.description.textContent = app.manifest.description;
      this.els.button.dataset.id = app.manifestURL;
      this.els.button.dataset.action = app.installed ? "open" : "download";
      this.els.buttonText.textContent = app.installed ? "Open" : "Install";
    };

    AppView.prototype.hide = function () {
      this.el.classList.remove("active");
    };

    return AppView;
  })(View);

  exports["default"] = AppView;
});