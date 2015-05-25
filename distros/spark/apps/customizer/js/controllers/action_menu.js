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

  var ActionMenuController = (function (Controller) {
    var ActionMenuController = function ActionMenuController(options) {
      Controller.call(this, options);
    };

    _extends(ActionMenuController, Controller);

    ActionMenuController.prototype.open = function (target) {
      this.target = target;
      // Only enable the View Source button if the element is
      // a <script> tag with a src attribute or a <link> tag with a href
      // attribute.
      // TODO: If the target is an image (or video or audio?) element, enable
      // a View Image button in the menu.
      this.view.enableViewSource((target.tagName === "SCRIPT" && target.hasAttribute("src")) || (target.tagName === "LINK" && target.hasAttribute("href")));
      this.view.dialog.open();
    };

    ActionMenuController.prototype.close = function () {
      this.view.dialog.close();
    };

    ActionMenuController.prototype.edit = function () {
      this.editController.open(this.target);
    };

    ActionMenuController.prototype.remove = function () {
      AddonService.generate(this.target, function (generator) {
        generator.opRemove();
      });
    };

    ActionMenuController.prototype.viewSource = function () {
      this.viewSourceController.open(this.target);
    };

    ActionMenuController.prototype.copyOrMove = function () {
      this.copyMoveController.open(this.target);
    };

    ActionMenuController.prototype.append = function () {
      this.appendChildController.open(this.target);
    };

    ActionMenuController.prototype.cancel = function () {};

    return ActionMenuController;
  })(Controller);

  exports["default"] = ActionMenuController;
});