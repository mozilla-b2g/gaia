define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-header/dist/gaia-header", "components/fxos-dev-mode-dialog/fxos-dev-mode-dialog"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaHeaderDistGaiaHeader, _componentsFxosDevModeDialogFxosDevModeDialog) {
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

    MainView.prototype.render = function () {
      View.prototype.render.call(this);
    };

    MainView.prototype.template = function () {
      var string = "\n      <gaia-header>\n        <h1>Customizer Launcher</h1>\n      </gaia-header>\n      <fxos-dev-mode-dialog></fxos-dev-mode-dialog>";
      return string;
    };

    return MainView;
  })(View);

  exports["default"] = MainView;
});