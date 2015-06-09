define(["exports", "fxos-mvc/dist/mvc", "gaia-list", "gaia-checkbox", "gaia-sub-header", "gaia-loading"], function (exports, _fxosMvcDistMvc, _gaiaList, _gaiaCheckbox, _gaiaSubHeader, _gaiaLoading) {
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

  var View = _fxosMvcDistMvc.View;
  var ListView = (function (View) {
    var ListView = function ListView(options) {
      this.el = document.createElement("div");
      this.el.id = options.id;
      this.el.classList.add("app-list");
      this.el.classList.add(options.type);
      if (options.disabled) {
        this.el.setAttribute("disabled", true);
      }

      this.title = options.title;
      this.type = options.type;
      this.attr = options.attr;
    };

    _extends(ListView, View);

    ListView.prototype.layout = function (template) {
      var string = "\n      <gaia-sub-header>" + this.title + "</gaia-sub-header>\n      <gaia-list>\n        " + template + "\n      </gaia-list>";
      return string;
    };

    ListView.prototype.render = function (params) {
      if (!params.length) {
        this.el.innerHTML = "";
        return;
      }

      View.prototype.render.call(this, params);

      if (this.type === "toggle") {
        this.on("click", ".app-list li");
      } else {
        this.on("click", ".app-list li *");
      }
    };

    ListView.prototype.template = function (app) {
      var desc = (app.peer && app.peer.name) || (app.manifest.developer && app.manifest.developer.name) || app.manifest.description || "No information available";
      var toggle = (this.type === "toggle" && "data-action=\"toggle\"") || "";
      var string = "\n      <li tabindex=\"0\" " + toggle + ">\n        <img data-action=\"description\" data-id=\"" + app.manifestURL + "\"\n         src=\"" + app.icon + "\"></img>\n        <div class=\"description\" data-action=\"description\"\n         data-id=\"" + app.manifestURL + "\">\n          <h3>" + app.manifest.name + "</h3>\n          <h4>" + desc + "</h4>\n        </div>\n        " + this._control(app) + "\n      </li>";
      return string;
    };

    ListView.prototype.toggle = function (enable) {
      if (enable) {
        this.el.setAttribute("disabled", "");
      } else {
        this.el.removeAttribute("disabled");
      }
    };

    ListView.prototype._control = function (app) {
      var string;
      if (this.type === "toggle") {
        var enabled = app.shared && "checked" || "";
        string = "<gaia-checkbox data-action=\"toggle\" data-id=\"" + app.manifestURL + "\"\n          class=\"control\" " + enabled + ">\n         </gaia-checkbox>";
        return string;
      } else if (this.type === "download") {
        if (app.installed) {
          return "<a class=\"control\" disabled>Installed</a>";
        } else {
          string = "<a data-id=\"" + app.manifestURL + "\" data-action=\"download\"\n           class=\"control\">\n            Download\n          </a>";
          return string;
        }
      }
    };

    return ListView;
  })(View);

  exports["default"] = ListView;
});