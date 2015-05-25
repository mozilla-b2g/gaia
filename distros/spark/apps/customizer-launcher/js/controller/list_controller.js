define(["exports", "components/fxos-mvc/dist/mvc", "js/model/list_model", "js/view/list_view", "js/lib/web_server"], function (exports, _componentsFxosMvcDistMvc, _jsModelListModel, _jsViewListView, _jsLibWebServer) {
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

  var Controller = _componentsFxosMvcDistMvc.Controller;
  var ListModel = _jsModelListModel["default"];
  var ListView = _jsViewListView["default"];
  var WebServer = _jsLibWebServer["default"];
  var ListController = (function (Controller) {
    var ListController = function ListController() {
      this.model = new ListModel();
      this.listView = new ListView();
      this.webServer = new WebServer();
    };

    _extends(ListController, Controller);

    ListController.prototype.main = function () {
      this.createList();
    };

    ListController.prototype.createList = function () {
      var _this = this;
      this.listView.render();
      document.body.appendChild(this.listView.el);

      this.model.getAppList().then(function (allApps) {
        _this.listView.update(allApps);
        _this.listView.setOpenHandler(_this.handleOpen.bind(_this));
      });
    };

    ListController.prototype.handleOpen = function (data) {
      var _this2 = this;
      if (data.app) {
        this.webServer.startServer().then(function (result) {
          if (result) {
            _this2.launchApp(data);
            _this2.webServer.setData(data.manifestURL);
          }
        });
      } else {
        throw new Error("Could not open app: " + data);
      }
    };

    ListController.prototype.launchApp = function (data) {
      data.app.launch();
    };

    return ListController;
  })(Controller);

  exports["default"] = ListController;
});