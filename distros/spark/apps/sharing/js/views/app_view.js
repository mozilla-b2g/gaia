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
    var AppView = function AppView() {
      this.el = document.createElement("div");
      this.el.id = "app-view";

      this.render();
    };

    _extends(AppView, View);

    AppView.prototype.template = function () {
      var string = "\n      <gaia-list class=\"app-list\">\n        <li>\n          <img></img>\n          <div class=\"description\">\n            <h3></h3>\n            <h4></h4>\n          </div>\n          <gaia-button class=\"control primary\" data-action=\"download\">\n            <span></span>\n          </gaia-button>\n        </li>\n      </gaia-list>\n      <p></p>\n    ";
      return string;
    };

    AppView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      setTimeout(function () {
        _this.on("click", "gaia-button");

        _this.els = {};
        _this.els.icon = _this.$("img");
        _this.els.name = _this.$("h3");
        _this.els.owner = _this.$("h4");
        _this.els.description = _this.$("p");
        _this.els.button = _this.$("gaia-button[data-action=\"download\"]");
        _this.els.buttonText = _this.els.button.querySelector("span");
      });
    };

    AppView.prototype.show = function (app) {
      if (!app) {
        // If we reload the app while the hash is pointed to this view, we won't
        // have any apps to display, so let's just go back to the main view.
        window.location.hash = "";
        return;
      }

      this.els.icon.src = app.icon || "icons/default.png";
      this.els.name.textContent = app.manifest.name;
      this.els.owner.textContent = app.manifest.developer && app.manifest.developer.name;
      this.els.description.textContent = app.manifest.description;
      this.els.button.dataset.id = app.manifestURL;
      this.els.button.disabled = app.installed;
      this.els.buttonText.textContent = app.installed ? "Installed" : "Download";
    };

    return AppView;
  })(View);

  exports["default"] = AppView;
});