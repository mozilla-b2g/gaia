/* Taken from https://github.com/fxos/achievements-service and in particular,
   built from https://github.com/fxos/achievements-service/blob/master/
              achievements-service.js */

(function(exports) {
  'use strict';

  var _toArray = function (arr) {
    return Array.isArray(arr) ? arr : Array.from(arr);
  };

  /* global console */

  var DEFAULT_IMAGE_SIZE = 64;
  var MOZ_SETTINGS_NOT_AVAILABLE_MSG = 'navigator.mozSettings is not available';

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
      })['catch'](function (reason) {
        return console.warn('Could not load an achievement image:', reason);
      });
    };

    ImageHelper.generateImageDataURL = function (aSrc) {
      return ImageHelper.getImage(aSrc).then(function (image) {
        try {
          var canvas = document.createElement('canvas');
          canvas.height = canvas.width = DEFAULT_IMAGE_SIZE;
          var context = canvas.getContext('2d');
          var dataUrl;

          context.drawImage(image, 0, 0, DEFAULT_IMAGE_SIZE,
            DEFAULT_IMAGE_SIZE);
          dataUrl = canvas.toDataURL();

          // Clean up.
          canvas.width = canvas.height = 0;
          canvas = null;

          return dataUrl;
        } catch (e) {
          return Promise.reject('Could not convert image to Data URL.');
        }
      })['catch'](function (reason) {
        return console.warn(reason);
      });
    };

    return ImageHelper;
  })();

  var SettingsHelper = (function () {
    var SettingsHelper = function SettingsHelper() {};

    SettingsHelper.get = function (name, defaultValue) {
      if (!name) {
        return Promise.reject('Setting name is missing');
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      }

      return new Promise(function (resolve, reject) {
        var setting = navigator.mozSettings.createLock().get(name,
          defaultValue);
        setting.onsuccess = function () {
          var settingValue = setting.result[name] || defaultValue;
          resolve(settingValue);
        };
        setting.onerror = function () {
          reject(setting.error);
        };
      });
    };

    SettingsHelper.set = function (settings) {
      if (!settings) {
        return Promise.reject('Settings are missing');
      }

      if (!navigator.mozSettings) {
        console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
        return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      }

      return new Promise(function (resolve, reject) {
        var result = navigator.mozSettings.createLock().set(settings);
        result.onsuccess = function () {
          resolve(result.result);
        };
        result.onerror = function () {
          reject(result.error);
        };
      });
    };

    return SettingsHelper;
  })();

  var AchievementsService = (function () {
    var AchievementsService = function AchievementsService() {};

    AchievementsService.prototype.reward = function (_ref) {
      var _this = this;
      var criteria = _ref.criteria;
      var evidence = _ref.evidence;
      var name = _ref.name;
      var description = _ref.description;
      var image = _ref.image;
      if (!evidence) {
        return Promise.reject('Evidence is not provided.');
      }

      var issuedOn;
      return SettingsHelper.get('achievements', []).then(
        function (achievements) {
          var achievement = achievements.find(function (achievement) {
            return achievement.criteria === criteria;
          });

          if (!achievement) {
            return Promise.reject('Achievement is not registered.');
          }
          if (achievement.evidence) {
            return Promise.reject('Achievement is already awarded.');
          }

          achievement.evidence = evidence;
          achievement.uid = 'achievement' +
            Math.round(Math.random() * 100000000);
          achievement.issuedOn = issuedOn = Date.now();
          achievement.recipient = {}; // TODO

          return achievements;
        }).then(function (achievements) {
        return Promise.all([ImageHelper.generateImageDataURL(image),
          SettingsHelper.set({ achievements: achievements })]);
      }).then(function (_ref2) {
        var _ref3 = _toArray(_ref2);

        var image = _ref3[0];
        // Send a Notification via WebAPI to be handled by the Gaia::System
        return _this.send(name, {
          bodyL10n: description,
          icon: image,
          tag: issuedOn
        });
      })['catch'](function (reason) {
        return console.warn(reason);
      });
    };

    AchievementsService.prototype.send = function (titleL10n, options) {
      return Promise.all([titleL10n, options.bodyL10n].map(this.getL10n)).then(
        function (_ref4) {
          var _ref5 = _toArray(_ref4);

          var title = _ref5[0];
          var body = _ref5[1];
          if (body) {
            options.body = body;
          }
          options.dir = navigator.mozL10n.language.direction;
          options.lang = navigator.mozL10n.language.code;

          var notification = new window.Notification(title, options);

          notification.onclick = function () {
            var activity = new window.MozActivity({
              name: 'configure',
              data: {
                target: 'device',
                section: 'achievements'
              }
            });
            activity.onsuccess = activity.onerror = function () {
              notification.close();
            };
          };

          return notification;
        });
    };

    AchievementsService.prototype.getL10n = function (l10nAttrs) {
      if (!l10nAttrs) {
        return;
      }
      if (typeof l10nAttrs === 'string') {
        return navigator.mozL10n.formatValue(l10nAttrs);
      }
      if (l10nAttrs.raw) {
        return l10nAttrs.raw;
      }
      return navigator.mozL10n.formatValue(l10nAttrs.id, l10nAttrs.args);
    };

    return AchievementsService;
  })();

  exports.AchievementsService = AchievementsService;
})(window);
