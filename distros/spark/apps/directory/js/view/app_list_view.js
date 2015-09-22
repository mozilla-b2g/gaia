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
  var AppListView = (function (ListView) {
    var AppListView = function AppListView() {
      ListView.call(this);
      this.el.id = "app-list";
    };

    _extends(AppListView, ListView);

    AppListView.prototype.update = function (list) {
      var appList = {};
      for (var manifestURL in list) {
        if (list[manifestURL].type !== "addon") {
          appList[manifestURL] = list[manifestURL];
        }
      }
      ListView.prototype.update.call(this, appList);
    };

    return AppListView;
  })(ListView);

  exports["default"] = AppListView;
});