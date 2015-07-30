define(["exports", "components/fxos-mvc/dist/mvc", "js/model/list_model", "js/view/tabs_view", "js/view/offline_view", "js/view/app_list_view", "js/view/addon_list_view", "js/view/details_view"], function (exports, _componentsFxosMvcDistMvc, _jsModelListModel, _jsViewTabsView, _jsViewOfflineView, _jsViewAppListView, _jsViewAddonListView, _jsViewDetailsView) {
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
  var TabsView = _jsViewTabsView["default"];
  var OfflineView = _jsViewOfflineView["default"];
  var AppListView = _jsViewAppListView["default"];
  var AddonListView = _jsViewAddonListView["default"];
  var DetailsView = _jsViewDetailsView["default"];
  var ListController = (function (Controller) {
    var ListController = function ListController() {
      this.installedApps = Object.create(null);

      this.model = new ListModel();
      this.tabsView = new TabsView();
      this.offlineView = new OfflineView();
      this.appView = new AppListView();
      this.addonView = new AddonListView();
      this.detailsView = new DetailsView();

      this.tabsView.onTabChange(this.handleTabChange.bind(this));
      document.addEventListener("visibilitychange", this.refreshInstalledList.bind(this));
    };

    _extends(ListController, Controller);

    ListController.prototype.main = function () {
      var hash = window.location.hash;
      var tab = hash && hash.slice(1);

      if (!this.initialized) {
        this.createList(tab);
      }
      this.activateTab(tab);
    };

    ListController.prototype.showAlertDialog = function (msg) {
      this.alertDialog.textContent = msg;
      this.alertDialog.open();
    };

    ListController.prototype.createList = function (tab) {
      this.offlineView.render();
      document.body.appendChild(this.offlineView.el);
      this.tabsView.render(tab);
      document.body.appendChild(this.tabsView.el);
      this.appView.render();
      document.body.appendChild(this.appView.el);
      this.addonView.render();
      document.body.appendChild(this.addonView.el);
      this.detailsView.render();
      document.body.appendChild(this.detailsView.el);
      this.alertDialog = document.body.querySelector("#alert-dialog");

      this.appView.onInstall(this.handleInstall.bind(this));
      this.addonView.onInstall(this.handleInstall.bind(this));
      this.appView.onDetails(this.handleDetails.bind(this));
      this.addonView.onDetails(this.handleDetails.bind(this));
      this.detailsView.onClose(this.handleCloseDetails.bind(this));
      this.detailsView.onInstall(this.handleInstall.bind(this));

      this.getApps();
      this.watchConnection();

      this.initialized = true;
    };

    ListController.prototype.getApps = function () {
      var _this = this;
      this.model.getAppList().then(function (list) {
        _this.list = list;
        _this.refreshInstalledList();
      });
    };

    ListController.prototype.watchConnection = function () {
      window.addEventListener("online", this.handleConnection.bind(this));
      window.addEventListener("offline", this.handleConnection.bind(this));
      this.handleConnection();
    };

    ListController.prototype.handleConnection = function () {
      var online = navigator.onLine;
      this.offlineView.update(online);
      if (online) {
        this.getApps();
      }
    };

    ListController.prototype.refreshInstalledList = function () {
      var _this2 = this;
      this.installedApps = Object.create(null);

      // Use mgmt.getAll if available to fetch apps,
      // otherwise use mozApp.getInstalled.
      var req;
      if (navigator.mozApps.mgmt && navigator.mozApps.mgmt.getAll) {
        req = navigator.mozApps.mgmt.getAll();
      } else {
        req = navigator.mozApps.getInstalled();
      }

      req.onsuccess = function () {
        var apps = req.result;
        var installedApps = Object.create(null);
        apps.forEach(function (app) {
          installedApps[app.manifestURL] = app;
        });
        for (var manifestURL in _this2.list) {
          _this2.list[manifestURL].installed = !!installedApps[manifestURL];
          _this2.list[manifestURL].mozApp = installedApps[manifestURL] || false;
          if (_this2.detailsView.isShowing(manifestURL)) {
            // If it's showing, repopulate the details view with new app data.
            _this2.detailsView.show(_this2.list[manifestURL]);
          }
        }
        _this2.appView.update(_this2.list);
        _this2.addonView.update(_this2.list);
      };

      req.onerror = function (e) {
        _this2.showAlertDialog("error fetching install apps: " + e.message);
        console.log("error fetching installed apps: ", e);
      };
    };

    ListController.prototype.handleTabChange = function (activeTab) {
      // Changing the hash will eventually invoke activateTab, however we
      // call it here directly to make the switch animation happen faster.
      this.activateTab(activeTab);
      window.location.hash = "#" + activeTab;
    };

    ListController.prototype.activateTab = function (activeTab) {
      if (this.activeTab === activeTab) {
        return;
      }
      this.activeTab = activeTab;

      if (activeTab === "apps") {
        this.appView.activate();
        this.addonView.deactivate();
      } else {
        this.addonView.activate();
        this.appView.deactivate();
      }
    };

    ListController.prototype.handleInstall = function (data) {
      var manifestURL = data.manifestURL;
      if (this.list[manifestURL].mozApp) {
        // Addons cannot be launched so do nothing on button click.
        if (data.type !== "addon") {
          this.list[manifestURL].mozApp.launch();
        }
      } else {
        this.install(data);
      }
    };

    ListController.prototype.handleDetails = function (manifestURL) {
      this.detailsView.show(this.list[manifestURL]);
    };

    ListController.prototype.handleCloseDetails = function () {
      this.detailsView.hide();
      this.refreshInstalledList();
    };

    ListController.prototype.install = function (appData) {
      var _this3 = this;
      var manifest = appData.manifestURL;
      var type = appData.type;
      var installReq;
      if (type === "hosted") {
        console.log("installing hosted app, ", manifest);
        installReq = navigator.mozApps.install(manifest, {
          installMetaData: {
            url: appData.url,
            revision: appData.revision
          }
        });
      } else if (type === "packaged" || type === "addon") {
        console.log("installing packaged app, ", manifest);
        installReq = navigator.mozApps.installPackage(manifest, {
          installMetaData: {
            url: appData.url,
            revision: appData.revision
          }
        });
      } else {
        throw new Error("Could not install app, unrecognized type: " + type);
      }

      installReq.onerror = function (err) {
        var errorMsg;
        var errorType = err.target.error.name;
        switch (errorType) {
          case "DENIED":
            // If the user cancelled the install, we do nothing.
            return;

          case "NETWORK_ERROR":
            errorMsg = "No network";
            break;

          case "MANIFEST_URL_ERROR":
            errorMsg = "Invalid manifest url";
            break;

          case "INVALID_SECURITY_LEVEL":
            errorMsg = "Invalid permissions, try enabling developer mode";
            break;

          default:
            errorMsg = errorType;
            break;
        }

        _this3.showAlertDialog("INSTALL ERROR: " + errorMsg);
      };

      installReq.onsuccess = function () {
        if (type === "addon") {
          // Enable add-ons immediately by default.
          navigator.mozApps.mgmt.setEnabled(installReq.result, true);
        }
        _this3.refreshInstalledList();
        window.dispatchEvent(new CustomEvent("achievement-rewarded", {
          detail: {
            criteria: "achievements/fab-finder",
            evidence: "urn:fxos-directory:app:installed",
            name: "Fab Finder",
            description: "Install an app or add-on from Hackerplace",
            image: "./img/fab-finder.png"
          }
        }));
      };
    };

    return ListController;
  })(Controller);

  exports["default"] = ListController;
});