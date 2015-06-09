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
  var ProximityEmptyView = (function (View) {
    var ProximityEmptyView = function ProximityEmptyView(options) {
      this.el = document.createElement("gaia-list");
      this.el.id = "proximity-empty-list";

      View.call(this, options);

      this.els = {};
    };

    _extends(ProximityEmptyView, View);

    ProximityEmptyView.prototype.template = function () {
      var string = "<li class=\"hide\"></li>\n      <li id=\"no-network\" class=\"hide\">\n        You are not currently connected to a WiFi network. Connect to one to\n        discover people nearby to share with.\n      </li>\n      <li id=\"proximity-empty\" class=\"hide\">\n        <div>\n          There is nobody nearby on your WiFi network who is sharing anything.\n          <gaia-loading></gaia-loading>\n        </div>\n      </li>";
      return string;
    };

    ProximityEmptyView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      setTimeout(function () {
        _this.els.noNetwork = _this.$("#no-network");
        _this.els.proximityEmpty = _this.$("#proximity-empty");
      });
    };

    ProximityEmptyView.prototype.show = function (params) {
      var _this2 = this;
      setTimeout(function () {
        _this2.el.classList.toggle("hide", !params.noNetwork && !params.proximityEmpty);
        _this2.els.noNetwork.classList.toggle("hide", !params.noNetwork);
        _this2.els.proximityEmpty.classList.toggle("hide", params.noNetwork || !params.proximityEmpty);
      });
    };

    return ProximityEmptyView;
  })(View);

  exports["default"] = ProximityEmptyView;
});