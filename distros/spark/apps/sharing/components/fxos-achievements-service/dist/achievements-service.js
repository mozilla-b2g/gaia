define(["exports", "fxos-settings-utils/dist/settings-utils"], function (exports, _fxosSettingsUtilsDistSettingsUtils) {
  "use strict";

  var _toArray = function (arr) {
    return Array.isArray(arr) ? arr : Array.from(arr);
  };

  "use strict";

  var SettingsHelper = _fxosSettingsUtilsDistSettingsUtils.SettingsHelper;


  var DEFAULT_IMAGE_SIZE = 64;

  var ImageHelper = (function () {
    var ImageHelper = function ImageHelper() {};

    ImageHelper.getImage = function (aSrc) {
      return new Promise(function (resolve, reject) {
        var image = new Image();
        image.src = aSrc;
        image.onload = function () {
          return resolve(image);
        };
        image.onerror = function (reason) {
          return reject(reason);
        };
      })["catch"](function (reason) {
        return console.warn("Could not load an achievement image:", reason);
      });
    };

    ImageHelper.generateImageDataURL = function (aSrc) {
      return ImageHelper.getImage(aSrc).then(function (image) {
        try {
          var canvas = document.createElement("canvas");
          canvas.height = canvas.width = DEFAULT_IMAGE_SIZE;
          var context = canvas.getContext("2d");
          var dataUrl;

          context.drawImage(image, 0, 0, DEFAULT_IMAGE_SIZE, DEFAULT_IMAGE_SIZE);
          dataUrl = canvas.toDataURL();

          // Clean up.
          canvas.width = canvas.height = 0;
          canvas = null;

          return dataUrl;
        } catch (e) {
          return Promise.reject("Could not convert image to Data URL.");
        }
      })["catch"](function (reason) {
        return console.warn(reason);
      });
    };

    return ImageHelper;
  })();

  var AchievementsService = (function () {
    var AchievementsService = function AchievementsService() {};

    AchievementsService.prototype.reward = function (_ref) {
      var criteria = _ref.criteria;
      var evidence = _ref.evidence;
      var name = _ref.name;
      var description = _ref.description;
      var image = _ref.image;
      if (!evidence) {
        return Promise.reject("Evidence is not provided.");
      }

      var issuedOn;
      return SettingsHelper.get("achievements", []).then(function (achievements) {
        var achievement = achievements.find(function (achievement) {
          return achievement.criteria === criteria;
        });

        if (!achievement) {
          return Promise.reject("Achievement is not registered.");
        }
        if (achievement.evidence) {
          return Promise.reject("Achievement is already awarded.");
        }

        achievement.evidence = evidence;
        achievement.uid = "achievement" + Math.round(Math.random() * 100000000);
        achievement.issuedOn = issuedOn = Date.now();
        achievement.recipient = {}; // TODO

        return achievements;
      }).then(function (achievements) {
        return Promise.all([ImageHelper.generateImageDataURL(image), SettingsHelper.set({ achievements: achievements })]);
      }).then(function (_ref2) {
        var _ref3 = _toArray(_ref2);

        var image = _ref3[0];
        // Send a Notification via WebAPI to be handled by the Gaia::System
        var notification = new Notification(name, {
          body: description,
          icon: image,
          tag: issuedOn
        });

        notification.onclick = function () {
          var activity = new window.MozActivity({
            name: "configure",
            data: {
              target: "device",
              section: "achievements"
            }
          });
          activity.onsuccess = activity.onerror = function () {
            notification.close();
          };
        };
      })["catch"](function (reason) {
        return console.warn(reason);
      });
    };

    return AchievementsService;
  })();

  exports["default"] = AchievementsService;
});