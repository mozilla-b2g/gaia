define(["exports", "fxos-mvc/dist/mvc"], function (exports, _fxosMvcDistMvc) {
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
  var CompositeTemplate = (function (View) {
    var CompositeTemplate = function CompositeTemplate(options) {
      var _this = this;
      View.call(this, options);

      this.el = document.createElement("div");
      this.el.id = options.id;
      if (options.active) {
        this.el.classList.add("active");
      }

      if (options.header) {
        var header = document.createElement("gaia-header");
        header.innerHTML = "<h1>" + options.header.title + "</h1>";
        if (options.header.action) {
          header.setAttribute("action", options.header.action);
          header.dataset.action = options.header.action;
          this.on("action", "gaia-header");
        }
        this.el.appendChild(header);
      }

      options.views.forEach(function (view) {
        _this.el.appendChild(view.el);
      });

      document.body.appendChild(this.el);
    };

    _extends(CompositeTemplate, View);

    CompositeTemplate.prototype.render = function () {};

    return CompositeTemplate;
  })(View);

  exports["default"] = CompositeTemplate;
});