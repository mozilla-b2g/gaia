define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-list/gaia-list", "components/gaia-button/gaia-button", "js/lib/helpers"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaListGaiaList, _componentsGaiaButtonGaiaButton, _jsLibHelpers) {
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

  var View = _componentsFxosMvcDistMvc.View;
  var IconHelper = _jsLibHelpers.IconHelper;


  function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
  }

  var ListView = (function (View) {
    var ListView = function ListView() {
      this.el = document.createElement("gaia-list");
      this.el.className = "app-list";

      this.elements = Object.create(null);
    };

    _extends(ListView, View);

    ListView.prototype.update = function (list) {
      for (var key in list) {
        var data = list[key];
        if (!this.elements[key]) {
          this.elements[key] = this.addElement(data);
        }
      }
    };

    ListView.prototype.setOpenHandler = function (handler) {
      if (!this.openHandler) {
        this.openHandler = handler;
      }
    };

    ListView.prototype.addElement = function (data) {
      var item = document.createElement("li");
      item.classList.add("app");
      item.innerHTML = this.listItemTemplate(data);
      IconHelper.setImage(item.querySelector(".icon"), data.icon);
      this.el.appendChild(item);

      item.querySelector(".open-button").addEventListener("click", function (data) {
        this.openHandler(data);
      }.bind(this, data));

      return item;
    };

    ListView.prototype.listItemTemplate = function (_ref) {
      var name = _ref.name;
      var author = _ref.author;
      var string = "\n      <img class=\"icon\" />\n      <div flex class=\"description\">\n        <p class=\"name\">" + capitalize(name) + "</p>\n        <p class=\"author\">" + author + "</p>\n      </div>\n      <gaia-button class=\"open-button\">Open</gaia-button>";
      return string;
    };

    return ListView;
  })(View);

  exports["default"] = ListView;
});