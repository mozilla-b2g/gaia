define(["exports", "components/fxos-mvc/dist/mvc", "components/gaia-header/dist/gaia-header", "components/gaia-sub-header/gaia-sub-header", "components/gaia-list/gaia-list", "components/gaia-button/gaia-button", "js/lib/helpers"], function (exports, _componentsFxosMvcDistMvc, _componentsGaiaHeaderDistGaiaHeader, _componentsGaiaSubHeaderGaiaSubHeader, _componentsGaiaListGaiaList, _componentsGaiaButtonGaiaButton, _jsLibHelpers) {
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
  var AppsHelper = _jsLibHelpers.AppsHelper;
  var ManifestHelper = _jsLibHelpers.ManifestHelper;


  function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
  }

  var DetailsView = (function (View) {
    var DetailsView = function DetailsView() {
      this.el = document.createElement("div");
      this.el.id = "app-details";
      this.el.classList.add("popup");
      this.closeHandlers = [];
      this.installHandlers = [];
    };

    _extends(DetailsView, View);

    DetailsView.prototype.render = function () {
      var _this = this;
      View.prototype.render.call(this);
      this.titleElement = this.el.querySelector("#details-title");
      this.itemElement = this.el.querySelector(".item");
      this.nameElement = this.el.querySelector(".name");
      this.iconElement = this.el.querySelector(".icon");
      this.authorElement = this.el.querySelector(".author");
      this.fullDescription = this.el.querySelector("#full-description");
      this.addonSection = this.el.querySelector("#addon-section");
      this.affectedApps = this.el.querySelector("#affected-apps");
      this.installButton = this.el.querySelector(".install-button");

      this.installButton.addEventListener("click", function () {
        _this.installHandlers.forEach(function (handler) {
          handler(_this.details);
        });
      });
      this.closeButton = this.el.querySelector("#close-button");
      this.closeButton.addEventListener("click", function () {
        _this.closeHandlers.forEach(function (handler) {
          handler();
        });
      });
    };

    DetailsView.prototype.filterNonAffectedApps = function (apps, addonManifest) {
      var filters = addonManifest.customizations.map(function (customization) {
        return new RegExp(customization.filter);
      });

      return apps.filter(function (app) {
        if (!app.manifest) {
          console.log("Could not filter app, manifest not found", app.name);
          return false;
        }
        // Make sure the addon has appropriate privs against the app.
        if (!ManifestHelper.hasHigherPriviledges(addonManifest, app.manifest)) {
          return false;
        }
        // Test the apps launch URL against each customization filter
        // and mark the app as affected if it matches at least one.
        var launchPath = app.manifest.launch_path || "";
        var launchURL = new URL(launchPath, app.manifestURL).href;
        return filters.find(function (filter) {
          return filter.test(launchURL);
        });
      });
    };

    DetailsView.prototype.dedupeAppNames = function (apps) {
      return apps.map(function (app) {
        return app.manifest.name;
      }).filter(function (appName, index, appNames) {
        return appNames.indexOf(appName) === index;
      });
    };

    DetailsView.prototype.populateAffectedApps = function (details) {
      var _this2 = this;
      Promise.all([AppsHelper.getAllApps(), ManifestHelper.getManifest(details.manifestURL)]).then(function (results) {
        var apps = results[0];
        var addonManifest = results[1];
        if (!addonManifest) {
          // If we cannot fetch addon manifest, we cannot display addon info.
          _this2.affectedApps.textContent = "Cannot determine affected apps, invalid manifest URL.";
        } else {
          var filteredApps = _this2.filterNonAffectedApps(apps, addonManifest);

          var affectedAppList;
          if (apps.length === filteredApps.length) {
            affectedAppList = "All applications.";
          } else {
            affectedAppList = _this2.dedupeAppNames(filteredApps).join(", ");
          }
          _this2.affectedApps.textContent = affectedAppList || "None";
        }
      })["catch"](function (err) {
        console.warn("Could not populate affected apps", err);
        // Hide affected apps section when undetermined.
        _this2.addonSection.hidden = true;
      });
    };

    DetailsView.prototype.show = function (details) {
      this.details = details;
      this.itemElement.classList.toggle("installed", details.installed);
      this.itemElement.classList.toggle("addon", (details.type === "addon"));
      this.titleElement.textContent = capitalize(details.name);
      IconHelper.setImage(this.iconElement, details.icon);
      this.nameElement.textContent = capitalize(details.name);
      this.authorElement.textContent = details.author;
      this.fullDescription.textContent = details.description;
      this.installButton.textContent = details.installed ? "Open" : "Install";
      this.installButton.classList.toggle("installed", details.installed);
      this.installButton.disabled = false;
      this.addonSection.hidden = true;

      // Addons need the affected apps section, and no Open button.
      if (details.type === "addon") {
        if (details.installed) {
          this.installButton.textContent = "Installed";
          this.installButton.disabled = true;
        }
        this.addonSection.hidden = false;
        this.populateAffectedApps(details);
      }

      this.el.classList.add("active");
    };

    DetailsView.prototype.hide = function () {
      this.el.classList.remove("active");
    };

    DetailsView.prototype.isShowing = function (manifestURL) {
      return this.el.classList.contains("active") && this.details.manifestURL === manifestURL;
    };

    DetailsView.prototype.onClose = function (handler) {
      if (this.closeHandlers.indexOf(handler) === -1) {
        this.closeHandlers.push(handler);
      }
    };

    DetailsView.prototype.onInstall = function (handler) {
      if (this.installHandlers.indexOf(handler) === -1) {
        this.installHandlers.push(handler);
      }
    };

    DetailsView.prototype.template = function () {
      var string = "\n      <gaia-header>\n        <a id=\"close-button\" class=\"close\"><i data-icon=\"close\"></i></a>\n        <h1 id=\"details-title\">App Details</h1>\n      </gaia-header>\n      <gaia-list class=\"info-list install-list\">\n        <li class=\"item\">\n          <img class=\"icon\" />\n          <div flex class=\"description\">\n            <p class=\"name\"></p>\n            <p class=\"author\"></p>\n          </div>\n          <span class=\"install-info\">Installed</span>\n          <gaia-button class=\"install-button\"></gaia-button>\n        </li>\n      </gaia-list>\n      <p id=\"full-description\"></p>\n      <div id=\"addon-section\">\n        <gaia-sub-header>Affected Apps</gaia-sub-header>\n        <p id=\"affected-apps\"></div>\n      </div>";
      return string;
    };

    return DetailsView;
  })(View);

  exports["default"] = DetailsView;
});