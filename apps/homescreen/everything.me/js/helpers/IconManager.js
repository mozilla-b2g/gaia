'use strict';

Evme.IconManager = new function Evme_IconManager() {
  var NAME = 'IconManager',
      self = this,
      _prefix = '_icon',
      timeoutUpdateStorage,
      // this will save an object with all the cached icons' data
      savedIconsKeys = {},
      _iconsKey = 'savedIconsKeys',
      CACHE_VERSION = '2.6';

  this.init = function init() {
    Evme.Storage.get(_iconsKey, function fromCache(value) {
      savedIconsKeys = value || {};
    });
  };

  this.add = function add(id, icon, iconsFormat) {
    if (!icon) {
      return false;
    }

    icon.format = iconsFormat;
    icon.id = id;

    if (!icon.format || !icon.revision || !icon.id) {
      return false;
    }

    self.get(id, function fromCache(iconFromCache) {
      if (!iconFromCache ||
            iconFromCache.format < iconsFormat ||
            iconFromCache.revision < icon.revision) {
        Evme.Storage.set(_prefix + id, icon);
        addToGlobalKey(icon);
        Evme.EventHandler.trigger(NAME, 'iconAdded', icon);
      }
    });

    return true;
  };

  this.addIcons = function addIcons(icons, format) {
    for (var i = 0, icon; icon = icons[i++];) {
      this.add(icon.id, icon.icon, format);
    }
  };

  this.get = function get(id, callback) {
    Evme.Storage.get(_prefix + id, callback);
  };

  this.getBatch = function getBatch(ids, callback) {
    if (!ids || !ids.length) {
      callback();
      return;
    }

    var iconsMap = {};
    var numIcons = 0;

    for (var i = 0, id; id = ids[i++];) {
      getIcon(id);
    }

    function getIcon(id) {
      self.get(id, function onGet(icon) {
        if (icon) {
          iconsMap[id] = icon;
        }
        if (++numIcons === ids.length) {
          callback(iconsMap);
        }
      });
    }
  };

  this.getKeys = function getKeys() {
    return savedIconsKeys;
  };

  function addToGlobalKey(icon) {
    window.clearTimeout(timeoutUpdateStorage);

    savedIconsKeys[icon.id] = {
      id: icon.id,
      format: icon.format,
      revision: icon.revision
    };

    // used to not "bomb" the storage with inserts
    timeoutUpdateStorage = window.setTimeout(function updateStorage() {
      Evme.Storage.set(_iconsKey, savedIconsKeys);
    }, 100);
  }
}
