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

  /* global View */

  var appendChildViewTemplate = "\n<style scoped>\n.shadow-host {\n  z-index: 10000001;\n}\n</style>\n<gaia-dialog-prompt>Enter new element name, e.g. \"div\"</gaia-dialog-prompt>\n";

  var AppendChildView = (function (View) {
    var AppendChildView = function AppendChildView(options) {
      View.call(this, options);

      this.el.className = "fxos-customizer-append-child-view";

      this.render();
    };

    _extends(AppendChildView, View);

    AppendChildView.prototype.init = function (controller) {
      var _this = this;
      View.prototype.init.call(this, controller);

      this.dialog = this.$("gaia-dialog-prompt");

      // Automatically set focus to the input box when the
      // <gaia-dialog-prompt> is opened.
      this.dialog.addEventListener("opened", function () {
        _this.dialog.els.input.focus();
      });

      // Reset the <gaia-dialog-prompt> value when closed.
      this.dialog.addEventListener("closed", function () {
        _this.dialog.els.input.value = "";
      });

      // Submit the new element tag name when the
      // <gaia-dialog-prompt> is submitted.
      this.dialog.els.submit.addEventListener("click", function () {
        _this.controller.submit(_this.dialog.els.input.value);
      });
    };

    AppendChildView.prototype.template = function () {
      return appendChildViewTemplate;
    };

    AppendChildView.prototype.open = function () {
      this.dialog.open();
    };

    return AppendChildView;
  })(View);

  exports["default"] = AppendChildView;
});