'use strict';

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
        CLASS_WHEN_EDITING_NAME = 'renaming',
        TRANSITION_DURATION = 400;

    this.editMode = false;
    this.isRenaming = false;

    this.init = function init(options) {
      !options && (options = {});

      resultsManager = options.resultsManager;

      el = document.getElementById('collection');

      elAppsContainer = resultsManager.getElement();

      elTitle = Evme.$('.title', el)[0];
      elImage = Evme.$('.image', el)[0];
      elClose = Evme.$('.close', el)[0];

      elTitle.addEventListener('click', self.Rename.start);
      elClose.addEventListener('click', self.onCloseClick);
      elAppsContainer.dataset.scrollOffset = 0;

      el.addEventListener('animationend', function onAnimationEnd(e) {
        if (e.animationName === 'collection-hide') {
          el.style.display = 'none';
        }
      });

      el.addEventListener('animationstart', function onAnimationStart(e) {
        if (e.animationName === 'collection-show') {
          el.style.display = 'block';
        }
      });

      Evme.EventHandler.trigger(NAME, 'init');
    };

    this.Rename = {
      start: function renameStart() {
        if (self.isRenaming) {
          return;
        }

        var currentTitle = elTitle.querySelector('.actual').textContent,
            elInput, elDone;

        el.classList.add(CLASS_WHEN_EDITING_NAME);

        elTitle.innerHTML = '<input type="text" ' +
                                    'autocorrect="off" ' +
                                    'autocapitalize="off" ' +
                                    'x-inputmode="verbatim" />' +
                            '<b class="done"></b>';

        elInput = elTitle.querySelector('input');
        elDone = elTitle.querySelector('.done');

        elInput.focus();
        elInput.value = currentTitle;

        elInput.addEventListener('blur', self.Rename.cancel);
        elInput.addEventListener('keyup', self.Rename.onKeyUp);
        elDone.addEventListener('touchstart', self.Rename.save);
  
        elTitle.removeEventListener('click', self.Rename.start);

        self.isRenaming = true;
      },

      onKeyUp: function onRenameKeyUp(e) {
        if (e.keyCode === 13) {
          self.Rename.save();
        }
      },

      save: function renameSave(e) {
        e && e.preventDefault();
        self.Rename.done(true);
      },

      cancel: function renameCancel() {
        self.Rename.done(false);
      },

      done: function renameDone(shouldSave) {
        if (!self.isRenaming) {
          return;
        }

        var elInput = elTitle.querySelector('input'),
            elDone =  elTitle.querySelector('.done'),
            id = currentSettings.id,
            oldName = EvmeManager.getIconName(id) || currentSettings.query,
            newName = elInput.value,
            nameChanged = newName && newName !== oldName;

        elInput.removeEventListener('blur', self.Rename.cancel);
        elInput.removeEventListener('keyup', self.Rename.onKeyUp);
        elDone.removeEventListener('touchstart', self.Rename.save);

        elInput.blur();

        if (shouldSave && nameChanged) {
          self.update(currentSettings, {
            'experienceId': null,
            'query': newName
          }, function onUpdate(updatedSettings) {
            self.setTitle(newName);

            EvmeManager.setIconName(newName, id);

            Evme.EventHandler.trigger(NAME, 'rename', {
              'id': id,
              'newName': newName
            });
          });
        } else {
          self.setTitle(oldName);
        }

        el.classList.remove(CLASS_WHEN_EDITING_NAME);

        self.isRenaming = false;

        // timeout(0) because this done function can be called from input blur
        // if we add the event back immediately it still fires, thus keeping
        // the user in the rename mode
        window.setTimeout(function() {
          elTitle.addEventListener('click', self.Rename.start);
        }, 0);
      },
    };

    this.onCloseClick = function onCloseClick() {
      self.hide();
    };

    this.create = function create(options) {
      var query = options.query,
          apps = options.apps,
          gridPosition = options.gridPosition,
          callback = options.callback || Evme.Utils.NOOP,
          extra = {'extraIconsData': options.extraIconsData};

      if (query) {
        Evme.CollectionSettings.createByQuery(query, extra, function onCreate(collectionSettings) {
          addToGrid(collectionSettings, gridPosition, {
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
      var pluck = Evme.Utils.pluck;
      var shouldUpdateIcon = false;
      var numIcons = Evme.Config.numberOfAppInCollectionIcon;

      var originalIcons = pluck(collectionSettings.extraIconsData, 'icon'),
          originalAppIds = pluck(collectionSettings.apps, 'id');

      Evme.CollectionSettings.update(collectionSettings, data, function onUpdate(updatedSettings){
        // collection is open and apps changed
        if (currentSettings && currentSettings.id === collectionSettings.id && 'apps' in data) {
          resultsManager.renderStaticApps(updatedSettings.apps);
        }

        callback(updatedSettings);

        // update the homescreen icon when necessary

        // first 3 apps changed
        if (!shouldUpdateIcon && 'apps' in data) {
          shouldUpdateIcon = !Evme.Utils.arraysEqual(originalAppIds,
                                pluck(updatedSettings.apps, 'id'), numIcons);
        }

        // cloud results changed and needed for icon (less than 3 static apps)
        if (!shouldUpdateIcon && 'extraIconsData' in data) {
          var numApps = ('apps' in data) ? data.apps.length : originalAppIds.length;;

          if (numApps < numIcons){
            shouldUpdateIcon = !Evme.Utils.arraysEqual(originalIcons,
                                pluck(updatedSettings.extraIconsData, 'icon'), numIcons);
          }
        }

        if (shouldUpdateIcon) {
          updateGridIconImage(updatedSettings);
        }
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

    // add installed app to collection by dropping an app into it
    this.addInstalledApp = function addInstalledApp(installedApp, collectionId) {
      Evme.CollectionStorage.get(collectionId, function onGotSettings(collectionSettings) {
        self.update(collectionSettings, {
          "apps": collectionSettings.apps.splice(0, 0, installedApp)
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
      var gridCollections = EvmeManager.getCollections();
      gridCollections.forEach(function populate(gridCollection) {
        Evme.CollectionStorage.get(gridCollection.id, populateCollection);
      });
    };

    this.show = function show(e) {
      var data = e.detail;
      Evme.CollectionStorage.get(data.id, function onGotFromStorage(collectionSettings) {
        currentSettings = collectionSettings;

        var id = el.dataset.id = collectionSettings.id;

        self.setTitle(EvmeManager.getIconName(id) || collectionSettings.query);
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

      if (self.isRenaming) {
        self.Rename.cancel();
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

      elTitle.innerHTML =
              '<em></em>' +
              '<span class="actual">' + title + '</span>' + ' ' +
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

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

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

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

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
      var query = currentSettings.query || '';

      if (!query && currentSettings.experienceId) {
        var l10nkey = 'id-' + Evme.Utils.shortcutIdToKey(currentSettings.experienceId);
        query = Evme.Utils.l10n('shortcut', l10nkey);
      }

      return query;
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
  };


  /**
   * The data required for displaying a collection
   * @param {Object} args
   */
  Evme.CollectionSettings = function Evme_CollectionSettings(args) {
    this.id = args.id;
    this.bg = args.bg || null;  // object containing backgound information (image, query, source, setByUser)

    // collection performs search by query or by experience
    this.query = args.query || '';
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
    var cleanData = {};

    // remove app duplicates
    if ('apps' in data) {
      cleanData.apps = Evme.Utils.unique(data.apps, 'id');
    }

    // check validity of extra icons
    if ('extraIconsData' in data) {
      var cleanExtraIconsData = data.extraIconsData.filter(function validData(iconData){
        return (iconData.id && iconData.icon);
      });

      if (cleanExtraIconsData.length === Evme.Config.numberOfAppInCollectionIcon) {
        cleanData.extraIconsData = cleanExtraIconsData;
      }
    }

    // everything else
    for (var prop in data) {
      if (prop === 'apps' || prop === 'extraIconsData') {
        continue;
      }

      cleanData[prop] = data[prop];
    }

    // if nothing to update
    if (Object.keys(cleanData).length === 0) {
      cb(settings);
    } else {
      Evme.CollectionStorage.update(settings, cleanData, cb);
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
      'experienceId': settings.experienceId
    });

    newApps = newApps.filter(function isNew(app) {
      return existingIds.indexOf(app.id) === -1;
    });

    if (newApps.length){
      Evme.Collection.update(settings, {"apps": newApps.concat(settings.apps)});
    }
  };

  /**
   * Add a collection to the homescreen.
   */
  function addToGrid(settings, gridPosition, extra) {
    createCollectionIcon(settings, function onIconCreated(canvas) {
      EvmeManager.addGridItem({
        'id': settings.id,
        'originUrl': settings.id,
        'name': settings.name,
        'icon': canvas.toDataURL(),
        'isCollection': true,
        'gridPosition': gridPosition
      }, extra);
    });
  }

  /**
   * Update a collection's icon on the homescreen
   */
  function updateGridIconImage(settings) {
    createCollectionIcon(settings, function iconCreated(iconCanvas) {
      EvmeManager.setIconImage(iconCanvas.toDataURL(), settings.id);
    });
  }

  function createCollectionIcon(settings, callback) {
    var icons = Evme.Utils.pluck(settings.apps, 'icon');

    if (icons.length < Evme.Config.numberOfAppInCollectionIcon) {
      var extraIcons = Evme.Utils.pluck(settings.extraIconsData, 'icon');
      icons = icons.concat(extraIcons).slice(0, Evme.Config.numberOfAppInCollectionIcon);
    }

    Evme.IconGroup.get(icons, function onIconCreated(iconCanvas) {
      callback(iconCanvas);
    });
  }

  /**
   * CollectionStorage
   * Persists collection settings to local storage
   *
   */
  Evme.CollectionStorage = new function Evme_CollectionStorage() {
    var NAME = 'CollectionStorage',
        PREFIX = 'collectionsettings_',
        self = this;

    this.init = function init() {
      window.addEventListener('collectionUninstalled', onCollectionUninstalled);
    };

    this.remove = function remove(collectionId) {
      Evme.Storage.remove(PREFIX + collectionId);
    };

    this.add = function add(settings, cb=Evme.Utils.NOOP) {
      if (!settings.id) return;

      Evme.Storage.set(PREFIX + settings.id, settings, function onSet() {
        cb(settings);
      });
    };

    this.update = function update(settings, data, cb) {
      for (var prop in data) {
        settings[prop] = data[prop];
      }
      self.add(settings, cb);
    };

    this.get = function get(settingsId, cb=Evme.Utils.NOOP) {
      Evme.Storage.get(PREFIX + settingsId, function onGet(storedSettings) {
        if (storedSettings !== null) {
          var settings = new Evme.CollectionSettings(storedSettings);
          cb(settings);
        }
      });
    };

    function onCollectionUninstalled(e) {
      var collectionId = e.detail.collection.id;
      self.remove(collectionId);
    }
  };

}();
