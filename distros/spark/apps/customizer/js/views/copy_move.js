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

  var copyMoveViewTemplate = "<gaia-modal>\n  <gaia-header>\n    <button type=\"button\" data-action=\"cancel\">Cancel</button>\n    <h1>Copy/Move</h1>\n    <button type=\"button\" data-action=\"select\">Select</button>\n  </gaia-header>\n  <gaia-tabs selected=\"0\">\n    <a href=\"#\" data-mode=\"Copy\">Copy</a>\n    <a href=\"#\" data-mode=\"Move\">Move</a>\n  </gaia-tabs>\n  <section>\n    <gaia-dom-tree></gaia-dom-tree>\n  </section>\n  <gaia-dialog>\n    <button type=\"button\" data-action=\"before\">Insert Before</button>\n    <button type=\"button\" data-action=\"after\">Insert After</button>\n    <button type=\"button\" data-action=\"prepend\">Prepend</button>\n    <button type=\"button\" data-action=\"append\">Append</button>\n  </gaia-dialog>\n</gaia-modal>";

  var CopyMoveView = (function (View) {
    var CopyMoveView = function CopyMoveView(options) {
      View.call(this, options);

      this.el.className = "fxos-customizer-copy-move-view";

      this.render();
    };

    _extends(CopyMoveView, View);

    CopyMoveView.prototype.init = function (controller) {
      View.prototype.init.call(this, controller);

      this.modal = this.$("gaia-modal");
      this.tabs = this.$("gaia-tabs");
      this.domTree = this.$("gaia-dom-tree");
      this.dialog = this.$("gaia-dialog");

      this.tabs.addEventListener("change", this._handleModeChange.bind(this));

      this.on("click", "button", this._handleClick.bind(this));
      this.on("contextmenu", "gaia-dom-tree", function (evt) {
        evt.stopPropagation();
      });
    };

    CopyMoveView.prototype.template = function () {
      return copyMoveViewTemplate;
    };

    CopyMoveView.prototype._handleModeChange = function (evt) {
      this.controller.setMode(this.tabs.selectedChild.dataset.mode);
    };

    CopyMoveView.prototype._handleClick = function (evt) {
      var action = this.controller[evt.target.dataset.action];
      if (typeof action === "function") {
        action.call(this.controller, evt.target.dataset);
      }
    };

    return CopyMoveView;
  })(View);

  exports["default"] = CopyMoveView;
});