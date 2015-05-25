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

  var actionMenuViewTemplate = "<gaia-dialog>\n  <button type=\"button\" data-action=\"viewSource\">View Source</button>\n  <button type=\"button\" data-action=\"edit\">Edit</button>\n  <button type=\"button\" data-action=\"remove\">Remove</button>\n  <button type=\"button\" data-action=\"copyOrMove\">Copy/Move</button>\n  <button type=\"button\" data-action=\"append\">Append Child</button>\n  <button type=\"button\" data-action=\"cancel\">Cancel</button>\n</gaia-dialog>";

  var ActionMenuView = (function (View) {
    var ActionMenuView = function ActionMenuView(options) {
      View.call(this, options);

      this.el.className = "fxos-customizer-action-view";

      this.render();
    };

    _extends(ActionMenuView, View);

    ActionMenuView.prototype.init = function (controller) {
      var _this = this;
      View.prototype.init.call(this, controller);

      this.dialog = this.$("gaia-dialog");
      this.viewSourceButton = this.$("button[data-action=\"viewSource\"]");

      this.on("click", "button", function (evt) {
        var action = _this.controller[evt.target.dataset.action];
        if (typeof action === "function") {
          action.call(_this.controller);
        }

        _this.dialog.close();
      });
    };

    ActionMenuView.prototype.template = function () {
      return actionMenuViewTemplate;
    };

    ActionMenuView.prototype.enableViewSource = function (enabled) {
      // It seems like I ought to be able to just set disabled or hidden
      // on the element and that should work.  But it doesn't so I'm
      // manually setting the display style.
      this.viewSourceButton.style.display = enabled ? "block" : "none";
    };

    return ActionMenuView;
  })(View);

  exports["default"] = ActionMenuView;
});