define(["exports", "components/fxos-achievements-service/dist/achievements-service"], function (exports, _componentsFxosAchievementsServiceDistAchievementsService) {
  "use strict";

  var AchievementsService = _componentsFxosAchievementsServiceDistAchievementsService["default"];
  var IconHelper = (function () {
    var IconHelper = function IconHelper() {};

    IconHelper.setImage = function (imageElement, imagePath) {
      imageElement.src = imagePath || window.DEFAULT_ICON_URL;
      imageElement.onerror = function (e) {
        console.warn("Warning, failed to load icon url", imageElement.src, e);
        imageElement.src = window.DEFAULT_ICON_URL;
      };
    };

    IconHelper.getIconURL = function (app, icons) {
      if (!icons || !Object.keys(icons).length) {
        return "";
      }

      // The preferred size is 30 by the default. If we use HDPI device, we may
      // use the image larger than 30 * 1.5 = 45 pixels.
      var preferredIconSize = 30 * (window.devicePixelRatio || 1);
      var preferredSize = Number.MAX_VALUE;
      var max = 0;

      for (var size in icons) {
        size = parseInt(size, 10);
        if (size > max) {
          max = size;
        }

        if (size >= preferredIconSize && size < preferredSize) {
          preferredSize = size;
        }
      }
      // If there is an icon matching the preferred size, we return the result,
      // if there isn't, we will return the maximum available size.
      if (preferredSize === Number.MAX_VALUE) {
        preferredSize = max;
      }

      var url = icons[preferredSize];

      if (url) {
        return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
      } else {
        return "";
      }
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
  var AchievementsHelper = (function () {
    var AchievementsHelper = function AchievementsHelper() {
      // Create an achievements service
      this.achievementsService = new AchievementsService();

      window.addEventListener("achievement-rewarded", this);
    };

    AchievementsHelper.prototype.handleEvent = function (aEvent) {
      this.achievementsService.reward(aEvent.detail);
    };

    return AchievementsHelper;
  })();

  exports.AchievementsHelper = AchievementsHelper;
});