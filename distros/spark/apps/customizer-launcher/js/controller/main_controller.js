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
      this.listController.main();
    };

    return MainController;
  })(Controller);

  exports["default"] = MainController;
});