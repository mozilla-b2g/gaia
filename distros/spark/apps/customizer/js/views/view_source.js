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

  var viewSourceViewTemplate = "\n<style scoped>\ngaia-modal {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n}\ngaia-header {\n  height: 40px;\n  border-bottom: solid white 1px;\n}\npre {\n  background: #000;\n  color: #fff;\n  font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n  font-size: 14px;\n  line-height: 1.2em;\n  position: absolute;\n  top: 50px;\n  left: 0;\n  width: 100%;\n  height: calc(100% - 50px);\n  overflow: scroll;\n  padding: 5px;\n}\n</style>\n<gaia-modal>\n  <gaia-header>\n    <button data-action=\"close\">Close</button>\n    <h1>Source View</h1>\n  </gaia-header>\n  <pre>\n  </pre>\n</gaia-modal>";

  var ViewSourceView = (function (View) {
    var ViewSourceView = function ViewSourceView(options) {
      View.call(this, options);
      this.el.className = "fxos-customizer-view-source-view";
      this.render();
    };

    _extends(ViewSourceView, View);

    ViewSourceView.prototype.init = function (controller) {
      var _this = this;
      View.prototype.init.call(this, controller);

      this.modal = this.$("gaia-modal");
      this.title = this.$("h1");
      this.pre = this.$("pre");

      this.on("click", "button", function (evt) {
        var action = _this.controller[evt.target.dataset.action];
        if (typeof action === "function") {
          action.call(_this.controller, evt.target.dataset);
        }
      });
    };

    ViewSourceView.prototype.template = function () {
      return viewSourceViewTemplate;
    };

    ViewSourceView.prototype.setTitle = function (title) {
      this.title.textContent = title;
    };

    ViewSourceView.prototype.setSource = function (source) {
      this.pre.textContent = source;
    };

    ViewSourceView.prototype.open = function () {
      this.modal.open();
    };

    ViewSourceView.prototype.close = function () {
      this.modal.close();
    };

    return ViewSourceView;
  })(View);

  exports["default"] = ViewSourceView;
});