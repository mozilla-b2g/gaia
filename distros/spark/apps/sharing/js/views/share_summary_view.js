define(["exports", "fxos-mvc/dist/mvc", "gaia-list/gaia-list"], function (exports, _fxosMvcDistMvc, _gaiaListGaiaList) {
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
  var ShareSummaryView = (function (View) {
    var ShareSummaryView = function ShareSummaryView() {
      this.el = document.createElement("gaia-list");
      this.el.id = "sharing-summary";
      this.el.addEventListener("click", this._handleClick.bind(this));

      this.render();
    };

    _extends(ShareSummaryView, View);

    ShareSummaryView.prototype.template = function () {
      var string = "\n      <li>\n        <div>\n          <h3>Share My Apps</h3>\n          <h4 id=\"sharing-summary-status\">Sharing Off</h4>\n        </div>\n        <i id=\"sharing-summary-caret\" data-icon=\"forward-light\"></i>\n      </li>";
      return string;
    };

    ShareSummaryView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);

      setTimeout(function () {
        _this.broadcastElt = _this.$("#sharing-summary-status");
      });
    };

    ShareSummaryView.prototype.displayBroadcast = function (enable) {
      if (this.broadcastElt) {
        this.broadcastElt.textContent = "Sharing " + (enable ? "On" : "Off");
      }
    };

    ShareSummaryView.prototype._handleClick = function (e) {
      this.controller.openSharePanel();
    };

    return ShareSummaryView;
  })(View);

  exports["default"] = ShareSummaryView;
});