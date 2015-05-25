define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-header/dist/gaia-header", "components/gaia-dialog/gaia-dialog-alert"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaHeaderDistGaiaHeader, _componentsGaiaDialogGaiaDialogAlert) {
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
    var MainView = function MainView() {
      View.apply(this, arguments);
    };

    _extends(MainView, View);

    MainView.prototype.render = function (isActivity) {
      View.prototype.render.call(this, [isActivity]);

      if (isActivity) {
        this.el.querySelector("gaia-header").addEventListener("action", function (event) {
          if (event.detail.type === "back") {
            // Back from activity should close it via ActivityHelper.
            window.dispatchEvent(new CustomEvent("request-activity-finish"));
          }
        });
      }
    };

    MainView.prototype.template = function (isActivity) {
      var action = isActivity ? "action=\"back\"" : "";
      var string = "\n      <gaia-header " + action + ">\n        <h1>Hackerplace</h1>\n        <a id=\"upload-link\" target=\"_blank\"\n           href=\"https://github.com/fxos/directory#submission-process\"></a>\n      </gaia-header>\n      <gaia-dialog-alert id=\"alert-dialog\">Placeholder</gaia-dialog-alert>";
      return string;
    };

    return MainView;
  })(View);

  exports["default"] = MainView;
});