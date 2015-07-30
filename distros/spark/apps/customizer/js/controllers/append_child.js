define(["exports"], function (exports) {
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

  var AppendChildController = (function (Controller) {
    var AppendChildController = function AppendChildController(options) {
      Controller.call(this, options);
    };

    _extends(AppendChildController, Controller);

    AppendChildController.prototype.teardown = function () {
      this.view = null;

      this.target = null;
    };

    AppendChildController.prototype.open = function (target) {
      this.target = target;

      this.view.open();
    };

    AppendChildController.prototype.submit = function (tagName) {
      var child = document.createElement(tagName);
      if (!child) {
        window.alert("Error creating " + tagName);
        return;
      }

      AddonService.generate(this.target, function (generator) {
        generator.opAppendChild(tagName);
      });
    };

    return AppendChildController;
  })(Controller);

  exports["default"] = AppendChildController;
});