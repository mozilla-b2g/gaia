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

  var appendChildViewTemplate = "\n<style scoped>\n.shadow-host {\n  z-index: 10000001;\n}\n</style>\n<gaia-dialog-prompt></gaia-dialog-prompt>\n";

  var AppendChildView = (function (View) {
    var AppendChildView = function AppendChildView(options) {
      View.call(this, options);

      this.el.className = "fxos-customizer-append-child-view";

      this.render();
    };

    _extends(AppendChildView, View);

    AppendChildView.prototype.init = function (controller) {
      View.prototype.init.call(this, controller);

      this.dialog = this.$("gaia-dialog-prompt");
      this.dialog.els.input.placeholder = "New element tagName, e.g. \"div\"";
      this.dialog.els.submit.addEventListener("click", this._submit.bind(this));
    };

    AppendChildView.prototype.template = function () {
      return appendChildViewTemplate;
    };

    AppendChildView.prototype.open = function () {
      this.dialog.open();
    };

    AppendChildView.prototype._submit = function (e) {
      this.controller.submit(this.dialog.els.input.value); // tagName
    };

    return AppendChildView;
  })(View);

  exports["default"] = AppendChildView;
});