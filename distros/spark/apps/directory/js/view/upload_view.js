define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-header/dist/gaia-header", "components/gaia-list/gaia-list", "gaia-icons", "components/gaia-text-input/gaia-text-input", "components/gaia-text-input/gaia-text-input-multiline", "js/lib/helpers", "js/model/list_model"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaHeaderDistGaiaHeader, _componentsGaiaListGaiaList, _gaiaIcons, _componentsGaiaTextInputGaiaTextInput, _componentsGaiaTextInputGaiaTextInputMultiline, _jsLibHelpers, _jsModelListModel) {
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
  var ListModel = _jsModelListModel["default"];


  var UPLOAD_URL = "http://henretty.us/upload";

  var UploadView = (function (View) {
    var UploadView = function UploadView() {
      this.el = document.createElement("div");
      this.el.id = "uploads";
      this.el.classList.add("popup");
      this.currentApp = null;

      this.uploadBlacklist = ["app://ee50b34d-c8ce-b941-8020-5bc4693c770c/manifest.webapp", //FxStumbler
      "https://webmaker-app.mofostaging.net/manifest.webapp", "app://a9c7eb67-c2c8-8845-b150-5dd0a850200c/manifest.webapp", //Hackerplace
      "app://7a6c01c5-32fd-d041-9d0c-a70bb6c7c752/manifest.webapp", "app://customizer.gaiamobile.org/manifest.webapp", "app://default_theme.gaiamobile.org/manifest.webapp"];
      // Add current directory apps to upload blacklist.
      var directoryApps = (new ListModel()).getAppList();
      for (var manifestURL in directoryApps) {
        this.uploadBlacklist.push(manifestURL);
      }
    };

    _extends(UploadView, View);

    UploadView.prototype.render = function () {
      View.prototype.render.call(this);
      this.closeButton = this.$(".close");
      this.cancelButton = this.$("#upload-cancel");
      this.submitButton = this.$("#upload-submit");
      this.list = this.$("#upload-list");
      this.displayName = this.$("#display-name");
      this.displayIcon = this.$("#display-icon");
      this.nameInput = this.$("#upload-name");
      this.descriptionInput = this.$("#upload-description");
      this.alertDialog = document.body.querySelector("#alert-dialog");

      this.closeButton.addEventListener("click", this.hide.bind(this));
      this.cancelButton.addEventListener("click", this.hideForm.bind(this));
      this.submitButton.addEventListener("click", this.upload.bind(this));
      this.createList();
    };

    UploadView.prototype.showAlertDialog = function (msg) {
      this.alertDialog.textContent = msg;
      this.alertDialog.open();
    };

    UploadView.prototype.isEligible = function (app) {
      if (this.uploadBlacklist.indexOf(app.manifestURL) !== -1) {
        return false;
      }
      if (app.manifest.role === "theme" || app.manifest.role === "addon") {
        return true;
      }
      // Only non-gaia non-marketplace apps are eligible for hackerplace.
      return (app.removable && app.installOrigin !== "https://marketplace.firefox.com");
    };

    UploadView.prototype.createList = function () {
      var _this = this;
      var req;
      if (navigator.mozApps.mgmt) {
        req = navigator.mozApps.mgmt.getAll();
      } else {
        req = navigator.mozApps.getInstalled();
      }
      req.onsuccess = function () {
        var apps = req.result;
        apps.forEach(function (app) {
          if (_this.isEligible(app)) {
            var item = document.createElement("li");
            var icon = _this.getIconUrl(app.manifest, app.origin);
            item.classList.add("item");
            item.innerHTML = _this.itemTemplate(app.manifest);
            IconHelper.setImage(item.querySelector(".icon"), icon);
            _this.list.appendChild(item);
            item.addEventListener("click", _this.showForm.bind(_this, app));
          }
        });
      };
      req.onerror = function (e) {
        console.log("Unable to fetch installed apps.", e);
      };
    };

    UploadView.prototype.getIconUrl = function (manifest, origin) {
      if (!manifest || !manifest.icons) {
        return null;
      }
      var url;
      for (var size in manifest.icons) {
        url = manifest.icons[size];
      }
      // If we are given a relative path, we naively append app origin
      // to construct the full icon path.
      if (url.startsWith("/")) {
        url = origin + url;
      }
      return url;
    };

    UploadView.prototype.showForm = function (app) {
      this.nameInput.value = app.manifest.developer && app.manifest.developer.name || "";
      this.descriptionInput.value = app.manifest.description || "";
      this.currentApp = app;
      this.displayName.textContent = app.manifest.name;
      IconHelper.setImage(this.displayIcon, this.getIconUrl(app.manifest, app.origin));
      this.el.classList.add("form");
    };

    UploadView.prototype.hideForm = function (app) {
      this.nameInput.value = "";
      this.descriptionInput.value = "";
      this.currentApp = null;
      this.el.classList.remove("form");
    };

    UploadView.prototype.show = function () {
      this.el.classList.add("active");
    };

    UploadView.prototype.hide = function () {
      this.el.classList.remove("active");
    };

    UploadView.prototype.upload = function () {
      var _this2 = this;
      if (!this.currentApp) {
        this.showAlertDialog("Error: current app not found");
        this.hideForm();
        return;
      }

      if (this.nameInput.value === "") {
        this.showAlertDialog("You must fill out a name");
        return;
      }

      this.currentApp["export"]().then(function (blob) {
        var name = encodeURIComponent(_this2.nameInput.value);
        var description = encodeURIComponent(_this2.descriptionInput.value);
        var url = "" + UPLOAD_URL + "?name=" + name + "&description=" + description;
        var ajax = new XMLHttpRequest();
        ajax.open("POST", url, true);
        ajax.onload = function () {
          console.log("Upload complete");
        };
        ajax.error = function (e) {
          _this2.showAlertDialog("App upload failed, " + e);
          console.log("Upload failed", e);
        };
        ajax.send(blob);
        _this2.showAlertDialog("Upload success! We will now review your app for the Hackerplace.");
        _this2.hideForm();
      }).then(function () {
        return window.dispatchEvent(new CustomEvent("achievement-rewarded", {
          detail: {
            criteria: "achievements/content-commander",
            evidence: "urn:fxos-directory:app:uploaded",
            name: "Content Commander",
            description: "Submit an app or add-on to Hackerplace",
            image: "./img/content-commander.png"
          }
        }));
      })["catch"](function (e) {
        _this2.showAlertDialog("Error exporting app");
        console.log("Error exporting app", e);
      });
    };

    UploadView.prototype.itemTemplate = function (_ref) {
      var name = _ref.name;
      var string = "\n      <img class=\"icon\" />\n      <div flex class=\"description\">\n        <p class=\"name\">" + name + "</p>\n      </div>\n      <i data-icon=\"forward\"></i>";
      return string;
    };

    UploadView.prototype.template = function () {
      var string = "\n      <gaia-header>\n        <a class=\"close\"><i data-icon=\"close\"></i></a>\n        <h1 id=\"upload-title\">Upload</h1>\n      </gaia-header>\n      <gaia-list id=\"upload-list\" class=\"install-list\"></gaia-list>\n      <div id=\"upload-form\">\n        <gaia-list class=\"info-list install-list\">\n          <li class=\"item\">\n            <img id=\"display-icon\" class=\"icon\" />\n            <div flex class=\"description\">\n              <p id=\"display-name\" class=\"name\"></p>\n            </div>\n          </li>\n        </gaia-list>\n        <div id=\"form-fields\">\n          <label>Tell us your name&nbsp;<span class=\"red\">*</span></label>\n          <gaia-text-input id=\"upload-name\"></gaia-text-input>\n          <label>App Description (optional)</label>\n          <gaia-text-input-multiline id=\"upload-description\">\n          </gaia-text-input-multiline>\n          <section id=\"upload-buttons\">\n            <gaia-button id=\"upload-cancel\">Cancel</gaia-button>\n            <gaia-button id=\"upload-submit\">Upload</gaia-button>\n          </section>\n        </div>\n      </div>";
      return string;
    };

    return UploadView;
  })(View);

  exports["default"] = UploadView;
});