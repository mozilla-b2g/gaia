define(["exports", "js/view/list_view"], function (exports, _jsViewListView) {
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

  var ListView = _jsViewListView["default"];
  var AddonListView = (function (ListView) {
    var AddonListView = function AddonListView() {
      ListView.call(this);
      this.el.id = "addon-list";
    };

    _extends(AddonListView, ListView);

    AddonListView.prototype.update = function (list) {
      var addonList = {};
      for (var manifestURL in list) {
        if (list[manifestURL].type === "addon") {
          addonList[manifestURL] = list[manifestURL];
        }
      }
      ListView.prototype.update.call(this, addonList);
    };

    return AddonListView;
  })(ListView);

  exports["default"] = AddonListView;
});