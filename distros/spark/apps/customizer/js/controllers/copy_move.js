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

  var CopyMoveController = (function (Controller) {
    var CopyMoveController = function CopyMoveController(options) {
      Controller.call(this, options);
    };

    _extends(CopyMoveController, Controller);

    CopyMoveController.prototype.teardown = function () {
      this.view = null;

      this.target = null;
    };

    CopyMoveController.prototype.open = function (target) {
      this.target = target;

      this.view.domTree.filter = "#" + window.__customizer__.mainController.view.el.id;
      this.view.domTree.setRoot(document.documentElement);
      this.view.domTree.render();

      this.view.modal.open();
    };

    CopyMoveController.prototype.cancel = function () {
      this.view.modal.close();
    };

    CopyMoveController.prototype.select = function () {
      this.destination = this.view.domTree.selectedNode;
      this.view.dialog.open();
    };

    CopyMoveController.prototype.setMode = function (mode) {
      this.mode = mode;
    };

    CopyMoveController.prototype.before = function () {
      var _this = this;
      AddonService.generate(this.target, function (generator) {
        var op = generator["op" + _this.mode + "Before"];
        op.call(generator, _this.destination);

        _this.view.dialog.close();
        _this.view.modal.close();
      });
    };

    CopyMoveController.prototype.after = function () {
      var _this2 = this;
      AddonService.generate(this.target, function (generator) {
        var op = generator["op" + _this2.mode + "After"];
        op.call(generator, _this2.destination);

        _this2.view.dialog.close();
        _this2.view.modal.close();
      });
    };

    CopyMoveController.prototype.prepend = function () {
      var _this3 = this;
      AddonService.generate(this.target, function (generator) {
        var op = generator["op" + _this3.mode + "Prepend"];
        op.call(generator, _this3.destination);

        _this3.view.dialog.close();
        _this3.view.modal.close();
      });
    };

    CopyMoveController.prototype.append = function () {
      var _this4 = this;
      AddonService.generate(this.target, function (generator) {
        var op = generator["op" + _this4.mode + "Append"];
        op.call(generator, _this4.destination);

        _this4.view.dialog.close();
        _this4.view.modal.close();
      });
    };

    return CopyMoveController;
  })(Controller);

  exports["default"] = CopyMoveController;
});