/**
 * Collection.js
 * Main Evme object for using Collection
 *
 */
 void function() {
  Evme.Collection = new function Evme_Collection() {
    var self = this,
      NAME = 'Collection',

      currentSettings = null,

      el = null,
      elTitle = null,
      elClose = null,
      elAppsContainer = null,
      elImage = null,
      elImageFullscreen = null,
      resultsManager = null,
      isFullScreenVisible = false,

      title = '',

      CLASS_WHEN_IMAGE_FULLSCREEN = 'full-image',
      CLASS_WHEN_ANIMATING = 'animate',
      TRANSITION_DURATION = 400,

      // number of preinstalled collections to create on the first page
      NUM_COLLECTIONS_FIRST_PAGE = 6;

    this.editMode = false;

    this.init = function init(options) {
      !options && (options = {});

      resultsManager = options.resultsManager;

      el = document.getElementsByClassName('collection')[0];

      elAppsContainer = resultsManager.getElement();

      elTitle = Evme.$('.title', el)[0];
      elImage = Evme.$('.image', el)[0];
      elClose = Evme.$('.close', el)[0];

      elClose.addEventListener('click', self.hide);
      elAppsContainer.dataset.scrollOffset = 0;

      initPreinstalled();
      Evme.EventHandler.trigger(NAME, 'init');
    };

    this.create = function create(options) {
      var query = options.query,
        apps = options.apps,
        gridPosition = options.gridPosition,
        callback = options.callback || Evme.Utils.NOOP,
        extra = {'extraIconsData': options.extraIconsData};

      if (query) {
        Evme.CollectionSettings.createByQuery(query, extra, function onCreate(collectionSettings) {
          addCollectionToHomescreen(collectionSettings, gridPosition, {
            "callback": function onAddedToHomescreen() {
              callback(collectionSettings);
            }
          });
        });
      }
    };

    this.remove = function removeCollection(id, params) {
      params = params || {};

      EvmeManager.removeGridItem({
        "id": id,
        "onConfirm": function onConfirm() {
          Evme.CollectionStorage.remove(id);
          params.callback && params.callback();
        }
      });
    };

    /**
     * Overwrite a collection's settings with new data
     * and update the homescreen icon if needed.
     */
    this.update = function updateCollection(collectionSettings, data, callback=Evme.Utils.NOOP){
      Evme.CollectionSettings.update(collectionSettings, data, function onUpdate(updatedSettings){
        // TODO compare ids of collectionSettings.app with data.apps
        // and collectionSettings.extraIconsData with data.extraIconsData
        // to conclude homescreen icon should be updated
        if ('apps' in data || 'extraIconsData' in data || 'name' in data) {
          addCollectionToHomescreen(updatedSettings);
        }

        // collection is open and apps changed
        if (currentSettings && 'apps' in data) {
          resultsManager.renderStaticApps(updatedSettings.apps);
        }

        callback(updatedSettings);
      });
    };

    // cloud app is always added to the currently open collection
    this.addCloudApp = function addCloudApp(cloudResult) {
      var cloudAppData = cloudResult.cfg;

      Evme.Utils.getRoundIcon({
          "src": cloudAppData.icon,
          "padding": true
      }, function onIconReady(roundedAppIcon) {
        // add some properties we will use when rendering a CloudAppResult
        // see StaticApps.js@render
        cloudAppData.staticType = Evme.STATIC_APP_TYPE.CLOUD;
        cloudAppData.collectionQuery = currentSettings.query;

        // save the rounded version as the icon
        cloudAppData.icon = roundedAppIcon;

        self.update(currentSettings, {
          "apps": currentSettings.apps.concat(cloudAppData)
        });

      });
    };

    // add installed app to open collection via settings menu
    // or to some other collection by dropping an app into it
    this.addInstalledApp = function addInstalledApp(installedApp, collectionId) {
      Evme.CollectionStorage.get(collectionId, function onGotSettings(collectionSettings) {
        self.update(collectionSettings, {
          "apps": collectionSettings.apps.concat(installedApp)
        });
      });
    };

    // remove app from the open collection via settings menu
    this.removeApp = function removeApp(id) {
      var apps = currentSettings.apps.filter(function keepIt(app) {
        return app.id !== id;
      });

      if (apps.length < currentSettings.apps.length) {
        self.update(currentSettings, {'apps': apps});
      }
    };

    // apps added to the open collection via the settings menu
    this.addApps = function addApps(newApps) {
      if (newApps && newApps.length) {
        self.update(currentSettings, {
          'apps': currentSettings.apps.concat(newApps)
        });
      }
    };

    this.onQueryIndexUpdated = function onQueryIndexUpdated() {
      // TODO
      Evme.CollectionSettings.updateAll();
      // move update homescreen here
    };

    this.show = function show(e) {
      var data = e.detail;
      Evme.CollectionStorage.get(data.id, function onGotFromStorage(collectionSettings) {
        currentSettings = collectionSettings;

        el.dataset.id = collectionSettings.id;
        self.setTitle(collectionSettings.name || collectionSettings.query);
        collectionSettings.bg && self.setBackground(collectionSettings.bg);

        self.editMode = false;

        resultsManager.renderStaticApps(collectionSettings.apps);

        window.mozRequestAnimationFrame(function() {
          el.classList.add('visible');
          Evme.EventHandler.trigger(NAME, 'show');
        });
      });
    };

    this.hide = function hide() {
      if (!currentSettings) {
        return false;
      }

      // update homescreen icon with first three visible icons
      var extraIconsData = resultsManager.getCloudResultsIconData();
      self.update(currentSettings, {'extraIconsData': extraIconsData});

      currentSettings = null;

      // hack for preventing the browser from saving the scroll position
      // and restoring it when a new Collection opens
      resultsManager.scrollToTop();

      resultsManager.clear();
      self.clearBackground();

      self.toggleEditMode(false);

      window.mozRequestAnimationFrame(function() {
        el.classList.remove('visible');
        Evme.EventHandler.trigger(NAME, 'hide');
      });

      return true;
    };

    this.isOpen = function isOpen() {
        return currentSettings !== null;
    };

    this.setTitle = function setTitle(newTitle) {
      title = newTitle;

      elTitle.innerHTML = '<em></em>' + '<span>' + title + '</span>' + ' ' +
        '<span ' + Evme.Utils.l10nAttr(NAME, 'title-suffix') + '/>';
    };

    this.setBackground = function setBackground(newBg) {
      if (!currentSettings) return;

      self.clearBackground();

      elImage.style.backgroundImage = 'url(' + newBg.image + ')';

      elImageFullscreen = Evme.BackgroundImage.getFullscreenElement(newBg, self.hideFullscreen);
      el.appendChild(elImageFullscreen);

      self.update(currentSettings, {"bg": newBg});

      resultsManager.changeFadeOnScroll(true);
    };

    this.clearBackground = function clearBackground() {
      el.style.backgroundImage = 'none';
      elImage.style.backgroundImage = 'none';

      Evme.$remove(elImageFullscreen);

      resultsManager.changeFadeOnScroll(false);
    };

    this.showFullscreen = function showFullScreen(e) {
      if (isFullScreenVisible) {
        return false;
      }

      e && e.preventDefault();
      e && e.stopPropagation();

      isFullScreenVisible = true;
      el.classList.add(CLASS_WHEN_ANIMATING);
      window.setTimeout(function onTimeout() {
        self.fadeImage(0);
        el.classList.add(CLASS_WHEN_IMAGE_FULLSCREEN);
      }, 10);

      return true;
    };

    this.hideFullscreen = function hideFullscreen(e) {
      if (!isFullScreenVisible) {
        return false;
      }

      e && e.preventDefault();
      e && e.stopPropagation();

      isFullScreenVisible = false;
      el.classList.add(CLASS_WHEN_ANIMATING);
      window.setTimeout(function onTimeout() {
        self.fadeImage(1);
        el.classList.remove(CLASS_WHEN_IMAGE_FULLSCREEN);

        window.setTimeout(function onTimeout() {
          el.classList.remove(CLASS_WHEN_ANIMATING);
        }, TRANSITION_DURATION);
      }, 10);

      return true;
    };

    this.fadeImage = function fadeImage(howMuch) {
      elAppsContainer.style.opacity = howMuch;
    };

    this.getExperience = function getExperience() {
      return currentSettings.experienceId;
    };

    this.getQuery = function getQuery() {
      return currentSettings.query;
    };

    this.userSetBg = function userSetBg() {
      return (currentSettings.bg && currentSettings.bg.setByUser);
    };

    this.toggleEditMode = function toggleEditMode(bool) {
      if (self.editMode === bool) {
        return false;
      }

      self.editMode = bool;
      if (bool) {
        el.dataset.mode = 'edit';
        document.addEventListener('mozvisibilitychange', onVisibilityChange);
      } else {
        delete el.dataset.mode;
        document.removeEventListener('mozvisibilitychange', onVisibilityChange);
      }

      return true;
    };

    function onVisibilityChange() {
      if (document.mozHidden) {
        self.toggleEditMode(false);
      }
    }

    function initPreinstalled() {
      var cacheKey = 'createdInitialShortcuts';

      Evme.Storage.get(cacheKey, function onCacheValue(didInitShortcuts) {
        if (didInitShortcuts) {
          return;
        }

        var defaultShortcuts = Evme.__config['_localShortcuts'],
          defaultIcons = Evme.__config['_localShortcutsIcons'];

        for (var i = 0; i < defaultShortcuts.length; i++) {
          var shortcut = defaultShortcuts[i],
              gridPosition = {
                'page': (i < NUM_COLLECTIONS_FIRST_PAGE) ? 0 : 1,
                'index': (i < NUM_COLLECTIONS_FIRST_PAGE) ? i : (i % NUM_COLLECTIONS_FIRST_PAGE)
              };

          var shortcutIconsMap = {};
          shortcut.appIds.forEach(function getIcon(appId) {
              shortcutIconsMap[appId] = defaultIcons[appId];
          });

          (function initCollection(shortcut, iconsMap, gridPosition) {
            Evme.Utils.roundIconsMap(iconsMap, function onRoundIcons(roundIcons) {
              var extraIconsData = shortcut.appIds.map(function wrapIcon(appId){
                return {"id": appId, "icon": roundIcons[appId]};
              });

              createPreinstalledCollection(shortcut.experienceId, extraIconsData, gridPosition);

            });
          })(shortcut, shortcutIconsMap, gridPosition);
        }

        Evme.Storage.set(cacheKey, true);
      });

      // create the icon, create the collection, add it to homescreen
      function createPreinstalledCollection(experienceId, extraIconsData, position) {
        var key = Evme.Utils.shortcutIdToKey(experienceId),
          l10nkey = 'id-' + key,
          query = Evme.Utils.l10n('shortcut', l10nkey);

        var apps = Evme.InstalledAppsService.getMatchingApps({
          "query": query
        });

        var collectionSettings = new Evme.CollectionSettings({
          "id": Evme.Utils.getCollectionId(key),
          "experienceId": experienceId,
          "query": query,
          "extraIconsData": extraIconsData,
          "apps": apps
        });

        saveSettings(collectionSettings, function onSettingsSaved(collectionSettings) {
          addCollectionToHomescreen(collectionSettings, position);
          populateCollection(collectionSettings);
        });
      };
    }
  };


  /**
   * The data required for displaying a collection
   * @param {Object} args
   */
  Evme.CollectionSettings = function Evme_CollectionSettings(args) {
    this.id = args.id;
    this.name = args.name || args.query;
    this.bg = args.bg || null;  // object containing backgound information (image, query, source, setByUser)

    // collection performs search by query or by experience
    this.query = args.query || args.name;
    this.experienceId = args.experienceId;

    this.apps = args.apps || [];

    // TODO save only reference, get data from IconManager
    // get static apps' icons from InstalledAppsService
    this.extraIconsData = args.extraIconsData || [];  // list of {"id": 3, "icon": "base64icon"}

  };

  /**
   * Create a settings object from a query
   * @param  {String}   query
   * @param  {Object}   extra
   * @param  {Function} cb
   */
  Evme.CollectionSettings.createByQuery = function createByQuery(query, extra={}, cb=Evme.Utils.NOOP) {
    var installedApps = Evme.InstalledAppsService.getMatchingApps({
      'query': query
    });

    var installedIcons = Evme.Utils.pluck(installedApps, 'icon');

    var settings = new Evme.CollectionSettings({
      id: Evme.Utils.uuid(),
      query: query,
      extraIconsData: extra.extraIconsData,
      apps: installedApps
    });

    saveSettings(settings, cb);
  };

  /**
   * wrapper for update calls
   * code should not call CollectionStorage.update directly
   */
  Evme.CollectionSettings.update = function update(settings, data, cb) {
    // remove duplicates
    if ('apps' in data){
      data.apps = Evme.Utils.unique(data.apps, 'id');
    }

    Evme.CollectionStorage.update(settings, data, cb);
  };

  Evme.CollectionSettings.updateAll = function updateAll() {
    // TODO
    // see if this method required any changes
    // get collection by EvmeManager.getCollections?
    var ids = Evme.CollectionStorage.getAllIds();

    for (var i = 0, id; id = ids[i++];) {
      Evme.CollectionStorage.get(id, populateCollection);
    }
  };

  // save collection settings in storage and run callback async.
  function saveSettings(settings, cb) {
    Evme.CollectionStorage.add(settings, function onStored() {
      cb && cb(settings);
    });
  }

  function populateCollection(settings) {
    var existingIds = Evme.Utils.pluck(settings.apps, 'id');

    var newApps = Evme.InstalledAppsService.getMatchingApps({
      'query': settings.query
    });

    newApps = newApps.filter(function isNew(app) {
      return existingIds.indexOf(app.id) === -1;
    });

    if (newApps.length){
      Evme.Collection.update(settings, {"apps": settings.apps.concat(newApps)});
    }
  };

  /**
   * Add a collection to the homescreen.
   * If collection exists only update the icon.
   */
  function addCollectionToHomescreen(settings, gridPosition, extra) {
    var icons = Evme.Utils.pluck(settings.apps, 'icon');

    if (icons.length < Evme.Config.numberOfAppInCollectionIcon) {
      var extraIcons = Evme.Utils.pluck(settings.extraIconsData, 'icon');
      icons = icons.concat(extraIcons).slice(0, Evme.Config.numberOfAppInCollectionIcon);
    }

    Evme.IconGroup.get(icons, function onIconCreated(canvas) {
      EvmeManager.addGridItem({
        'id': settings.id,
        'originUrl': settings.id,
        'title': settings.name,
        'icon': canvas.toDataURL(),
        'isCollection': true,
        'isEmpty': !(icons.length),
        'gridPosition': gridPosition
      }, extra);
    });
  }

  /**
   * CollectionStorage
   * Persists settings to local storage
   *
   * TODO encapsulate - don't expose as Evme.CollectionStorage
   */
  Evme.CollectionStorage = new function Evme_CollectionStorage() {
    var NAME = 'CollectionStorage',
        IDS_STORAGE_KEY = 'evmeCollection',
        PREFIX = 'collectionsettings_',
        self = this,
        ids = null,
        locked = false;  // locks the ids list

    this.init = function init() {
      Evme.Storage.get(IDS_STORAGE_KEY, function onGet(storedIds) {
        ids = storedIds || [];
      });

      window.addEventListener('collectionUninstalled', onCollectionUninstalled);
    };

    this.remove = function remove(collectionId) {
      removeId(collectionId);
    };

    this.add = function add(settings, cb) {
      if (!settings.id) return;

      Evme.Storage.set(PREFIX + settings.id, settings, function onSet() {
        addId(settings.id);
        cb instanceof Function && cb(settings);
      });
    };

    this.update = function update(settings, data, cb) {
      for (var prop in data) {
        settings[prop] = data[prop];
      }
      self.add(settings, cb);
    };

    this.get = function get(settingsId, cb) {
      Evme.Storage.get(PREFIX + settingsId, function onGet(storedSettings) {
        if (cb && storedSettings !== null) {
          var settings = new Evme.CollectionSettings(storedSettings);
          cb instanceof Function && cb(settings);
        }
      });
    };

    this.getAllIds = function getAllIds() {
      return ids;
    };

    this.getAllCollections = function getAllCollections(callback) {
      var ids = self.getAllIds(),
          collections = [];

      for (var i = 0, id; id = ids[i++];) {
        self.get(id, onGotCollectionSettings);
      }

      function onGotCollectionSettings(settings) {
        collections.push(settings);
        if (collections.length === ids.length) {
          callback(collections);
        }
      }
    };

    function onCollectionUninstalled(e) {
      self.removeId(e.detail.collection.id);
    }

    function addId(id) {
      if (ids && ids.indexOf(id) > -1) return;

      if (ids === null || locked) {
        setTimeout(function retry() {addId(id); }, 100);
        return;
      }

      try {
        lock();
        ids.push(id);
        Evme.Storage.set(IDS_STORAGE_KEY, ids, unlock);
      } catch (ex) {
        unlock();
      }
    }

    function removeId(id) {
      if (ids === null || locked) {
        setTimeout(function retry() {removeId(id); }, 100);
        return;
      }

      try {
        lock();
        ids = ids.filter(function neqId(storedId) {return storedId !== id });
        Evme.CollectionStorage.set(IDS_STORAGE_KEY, ids, function onRemoved() {
          unlock();
          Evme.Storage.remove(PREFIX + collectionId);
        });
      } catch (ex) {
        unlock();
      }
    }

    function lock() {
      locked = true;
    }

    function unlock() {
      locked = false;
    }
  };

}();
