define(["exports", "components/fxos-mvc/dist/mvc", "gaia-component", "js/view/main_view", "js/controller/list_controller"], function (exports, _componentsFxosMvcDistMvc, _gaiaComponent, _jsViewMainView, _jsControllerListController) {
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

  var Controller = _componentsFxosMvcDistMvc.Controller;
  var MainView = _jsViewMainView["default"];
  var ListController = _jsControllerListController["default"];
  var MainController = (function (Controller) {
    var MainController = function MainController() {
      this.view = new MainView({ el: document.body });
      this.listController = new ListController();
      Controller.call(this);
    };

    _extends(MainController, Controller);

    MainController.prototype.main = function () {
      this.view.render();
      this.dialog = document.querySelector("fxos-dev-mode-dialog");

      // fxos-dev-mode-dialog checks and emit event 'enabled' when
      // device dev mode perf is set to true. Continue to load
      // list of apps inside dialog enabled event handler.
      this.dialog.addEventListener("enabled", function () {
        this.listController.main();
      }.bind(this));
    };

    return MainController;
  })(Controller);

  exports["default"] = MainController;
});