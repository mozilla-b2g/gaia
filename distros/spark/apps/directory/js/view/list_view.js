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
      this.el.className = "install-list";

      this.elements = Object.create(null);
      this.installHandlers = [];
      this.detailsHandlers = [];
    };

    _extends(ListView, View);

    ListView.prototype.update = function (list) {
      for (var manifestURL in list) {
        var data = list[manifestURL];
        if (!this.elements[manifestURL]) {
          this.elements[manifestURL] = this.addElement(data);
        }
        this.updateElement(this.elements[manifestURL], data);
      }
    };

    ListView.prototype.onInstall = function (handler) {
      if (this.installHandlers.indexOf(handler) === -1) {
        this.installHandlers.push(handler);
      }
    };

    ListView.prototype.offInstall = function (handler) {
      var index = this.installHandlers.indexOf(handler);
      if (index !== -1) {
        this.installHandlers.splice(index, 1);
      }
    };

    ListView.prototype.onDetails = function (handler) {
      if (this.detailsHandlers.indexOf(handler) === -1) {
        this.detailsHandlers.push(handler);
      }
    };

    ListView.prototype.offDetails = function (handler) {
      var index = this.detailsHandlers.indexOf(handler);
      if (index !== -1) {
        this.detailsHandlers.splice(index, 1);
      }
    };

    ListView.prototype.addElement = function (data) {
      var item = document.createElement("li");
      item.classList.add("item", data.type);
      item.innerHTML = this.listItemTemplate(data);
      IconHelper.setImage(item.querySelector(".icon"), data.icon);
      this.el.appendChild(item);

      item.addEventListener("click", function (data, evt) {
        if (evt.target.classList.contains("install-button")) {
          return;
        }
        this.detailsHandlers.forEach(function (handler) {
          handler(data);
        });
      }.bind(this, data));

      item.querySelector(".install-button").addEventListener("click", function (data) {
        this.installHandlers.forEach(function (handler) {
          handler(data);
        });
      }.bind(this, data));

      return item;
    };

    ListView.prototype.updateElement = function (element, data) {
      element.classList.toggle("installed", data.installed);
      var button = element.querySelector(".install-button");
      button.textContent = data.installed ? "Open" : "Install";
      var icon = element.querySelector(".icon");
      if (data.icon && icon.src !== data.icon) {
        IconHelper.setImage(icon, data.icon);
      }
    };

    ListView.prototype.activate = function () {
      this.el.classList.add("active");
    };

    ListView.prototype.deactivate = function () {
      this.el.classList.remove("active");
    };

    ListView.prototype.listItemTemplate = function (_ref) {
      var name = _ref.name;
      var author = _ref.author;
      var string = "\n      <img class=\"icon\" />\n      <div flex class=\"description\">\n        <p class=\"name\">" + capitalize(name) + "</p>\n        <p class=\"author\">" + author + "</p>\n      </div>\n      <span class=\"install-info\">Installed</span>\n      <gaia-button class=\"install-button\">Loading...</gaia-button>";
      return string;
    };

    return ListView;
  })(View);

  exports["default"] = ListView;
});