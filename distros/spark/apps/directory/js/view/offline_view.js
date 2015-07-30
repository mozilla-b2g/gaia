define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-list/gaia-list"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaListGaiaList) {
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
  var OfflineView = (function (View) {
    var OfflineView = function OfflineView() {
      View.call(this);

      this.el = document.createElement("gaia-list");
      this.el.id = "offline-container";
    };

    _extends(OfflineView, View);

    OfflineView.prototype.update = function (online) {
      // XXX: A bit gross. We should probably set this on the el only, but we had
      // issues with sibling selectors.
      document.body.classList.toggle("online", online);
    };

    OfflineView.prototype.template = function () {
      var string = "<li flex>\n         <i data-icon=\"exclamation\"></i>\n         <p>You have no internet connection. Enable data or WiFi to refresh the\n         app list.</p>\n       </li>";
      return string;
    };

    return OfflineView;
  })(View);

  exports["default"] = OfflineView;
});