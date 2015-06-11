define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-header/dist/gaia-header", "components/gaia-dialog/gaia-dialog-alert", "components/fxos-dev-mode-dialog/fxos-dev-mode-dialog"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaHeaderDistGaiaHeader, _componentsGaiaDialogGaiaDialogAlert, _componentsFxosDevModeDialogFxosDevModeDialog) {
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

  var View = _componentsFxosMvcDistMvc.View;
  var MainView = (function (View) {
    var MainView = function MainView(opts) {
      this.el = opts.el;
      this.uploadHandler = null;
    };

    _extends(MainView, View);

    MainView.prototype.render = function (isActivity) {
      var _this = this;
      View.prototype.render.call(this, [isActivity]);

      if (isActivity) {
        this.el.querySelector("gaia-header").addEventListener("action", function (event) {
          if (event.detail.type === "back") {
            // Back from activity should close it via ActivityHelper.
            window.dispatchEvent(new CustomEvent("request-activity-finish"));
          }
        });
      } else {
        var uploadBtn = document.getElementById("upload-link");
        if (!uploadBtn) {
          return;
        }
        uploadBtn.addEventListener("click", function () {
          if (_this.uploadHandler) {
            _this.uploadHandler();
          }
        });
      }
    };

    MainView.prototype.onUpload = function (handler) {
      this.uploadHandler = handler;
    };

    MainView.prototype.template = function (isActivity) {
      var action = isActivity ? "action=\"back\"" : "";
      var upload = isActivity ? "" : "<button id=\"upload-link\"></button>";
      var string = "\n      <gaia-header " + action + ">\n        <h1>Hackerplace</h1>" + upload + "\n      </gaia-header>\n      <gaia-dialog-alert id=\"alert-dialog\">Placeholder</gaia-dialog-alert>\n      <fxos-dev-mode-dialog></fxos-dev-mode-dialog>";
      return string;
    };

    return MainView;
  })(View);

  exports["default"] = MainView;
});