define(["exports", "fxos-mvc/dist/mvc", "gaia-dialog/gaia-dialog"], function (exports, _fxosMvcDistMvc, _gaiaDialogGaiaDialog) {
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
  var ConfirmDownloadView = (function (View) {
    var ConfirmDownloadView = function ConfirmDownloadView() {
      View.apply(this, arguments);
    };

    _extends(ConfirmDownloadView, View);

    ConfirmDownloadView.prototype.template = function () {
      var string = "\n      <section>\n        <img></img>\n        <div>\n          <h3><strong></strong></h3>\n          <h4></h4>\n        </div>\n        <hr/>\n        <p>Do you want to download and install this application?</p>\n      </section>\n      <fieldset>\n        <button data-action=\"cancel\">Cancel</button>\n        <button class=\"primary\" data-action=\"install\">Install</button>\n      </fieldset>\n    ";
      return string;
    };

    ConfirmDownloadView.prototype.render = function () {
      var _this = this;
      this.el = document.createElement("gaia-dialog");
      this.el.classList.add("install");
      this.el.addEventListener("opened", function () {
        return _this._opened();
      });
      this.el.addEventListener("closed", function () {
        return _this._closed();
      });

      View.prototype.render.call(this);

      setTimeout(function () {
        _this._icon = _this.$("img");
        _this._header = _this.$("h3 strong");
        _this._subheader = _this.$("h4");
      });
    };

    ConfirmDownloadView.prototype.open = function (app) {
      this._icon.src = app.icon;
      this._header.textContent = app.manifest.name;
      this._subheader.textContent = (app.manifest.developer && app.manifest.developer.name) || app.manifest.description;
      this.el.open();
    };

    ConfirmDownloadView.prototype.close = function () {
      this.el.close();
    };

    ConfirmDownloadView.prototype._opened = function () {
      this.on("click", "button");
    };

    ConfirmDownloadView.prototype._closed = function () {
      this.off("click", "button");
    };

    return ConfirmDownloadView;
  })(View);

  exports["default"] = ConfirmDownloadView;
});