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

  var EditController = (function (Controller) {
    var EditController = function EditController(options) {
      Controller.call(this, options);
    };

    _extends(EditController, Controller);

    EditController.prototype.teardown = function () {
      this.view = null;

      this.target = null;
      this.changes = null;
    };

    EditController.prototype.open = function (target) {
      this.target = target;

      this.changes = {};

      this.view.setTarget(target);
      this.view.open();
    };

    EditController.prototype.close = function () {
      this.view.close();
    };

    EditController.prototype.save = function () {
      var _this = this;
      AddonService.generate(this.target, function (generator) {
        if (_this.changes.innerHTML) {
          generator.opInnerHTML(_this.changes.innerHTML);
        }

        if (_this.changes.script) {
          generator.opScript(_this.changes.script);
        }

        if (_this.changes.createAttributes) {
          generator.opCreateAttributes(_this.changes.createAttributes);
        }

        if (_this.changes.removeAttributes) {
          generator.opRemoveAttributes(_this.changes.removeAttributes);
        }

        if (_this.changes.properties) {
          generator.opSetProperties(_this.changes.properties);
        }

        _this.close();
      });
    };

    return EditController;
  })(Controller);

  exports["default"] = EditController;
});