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

  /* global esprima */
  /* global html_beautify */

  var editViewTemplate = "<gaia-modal>\n  <style scoped>\n    .gaia-modal {\n      background: var(--background, #fff);\n      display: none;\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n    }\n    .gaia-modal.active {\n      display: block;\n    }\n    .tab-pane {\n      box-sizing: padding-box;\n      display: none;\n      position: absolute;\n      top: 96px;\n      bottom: 0;\n      left: 0;\n      width: 100%;\n      height: auto;\n    }\n    .tab-pane.active {\n      display: block;\n    }\n    textarea,\n    input {\n      -moz-user-select: text !important;\n    }\n    textarea,\n    gaia-tabs,\n    .tab-pane {\n      background: #000;\n      color: #fff;\n    }\n    fxos-code-editor {\n      display: block;\n      width: 100%;\n      height: 100%;\n    }\n    .errors {\n      background: #e51e1e;\n      color: #fff;\n      position: absolute;\n      bottom: 0;\n      left: 0;\n      width: 100%;\n      height: 20px;\n      overflow: hidden;\n      z-index: 2;\n      opacity: 0;\n      transition: opacity 0.2s ease;\n      pointer-events: none;\n    }\n    .errors.active {\n      opacity: 1;\n    }\n    .errors.active + fxos-code-editor {\n      height: calc(100% - 20px);\n    }\n  </style>\n  <gaia-header>\n    <button data-action=\"cancel\" data-icon=\"close\"></button>\n    <h1>Edit</h1>\n    <button data-action=\"save\">Save</button>\n  </gaia-header>\n  <gaia-tabs selected=\"0\">\n    <a href=\"#\">HTML</a>\n    <a href=\"#\">Script</a>\n    <a href=\"#\">Properties</a>\n  </gaia-tabs>\n  <section class=\"tab-pane active\" data-id=\"html\">\n    <fxos-code-editor></fxos-code-editor>\n  </section>\n  <section class=\"tab-pane\" data-id=\"script\">\n    <div class=\"errors\"></div>\n    <fxos-code-editor></fxos-code-editor>\n  </section>\n  <section class=\"tab-pane\" data-id=\"properties\">\n    <fxos-inspector></fxos-inspector>\n  </section>\n</gaia-modal>";

  var EditView = (function (View) {
    var EditView = function EditView(options) {
      View.call(this, options);

      this.el.className = "fxos-customizer-edit-view";

      this.render();
    };

    _extends(EditView, View);

    EditView.prototype.init = function (controller) {
      var _this = this;
      View.prototype.init.call(this, controller);

      this.modal = this.$("gaia-modal");
      this.header = this.$("gaia-header");
      this.tabs = this.$("gaia-tabs");

      this.htmlCodeEditor = this.$("section[data-id=\"html\"] > fxos-code-editor");
      this.scriptCodeEditor = this.$("section[data-id=\"script\"] > fxos-code-editor");
      this.propertyInspector = this.$("section[data-id=\"properties\"] > fxos-inspector");

      this.scriptErrors = this.$("section[data-id=\"script\"] > .errors");

      this.tabPanes = [].slice.apply(this.$$(".tab-pane"));

      this.on("click", "button[data-action=\"cancel\"]", function () {
        _this.controller.close();
      });

      this.on("click", "button[data-action=\"save\"]", function () {
        _this.controller.save();
      });

      this.tabs.addEventListener("change", function () {
        _this.tabPanes.forEach(function (tabPane, index) {
          if (index === _this.tabs.selected) {
            tabPane.classList.add("active");
          } else {
            tabPane.classList.remove("active");
          }
        });
      });

      this.htmlCodeEditor.addEventListener("change", function () {
        _this.controller.changes.innerHTML = _this.htmlCodeEditor.value;
      });

      this.scriptCodeEditor.addEventListener("change", function () {
        _this.controller.changes.script = _this.scriptCodeEditor.value;

        clearTimeout(_this.validateScriptTimeout);
        _this.validateScriptTimeout = setTimeout(_this.validateScript.bind(_this), 2000);
      });

      this.scriptCodeEditor.addEventListener("touchstart", function () {
        clearTimeout(_this.validateScriptTimeout);
      });

      this.scriptCodeEditor.addEventListener("touchend", function () {
        clearTimeout(_this.validateScriptTimeout);
        _this.validateScriptTimeout = setTimeout(_this.validateScript.bind(_this), 2000);
      });

      this.propertyInspector.addEventListener("createattribute", function (evt) {
        var detail = JSON.parse(evt.detail);

        _this.controller.changes.createAttributes = _this.controller.changes.createAttributes || {};
        _this.controller.changes.createAttributes[detail.expression] = detail.name;
      });

      this.propertyInspector.addEventListener("removeattribute", function (evt) {
        var detail = JSON.parse(evt.detail);

        _this.controller.changes.removeAttributes = _this.controller.changes.removeAttributes || {};
        _this.controller.changes.removeAttributes[detail.expression] = detail.name;
      });

      this.propertyInspector.addEventListener("save", function (evt) {
        var detail = JSON.parse(evt.detail);

        _this.controller.changes.properties = _this.controller.changes.properties || {};
        _this.controller.changes.properties[detail.expression] = detail.value;
      });

      this.el.addEventListener("contextmenu", function (evt) {
        evt.stopPropagation();
      });
    };

    EditView.prototype.template = function () {
      return editViewTemplate;
    };

    EditView.prototype.open = function () {
      this.modal.open();
    };

    EditView.prototype.close = function () {
      this.modal.close();
    };

    EditView.prototype.setTarget = function (target) {
      var _this2 = this;
      var clonedTarget = target.cloneNode(true);
      var html = clonedTarget.innerHTML.trim();

      this.htmlCodeEditor.value = "Loading...";

      setTimeout(function () {
        html = html_beautify(html, {
          indent_size: 2
        });

        _this2.htmlCodeEditor.value = html;
      }, 1);

      this.scriptCodeEditor.value = "/**\n * You can edit a script to be inserted\n * in the generated add-on here.\n *\n * Globals:\n *   selector [String]\n *   el       [HTMLElement]\n *   mo       [MutationObserver]\n */\n\n//el.addEventListener('click', function(evt) {\n//  alert('Clicked!');\n//});\n";

      this.propertyInspector.setRootTarget(clonedTarget);
    };

    EditView.prototype.validateScript = function () {
      var error;

      try {
        var syntax = esprima.parse(this.controller.changes.script);
        if (syntax.errors && syntax.errors.length > 0) {
          error = syntax.errors[0];
        }
      } catch (e) {
        error = e;
      }

      if (error) {
        this.scriptErrors.textContent = error.message;
        this.scriptErrors.classList.add("active");
      } else {
        this.scriptErrors.textContent = "";
        this.scriptErrors.classList.remove("active");
      }
    };

    return EditView;
  })(View);

  exports["default"] = EditView;
});