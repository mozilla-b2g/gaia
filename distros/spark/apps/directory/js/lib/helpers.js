define(["exports"], function (exports) {
  "use strict";

  var IconHelper = (function () {
    var IconHelper = function IconHelper() {};

    IconHelper.setImage = function (imageElement, imagePath) {
      imageElement.src = imagePath || window.DEFAULT_ICON_URL;
      imageElement.onerror = function (e) {
        console.warn("Warning, failed to load icon url", imageElement.src, e);
        imageElement.src = window.DEFAULT_ICON_URL;
      };
    };

    return IconHelper;
  })();

  exports.IconHelper = IconHelper;
  var AppsHelper = (function () {
    var AppsHelper = function AppsHelper() {};

    AppsHelper.getAllApps = function () {
      return new Promise(function (resolve, reject) {
        var mgmt = navigator.mozApps.mgmt;
        if (!mgmt) {
          reject(new Error("Cannot fetch apps, no permissions"));
        }

        var req = mgmt.getAll();
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function (e) {
          reject(e);
        };
      });
    };

    return AppsHelper;
  })();

  exports.AppsHelper = AppsHelper;
  var ManifestHelper = (function () {
    var ManifestHelper = function ManifestHelper() {};

    ManifestHelper.getManifest = function (url) {
      return new Promise(function (resolve, reject) {
        var req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.responseType = "json";
        req.onload = function () {
          resolve(req.response);
        };
        req.onerror = function (e) {
          reject(e);
        };
        req.send();
      });
    };

    ManifestHelper.hasHigherPriviledges = function (manifest1, manifest2) {
      return manifest1.type === manifest2.type || manifest1.type === "certified" || (manifest1.type === "privileged" && manifest2.type !== "certified");
    };

    return ManifestHelper;
  })();

  exports.ManifestHelper = ManifestHelper;
  var ActivityHelper = (function () {
    var ActivityHelper = function ActivityHelper() {
      var _this = this;
      this.ready = new Promise(function (resolve, reject) {
        if (navigator.mozHasPendingMessage && navigator.mozHasPendingMessage("activity")) {
          navigator.mozSetMessageHandler("activity", function (activity) {
            var activitySource = activity.source;

            if (activitySource.name !== "install") {
              activity.postError("Unsupported activity");
              return;
            }

            _this.isActivity = true;
            window.addEventListener("request-activity-finish", function () {
              activity.postResult("finished");
            });
            resolve(_this.getRoute(activitySource.data.type));
          });
        } else {
          var hash = window.location.hash;
          resolve(_this.getRoute(hash && hash.slice(1)));
        }
      });
    };

    ActivityHelper.prototype.getRoute = function (type) {
      return type || "apps";
    };

    return ActivityHelper;
  })();

  exports.ActivityHelper = ActivityHelper;
});