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
        elHeader = null,
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

      elHeader = Evme.$('.header', el)[0];
      elTitle = Evme.$('.title', el)[0];
      elImage = Evme.$('.image', el)[0];
      elClose = Evme.$('.close', el)[0];

      elTitle.addEventListener('click', self.Rename.start);
      elClose.addEventListener('click', self.onCloseClick);
      elAppsContainer.dataset.scrollOffset = 0;

      depopulateAllCollections();

      // bind event listeners
      window.addEventListener('collectionlaunch', self.show);
      window.addEventListener('collectiondropapp', onAppDrop);
      window.addEventListener('appAddedToQueryIndex', onAppIndexed);
      window.addEventListener('appUninstalled', onAppUninstall);

      Evme.EventHandler.trigger(NAME, 'init');
    };

    this.Rename = {
      start: function renameStart() {
        if (self.isRenaming) {
          return;
        }

        var currentTitle = title,
            elInput, elDone;

        el.classList.add(CLASS_WHEN_EDITING_NAME);

        elTitle.innerHTML = '<input type="text" ' +
                                    'autocorrect="off" ' +
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
        var elInput = elTitle.querySelector('input'),
            elDone = elTitle.querySelector('.done');

        // weird UI state. see bug 975917
        if (!(self.isRenaming && currentSettings && elInput && elDone)) {
          elInput && elInput.blur();
          exitDoneState();
          return;
        }

        var id = currentSettings.id,
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

        exitDoneState();

        function exitDoneState() {
          el.classList.remove(CLASS_WHEN_EDITING_NAME);

          self.isRenaming = false;

          // timeout(0) because this done function can be called from input blur
          // if we add the event back immediately it still fires, thus keeping
          // the user in the rename mode
          window.setTimeout(function() {
            elTitle.addEventListener('click', self.Rename.start);
          }, 0);
        }
      }
    };

    this.onCloseClick = function onCloseClick() {
      self.hide();
    };

    this.create = function create(options) {
      var query = options.query,
          apps = options.apps,
          callback = options.callback || Evme.Utils.NOOP,
          extra = {'extraIconsData': options.extraIconsData};

      if (query) {
        Evme.CollectionSettings.createByQuery(query, extra,
          function onCreate(collectionSettings) {
            addToGrid(collectionSettings, options.gridPageOffset, {
              'callback': function onAddedToHomescreen() {
                callback(collectionSettings);
              }
            });
          });
      }
    };

    this.remove = function removeCollection(id, params) {
      params = params || {};

      EvmeManager.removeGridItem({
        'id': id,
        'onConfirm': function onConfirm() {
          Evme.CollectionStorage.remove(id);
          params.callback && params.callback();
        }
      });
    };

    /**
     * Overwrite a collection's settings with new data
     * and update the homescreen icon if needed.
     */
    this.update = function update(collectionSettings, data, callback, extra) {
      callback = callback || Evme.Utils.NOOP;
      extra = extra || {};

      var pluck = Evme.Utils.pluck;
      var shouldUpdateIcon = false;
      var numIcons = Evme.Config.numberOfAppInCollectionIcon;

      var originalIcons = pluck(collectionSettings.extraIconsData, 'icon'),
          originalAppIds = pluck(collectionSettings.apps, 'id');

      Evme.CollectionSettings.update(collectionSettings, data,
        function onUpdate(updatedSettings) {
          // updating the currently open collection
          if (currentSettings && currentSettings.id === collectionSettings.id) {
            currentSettings = updatedSettings;

            // repaint static apps if collection is open and apps changed
            // noRepaint flags to override this behavior in case the caller
            // already handles repaint (like 'moveApp' does)
            if (!extra.noRepaint && 'apps' in data) {
              resultsManager.renderStaticApps(updatedSettings.apps);
            }
          }

          callback(updatedSettings);

          // update the homescreen icon when necessary

          // first 3 apps changed
          if (!shouldUpdateIcon && 'apps' in data) {
            shouldUpdateIcon = !Evme.Utils.arraysEqual(originalAppIds,
              pluck(updatedSettings.apps, 'id'), numIcons);
          }

          // cloud results changed and needed for icon
          // (less than 3 static apps)
          if (!shouldUpdateIcon && 'extraIconsData' in data) {
            var numApps =
              ('apps' in data) ? data.apps.length : originalAppIds.length;

            if (numApps < numIcons) {
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

      // add some properties we will use when rendering a CloudAppResult
      // see StaticApps.js@render
      cloudAppData.staticType = Evme.STATIC_APP_TYPE.CLOUD;
      cloudAppData.collectionQuery = currentSettings.query;

      self.update(currentSettings, {
        'apps': currentSettings.apps.concat(cloudAppData)
      });
    };

    // add installed app to collection by dropping an app into it
    this.addInstalledApp =
      function addInstalledApp(installedApp, collectionId, collectionSettings) {
        // caller was kind enough to pass the settings
        if (collectionSettings) {
          prependApp(installedApp, collectionSettings);
        }
        // get the settings from storage
        else {
          Evme.CollectionStorage.get(collectionId,
            function onGotSettings(collectionSettings) {
              prependApp(installedApp, collectionSettings);
            });
        }

        function prependApp(app, settings) {
          var apps = settings.apps.slice();
          apps.splice(0, 0, app);
          self.update(settings, {'apps': apps});
        }
      };

    // remove app from the open collection
    this.removeApp = function removeApp(id) {
      var apps = currentSettings.apps.filter(function keepIt(app) {
        return app.id !== id;
      });

      if (apps.length < currentSettings.apps.length) {
        self.update(currentSettings, {'apps': apps});
      }
    };

    // organize static apps in current open collection
    // move app to new index
    this.moveApp = function moveApp(appId, newIdx) {
      var oldIdx = Evme.Utils.pluck(currentSettings.apps, 'id').indexOf(appId);
      if (oldIdx > -1) {
        var orderedApps = currentSettings.apps.slice();
        orderedApps.splice(oldIdx, 1);
        orderedApps.splice(newIdx, 0, currentSettings.apps[oldIdx]);
        self.update(currentSettings, {'apps': orderedApps}, undefined, {
          'noRepaint': true
        });
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

    // populate collections when query index is ready
    // run only once as part of initial setup
    this.onQueryIndexUpdated = function onQueryIndexUpdated() {
      var collectionsPopulatedKey = 'collections-initial-populate';
      Evme.Storage.get(collectionsPopulatedKey, function populate(didPopulate) {
        if (didPopulate) {
          return;
        }

        Evme.Storage.set(collectionsPopulatedKey, true);
        populateAllCollections();
      });
    };

    this.show = function show(e) {
      var data = e.detail;
      Evme.CollectionStorage.get(data.id,
        function onGotFromStorage(collectionSettings) {
          currentSettings = collectionSettings;

          var id = el.dataset.id = collectionSettings.id;

          self.setTitle(EvmeManager.getIconName(id) ||
                                                   collectionSettings.query);
          collectionSettings.bg && self.setBackground(collectionSettings.bg);

          self.editMode = false;

          resultsManager.renderStaticApps(collectionSettings.apps);

          showUI();
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

      hideUI();

      return true;
    };

    function showUI() {
      el.style.display = 'block';
      window.setTimeout(function() {
        el.addEventListener('transitionend', function end(e) {
          e.target.removeEventListener('transitionend', end);
          document.dispatchEvent(new CustomEvent('collectionopened'));
        });
        el.classList.add('visible');
        Evme.EventHandler.trigger(NAME, 'show');
      }, 0);
    }

    function hideUI() {
      elHeader.addEventListener('transitionend', function end(e) {
        e.target.removeEventListener('transitionend', end);

        el.style.display = 'none';
        Evme.EventHandler.trigger(NAME, 'hide');
      });

      el.classList.remove('visible');
    }

    this.isOpen = function isOpen() {
      return currentSettings !== null;
    };

    this.setTitle = function setTitle(newTitle) {
      title = newTitle;

      elTitle.innerHTML =
              '<em></em>' +
              '<span>' + title + '</span>';
    };

    this.setBackground = function setBackground(newBg) {
      if (!currentSettings) { return; }

      self.clearBackground();

      elImage.style.backgroundImage = 'url(' + newBg.image + ')';

      elImageFullscreen =
        Evme.BackgroundImage.getFullscreenElement(newBg, self.hideFullscreen);
      el.appendChild(elImageFullscreen);

      self.update(currentSettings, {'bg': newBg});

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
      return currentSettings.getQuery();
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

      // disable bg scroll feature when in edit mode
      resultsManager.changeFadeOnScroll(!bool);
      return true;
    };

    function onVisibilityChange() {
      if (document.mozHidden) {
        self.toggleEditMode(false);
      }
    }

    function onAppDrop(e) {
        var options = e.detail;

        if (options.descriptor && options.collection) {
            var appInfo = EvmeManager.getAppByDescriptor(options.descriptor);
            self.addInstalledApp(appInfo, options.collection.id);
        }
    }

    // executed when a new installed app is added to query index
    function onAppIndexed(e) {
      var appInfo = e.detail.appInfo;
      var queries = Evme.InstalledAppsService.getMatchingQueries(appInfo);
      var gridCollections = EvmeManager.getCollections();

      for (var i = 0, gridCollection; gridCollection = gridCollections[i++];) {
        nominateApp(gridCollection, appInfo, queries);
      }
    }

    function onAppUninstall(e) {
      var gridCollections = EvmeManager.getCollections();

      for (var i = 0, gridCollection; gridCollection = gridCollections[i++];) {
        Evme.CollectionStorage.get(gridCollection.id,
          function removeApp(settings) {
            uninstallFromCollection(settings, e.detail.descriptor);
          });
      }
    }

    /**
     * Add an app to collection if any of the queries associated with the app
     * match the collection's name/query/experience
     */
    function nominateApp(gridCollection, appInfo, queries) {
      var collectionName = EvmeManager.getIconName(gridCollection.id);

      // first match against the collection's name (easier)
      if (collectionName &&
          queries.indexOf(collectionName.toLowerCase()) > -1) {
        self.addInstalledApp(appInfo, gridCollection.id);
      } else {
        // get the collection's settings from storage
        Evme.CollectionStorage.get(gridCollection.id, function onGet(settings) {
          var collectionQuery = settings.getQuery();

          if (collectionQuery &&
              queries.indexOf(collectionQuery.toLowerCase()) > -1) {
            self.addInstalledApp(appInfo, gridCollection.id, settings);
          }
        });
      }
    }
  };


  /**
   * The data required for displaying a collection
   * @param {Object} args
   */
  Evme.CollectionSettings = function Evme_CollectionSettings(args) {
    this.id = args.id;

    // object containing backgound information (image, query, source, setByUser)
    this.bg = args.bg || null;

    // collection performs search by query or by experience
    this.query = args.query || '';
    this.experienceId = args.experienceId;

    this.apps = args.apps || [];

    // TODO save only reference, get data from IconManager
    // get static apps' icons from InstalledAppsService
    // list of {"id": 3, "icon": "base64icon"}
    this.extraIconsData = [];
    if (args.extraIconsData) {
      for (var i = 0, iconData; iconData = args.extraIconsData[i++]; ) {
        if (iconData.id && iconData.icon) {
          this.extraIconsData.push(iconData);
        }
      }
    }
  };
  Evme.CollectionSettings.prototype.getQuery = function getQuery() {
    // for user-created collections
    // match against the query
    var query = this.query || EvmeManager.getIconName(this.id) || '';

    // for pre-installed collections
    // translate the experienceId to query
    if (!query && this.experienceId) {
      var l10nkey = 'id-' +
        Evme.Utils.shortcutIdToKey(this.experienceId);
      query = Evme.Utils.l10n('shortcut', l10nkey);
    }

    return query;
  };

  /**
   * Create a settings object from a query
   * param  {String}   query
   * param  {Object}   extra={}
   * param  {Function} cb=Evme.Utils.NOOP
   */
  Evme.CollectionSettings.createByQuery =
    function createByQuery(query, extra={}, cb=Evme.Utils.NOOP) {
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
   * you should probably NOT call this method directly,
   * but use Collection.update instead
   */
  Evme.CollectionSettings.update = function update(settings, data, cb) {
    var cleanData = {};

    // remove app duplicates
    if ('apps' in data) {
      cleanData.apps = Evme.Utils.unique(data.apps, 'id');

      // cloudapps: convert ids to strings
      for (var k = 0, app; app = cleanData.apps[k++]; ) {
        if (typeof app.id === 'number') {
          app.id = '' + app.id;
        }
      }
    }

    // check validity of extra icons
    if ('extraIconsData' in data) {
      var cleanExtraIconsData =
        data.extraIconsData.filter(function validData(iconData) {
          return (iconData.id && iconData.icon);
        });

      if (cleanExtraIconsData.length ===
          Evme.Config.numberOfAppInCollectionIcon) {
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

  /**
   * Add installed apps to a collection
   */
  function populateCollection(settings) {
    var existingIds = Evme.Utils.pluck(settings.apps, 'id');

    var newApps = Evme.InstalledAppsService.getMatchingApps({
      'query': settings.getQuery()
    });

    newApps = newApps.filter(function isNew(app) {
      return existingIds.indexOf(app.id) === -1;
    });

    if (newApps.length) {
      Evme.Collection.update(settings, {'apps': newApps.concat(settings.apps)});
    }
  }

  /**
   * Add installed apps to collections with matching query
   */
  function populateAllCollections() {
    var gridCollections = EvmeManager.getCollections();
    for (var i = 0, gridCollection; gridCollection = gridCollections[i++];) {
      Evme.CollectionStorage.get(gridCollection.id, populateCollection);
    }
  }

  /**
   * Remove missing apps from collection
   * Apps may have been un-installed when E.me was not running
   */
  function depopulateCollection(settings) {
    var apps = settings.apps.filter(function exists(app) {
      // never remove cloud apps that were pinned to the collection
      if (app.staticType === Evme.STATIC_APP_TYPE.CLOUD) {
        return true;
      } else {
        // remove if app does not exist on grid
        return (EvmeManager.getIconByDescriptor(app) ? true : false);
      }
    });

    if (apps.length < settings.apps.length) {
      Evme.Collection.update(settings, {'apps': apps});
    }
  }

  function depopulateAllCollections() {
    var gridCollections = EvmeManager.getCollections();
    for (var i = 0, gridCollection; gridCollection = gridCollections[i++];) {
      Evme.CollectionStorage.get(gridCollection.id,
        function depopulate(settings) {
          depopulateCollection(settings);
        });
    }
  }

  /**
   * Remove instances of an un-installed app from a collection
   * @param  {Evme.CollectionSettings} settings
   * @param  {Object}                  descriptor of the un-installed app
   */
  function uninstallFromCollection(settings, descriptor) {
    var apps = settings.apps.filter(function keep(app) {
      // skip pinned cloud apps since it can not be un-installed
      if (app.staticType === Evme.STATIC_APP_TYPE.CLOUD) {
        return true;
      }

      // remove bookmarks
      var remove = descriptor.bookmarkURL &&
                    app.id === descriptor.bookmarkURL;

      // remove all entry points of descriptor
      remove = remove || (descriptor.manifestURL &&
                app.id.indexOf(descriptor.manifestURL) === 0);

      return !remove;
    });

    if (apps.length < settings.apps.length) {
      Evme.Collection.update(settings, {'apps': apps});
    }
  }

  /**
   * Add a collection to the homescreen.
   */
  function addToGrid(settings, gridPageOffset, extra) {
    createCollectionIcon(settings, function onIconCreated(canvas) {
      EvmeManager.addGridItem({
        'id': settings.id,
        'originUrl': settings.id,
        'name': settings.query,
        'icon': canvas.toDataURL(),
        'isCollection': true,
        'gridPageOffset': gridPageOffset
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
      icons = icons.concat(extraIcons).slice(0,
                                      Evme.Config.numberOfAppInCollectionIcon);
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
      if (!settings.id) { return; }

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
