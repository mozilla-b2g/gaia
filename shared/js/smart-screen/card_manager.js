/* global evt, SharedUtils, Promise, PipedPromise, Application, CardStore,
        Deck, Folder, AsyncSemaphore */

(function(exports) {
  'use strict';

  var CardManager = function() {
  };

  CardManager.STATES = Object.freeze({
    'READY': 'READY',
    'SYNCING': 'SYNCING'
  });

  CardManager.prototype = evt({
    HIDDEN_ROLES: ['system', 'homescreen', 'addon', 'langpack'],

    // Only two modes available: readonly and readwrite (default)
    // 'readwrite' mode is for Smart-Home app only
    // This '_mode' variable only affects CardStore.
    _mode: 'readwrite',

    _manifestURLOfCardStore: undefined,

    _cardStore: undefined,

    _cardList: [],

    installedApps: {},

    _asyncSemaphore: undefined,

    _isHiddenApp: function cm_isHiddenApp(role) {
      if (!role) {
        return false;
      }
      return (this.HIDDEN_ROLES.indexOf(role) !== -1);
    },

    _isCardListLoaded: function cm_isCardListLoaded() {
      return this._cardList && this._cardList.length > 0;
    },

    _serializeCard: function cm_serializeCard(card) {
      return card && card.serialize();
    },

    _deserializeCardEntry: function cm_deserializeCardEntry(cardEntry) {
      var cardInstance;
      switch (cardEntry.type) {
        case 'AppBookmark':
        case 'Application':
          cardInstance = Application.deserialize(cardEntry, this.installedApps);
          break;
        case 'Deck':
          cardInstance = Deck.deserialize(cardEntry, this.installedApps);
          break;
        case 'Folder':
          cardInstance = Folder.deserialize(cardEntry);
          // Save the folder into card store whenever we receives
          // folder-changed event
          cardInstance.on('folder-changed', this._onFolderChange.bind(this));
          break;
      }
      return cardInstance;
    },

    writeFolderInCardStore: function cm_writeFolderInCardStore(folder) {
      var that = this;
      return new Promise(function(resolve, reject) {
        if (folder instanceof Folder && folder.isNotEmpty()) {
          that._asyncSemaphore.v();
          var cardEntriesInFolder =
            folder.getCardList().map(that._serializeCard.bind(that));
          that._cardStore.saveData(folder.folderId,
            cardEntriesInFolder).then(function() {
              folder.state = Folder.STATES.NORMAL;
            }).then(function() {
              that._asyncSemaphore.p();
              resolve();
            }, reject);
        } else {
          reject();
        }
      });
    },

    // XXX: Call this function when you need to write cardList back to datastore
    // Because when we write cardList to datastore, we need to seperate
    // first level cards and cards under folder into sperated records in
    // datastore. A better way whould pull out logic related to cardList
    // into a standalone module. We will do this later.
    writeCardlistInCardStore: function cm_writeCardlistInCardStore(options) {
      var that = this;
      var emptyFolderIndices = [];
      return new Promise(function(resolve, reject) {
        var saveDataPromises = [];
        var newCardList;
        that._asyncSemaphore.v();
        // The cards inside of folder are not saved nested in cardList
        // but we explicit save them under key of folderId.
        // Here we save content of each folder one by one
        newCardList = that._cardList.filter(function(card, index) {
          if (card instanceof Folder) {
            if (card.getCardList().length > 0) {
              saveDataPromises.push(that.writeFolderInCardStore(card));
            } else {
              emptyFolderIndices.push(index);
              return false;
            }
          }
          return true;
        });
        if (options && options.cleanEmptyFolder) {
          that._cardList = newCardList;
        }
        Promise.all(saveDataPromises).then(function() {
          resolve();
        });
      }).then(function() {
         var cardEntries =
           that._cardList.map(that._serializeCard.bind(that));
        return that._cardStore.saveData('cardList', cardEntries);
      }).then(function() {
        that._asyncSemaphore.p();
        if (options && options.cleanEmptyFolder) {
          that.fire('card-removed', emptyFolderIndices);
        }
      }).catch(function() {
        that._asyncSemaphore.p();
      });
    },

    _loadDefaultCardList: function cm_loadDefaultCardList() {
      var that = this;
      return this._getPipedPromise('_loadDefaultCardList',
        function(resolve, reject) {
          var defaultCardListFile = 'shared/resources/default-cards.json';
          that._asyncSemaphore.v();
          that._loadFile({
            url: defaultCardListFile,
            responseType: 'json'
          }).then(function onFulfill(config) {
            that._cardList =
              config.card_list.map(function(cardEntry) {
                var card = that._deserializeCardEntry(cardEntry);
                if (card instanceof Folder && card.isDeserializing()) {
                  card.loadCardsInFolder({
                    from: 'config',
                    cardEntry: cardEntry,
                    deserializer: that._deserializeCardEntry.bind(that)
                  });
                }
                return card;
              });
            // write cardList into data store for the first time
            that.writeCardlistInCardStore().then(resolve, reject);
          }).then(function() {
            that._asyncSemaphore.p();
          }).catch(function onReject(error) {
            var reason ='request ' + defaultCardListFile +
              ' got reject ' + error;
            that._asyncSemaphore.p();
            reject(reason);
          });
        });
    },

    _onCardStoreChange: function cm_onCardStoreChange(evt) {
      var that = this;
      if (evt.operation === 'updated') {
        that._asyncSemaphore.v();
        // When we receives 'cardlist-changed' in readonly mode, it means
        // Smart-Home app has change cardList. We'd better re-fetch cardList
        // as a whole.
        if (this._mode === 'readonly') {
          this._cardList = [];
        }
        this._reloadCardList().then(function() {
          that._asyncSemaphore.p();
          that.fire('cardlist-changed');
        });
      }
    },

    _onFolderChange: function cm_onFolderChange(folder) {
      if (folder.isDetached()) {
        this.writeCardlistInCardStore();
      } else if (folder.isEmpty()) {
        this.writeCardlistInCardStore({cleanEmptyFolder: true});
      } else {
        this.writeFolderInCardStore(folder);
      }
    },

    _initCardStoreIfNeeded: function cm_initCardStore() {
      if (!this._cardStore) {
        this._cardStore =
          new CardStore(this._mode, this._manifestURLOfCardStore);
        this._cardStore.on('change', this._onCardStoreChange.bind(this));
      }
    },

    // XXX: DO NOT call this directly except for _reloadCardList.
    // Because it is not protected by AsyncSemaphore. We should change it as
    // returning a `Promise`
    _loadCardListFromCardStore:
      function cm_loadCardListFromCardStore(cardListFromCardStore) {
        var that = this;
        cardListFromCardStore.forEach(function(cardEntry) {
          var found = that.findCardFromCardList({cardEntry: cardEntry});
          if (!found) {
            var card = that._deserializeCardEntry(cardEntry);
            // The cards inside of folder are not saved nested in
            // datastore 'cardList'. But we explicit save them under key
            // of folderId. So we need to retrieve them by their folderId
            // and put them back to folders where they belong.
            if (card instanceof Folder && card.isDeserializing()) {
              card.loadCardsInFolder({
                from: 'datastore',
                datastore: that._cardStore,
                deserializer: that._deserializeCardEntry.bind(that)
              });
            }
            that._cardList.push(card);
          }
        });
      },

    _reloadCardList: function cm_loadCardList() {
      var that = this;
      return this._getPipedPromise('_reloadCardList',
        function(resolve, reject) {
          that._asyncSemaphore.v();
          that._initCardStoreIfNeeded();
          resolve(that._cardStore.getData('cardList'));
        }).then(function(cardListFromCardStore) {
          if (cardListFromCardStore) {
            // XXX: Change _loadCardListFromCardStore as returning a `Promise`
            that._loadCardListFromCardStore(cardListFromCardStore);
          } else {
            // no cardList in datastore, load default from config file
            return Promise.resolve(that._loadDefaultCardList());
          }
        }).then(function() {
          that._asyncSemaphore.p();
        }).catch(function(reason) {
          console.warn('Unable to reload cardList due to ' + reason);
          that._asyncSemaphore.p();
        });
    },

    _loadFile: function cm_loadIcon(request) {
      // _loadFile could accept reentrance, so it should return
      // new Promise on each invokation
      return new Promise(function(resolve, reject) {
        var url = request.url;
        var responseType = request.responseType || 'text';
        if (typeof url === 'string') {
          try {
            var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
            xhr.open('GET', url, true);
            xhr.responseType = responseType;
            xhr.onload = function onload(evt) {
              if (xhr.status !== 0 && xhr.status !== 200) {
                reject(xhr.statusText);
              } else {
                resolve(xhr.response);
              }
            };
            xhr.ontimeout = xhr.onerror = function onErrorOrTimeout() {
              reject();
            };
            xhr.send();
          } catch (e) {
            reject(e.message);
          }
        } else {
          reject('invalid request');
        }
      });
    },

    _bestMatchingIcon:
      function cm_bestMatchingIcon(app, manifest, preferredSize) {
      var max = 0;
      var closestSize = 0;
      preferredSize = preferredSize || Number.MAX_VALUE;

      for (var size in manifest.icons) {
        size = parseInt(size, 10);
        if (size > max) {
          max = size;
        }
        if (!closestSize && size >= preferredSize) {
          closestSize = size;
        }
      }

      if (!closestSize) {
        closestSize = max;
      }

      var url = manifest.icons[closestSize];
      if (!url) {
        return;
      }
      if (url.indexOf('data:') === 0 ||
          url.indexOf('app://') === 0 ||
          url.indexOf('http://') === 0 ||
          url.indexOf('https://') === 0) {
        return url;
      }
      if (url.charAt(0) != '/') {
        console.warn('`' + manifest.name + '` app icon is invalid. ' +
                     'Manifest `icons` attribute should contain URLs -or- ' +
                     'absolute paths from the origin field.');
        return '';
      }

      if (app.origin.slice(-1) === '/') {
        return app.origin.slice(0, -1) + url;
      }

      return [app.origin + url, closestSize];
    },

    _onAppInstall: function cm_onAppInstall(evt) {
      var app = evt.application;
      var manifest = app.manifest || app.updateManifest;
      if (!app.launch || !manifest || !manifest.icons ||
          this._isHiddenApp(manifest.role)) {
        return;
      }

      var message =
        this.installedApps[app.manifestURL] ? 'update' : 'install';
      this.installedApps[app.manifestURL] = app;
      this.fire(message, this.getAppEntries(app.manifestURL));
    },

    _onAppUninstall: function cm_onAppUninstall(evt) {
      var app = evt.application;
      if (this.installedApps[app.manifestURL]) {
        delete this.installedApps[app.manifestURL];
        this.fire('uninstall', this.getAppEntries(app.manifestURL));
      }
    },

    insertNewFolder: function cm_insertFolder(name, index) {
      var newFolder = new Folder({
        name: name,
        state: Folder.STATES.DETACHED
      });

      this._asyncSemaphore.wait(function() {
        if (typeof index !== 'number') {
          index = this._cardList.length;
        }
        this._cardList.splice(index, 0, newFolder);
        // Notice that we are not saving card list yet
        // Because newFolder is empty, it is meaningless to save it
        // But we need to hook `folder-changed` event handler in case
        // we need to save it when its content changed
        newFolder.on('folder-changed', this._onFolderChange.bind(this));
        this.fire('card-inserted', newFolder, index);
      }, this);

      return newFolder;
    },

    insertCard: function cm_insertCard(options) {
      var that = this;
      this._asyncSemaphore.wait(function() {
        var newCard = this._deserializeCardEntry(options.cardEntry);
        var position;

        // prevent same card from being inserted twice
        if (newCard && newCard.nativeApp) {
          var sameCardExisting = that.findCardFromCardList({
            manifestURL: newCard.nativeApp.manifestURL,
            launchURL: newCard.launchURL
          });
          if (sameCardExisting) {
            return;
          }
        }

        if (options.index === 'number') {
          position = options.index;
        } else if (!newCard.group) {
          position = this._cardList.length;
        } else {
          // If the given card belongs to a deck (has type), we assume the deck
          // spans a group with all its bookmarks following deck icon itself,
          // and the given card should be put at the end of the group.
          position = -1;
          for(var idx = 0; idx < this._cardList.length; idx++) {
            var card = this._cardList[idx];
            if(position === -1 && !(card instanceof Deck)) {
              // Only Decks are admitted as the start of the group.
              continue;
            } else if (position !== -1 && card.group !== newCard.group) {
              // We've exceeded the end of the group.
              break;
            } else if (card.group === newCard.group) {
              // We're still inside the group.
              position = idx;
            }
          }
          position += 1;
          // No corresponding deck found; insert at bottom.
          if (position === 0) {
            position = this._cardList.length;
          }
        }

        this._cardList.splice(position, 0, newCard);
        this.writeCardlistInCardStore().then(function() {
          that.fire('card-inserted', newCard, position);
        });
      }, this);
    },

    removeCard: function cm_removeCard(item) {
      this._asyncSemaphore.wait(function() {
        var that = this;
        var index =
          (typeof item === 'number') ? item : this._cardList.indexOf(item);

        if (index >= 0) {
          this._cardList.splice(index, 1);
          this.writeCardlistInCardStore().then(function() {
            that.fire('card-removed', [index]);
          });
        } else {
          // the card is not in _cardList, then it could probably be in folder
          this._cardList.forEach(function(card) {
            if (card instanceof Folder) {
              // don't bother to fire card-removed event because the folder
              // itself will fire this event
              card.removeCard(item);
            }
          });
        }
      }, this);
    },

    updateCard: function cm_updateCard(item, index) {
      var that = this;
      this._asyncSemaphore.wait(function() {
        if (typeof index === 'undefined') {
          index = this._cardList.findIndex(function(elem) {
            return elem.cardId === item.cardId;
          });
        }
        if (index >= 0) {
          // Most of the time, 'item' is directly reference to card in _cardList
          // and by the time we reach here, the card ('item') is already
          // updated. So don't bother to update it again.
          if (this._cardList[index] !== item) {
            this._cardList[index] = item;
          }
          this.writeCardlistInCardStore().then(function() {
            that.fire('card-updated', that._cardList[index], index);
          });
        }
      }, this);
    },

    swapCard: function cm_switchCard(item1, item2) {
      this._asyncSemaphore.wait(function() {
        var that = this;
        var idx1, idx2;
        idx1 = (typeof item1 === 'number') ?
          idx1 = item1 :
          this._cardList.indexOf(item1);
        idx2 = (typeof item2 === 'number') ?
          idx2 = item2 :
          this._cardList.indexOf(item2);
        var tmp = this._cardList[idx1];
        this._cardList[idx1] = this._cardList[idx2];
        this._cardList[idx2] = tmp;

        this.writeCardlistInCardStore().then(function() {
          that.fire('card-swapped',
                        that._cardList[idx1], that._cardList[idx2], idx1, idx2);
        });
      }, this);
    },

    init: function cm_init(mode) {
      var that = this;
      var appMgmt = navigator.mozApps.mgmt;

      this._asyncSemaphore = new AsyncSemaphore();
      // protect from async access to cardList
      this._asyncSemaphore.v();

      this._mode = mode || 'readwrite';
      // If we are running in readonly mode, we need to tell card store what
      // manifestURL of the datastore we are going to use, because we are not
      // using card store of current app.
      if (this._mode === 'readonly') {
        this._manifestURLOfCardStore =
         'app://smart-home.gaiamobile.org/manifest.webapp';
      }

      return this._getPipedPromise('init', function(resolve, reject) {
        var request = appMgmt.getAll();
        request.onsuccess = function onsuccess(event) {
          event.target.result.forEach(function eachApp(app) {
            var manifest = app.manifest;
            if (!app.launch || !manifest || !manifest.icons ||
                that._isHiddenApp(manifest.role)) {
              return;
            }
            that.installedApps[app.manifestURL] = app;
          });

          resolve(that._reloadCardList());
        };
        request.onerror = function() {
          reject();
          that._asyncSemaphore.p();
        };
        appMgmt.addEventListener('install', that);
        appMgmt.addEventListener('uninstall', that);
      }).then(function() {
        that._asyncSemaphore.p();
      });
    },

    uninit: function cm_uninit() {
      var appMgmt = navigator.mozApps.mgmt;
      appMgmt.removeEventListener('install', this);
      appMgmt.removeEventListener('uninstall', this);

      this._cardList = [];
      this._cardStore.off('change');
      this._cardStore = undefined;
      this.installedApps = {};
    },

    getAppEntries: function cm_getAppEntries(manifestURL) {
      if (!manifestURL || !this.installedApps[manifestURL]) {
        return [];
      }

      var manifest = this.installedApps[manifestURL].manifest ||
        this.installedApps[manifestURL].updateManifest;
      var entryPoints = manifest.entry_points;
      var entries = [];
      var removable = this.installedApps[manifestURL].removable;

      if (!entryPoints || manifest.type !== 'certified') {
        entries.push({
          manifestURL: manifestURL,
          entryPoint: '',
          name: manifest.name,
          removable: removable,
          type: 'Application'
        });
      } else {
        for (var entryPoint in entryPoints) {
          if (entryPoints[entryPoint].icons) {
            entries.push({
              manifestURL: manifestURL,
              entryPoint: entryPoint,
              name: entryPoints[entryPoint].name,
              removable: removable,
              type: 'Application'
            });
          }
        }
      }
      return entries;
    },

    getEntryManifest: function cm_getEntryManifest(manifestURL, entryPoint) {
      if (!manifestURL || !this.installedApps[manifestURL]) {
        return null;
      }

      var manifest = this.installedApps[manifestURL].manifest ||
        this.installedApps[manifestURL].updateManifest;

      if (entryPoint) {
        var entry_manifest = manifest.entry_points[entryPoint];
        return entry_manifest || null;
      }

      return manifest;
    },

    getIconBlob: function cm_getIconBlob(options) {
      var manifestURL = options.manifestURL;
      var entryPoint = options.entryPoint;
      var preferredSize = options.preferredSize;
      var that = this;
      return new Promise(function(resolve, reject) {
        var entry_manifest = that.getEntryManifest(manifestURL, entryPoint);
        if (!entry_manifest) {
          reject('No manifest');
        }

        var iconData = that._bestMatchingIcon(
          that.installedApps[manifestURL], entry_manifest, preferredSize);
        if (!iconData) {
          reject('No url');
          return;
        }

        that._loadFile({
          url: iconData[0],
          responseType: 'blob'
        }).then(function onFulfill(blob) {
          resolve([blob, iconData[1]]);
        }, function onReject(error) {
          reject('Error on loading blob of ' + manifestURL);
        });
      });
    },

    _getLocalizedName: function cm_getLocalizedName(manifestURL, lang) {
      if (!manifestURL || !lang) {
        return;
      }

      var manifest = this.getEntryManifest(manifestURL);
      var locales = manifest.locales;
      var localizedName = locales && locales[lang] &&
        (locales[lang].short_name || locales[lang].name);
      return localizedName || manifest.short_name || manifest.name;
    },

    // Resolve to one of the following forms:
    // 1. {raw: 'localized name'}
    // 2. {id: 'l10nid'}
    // 3. undefined
    resolveCardName: function cm_resolveCardName(card, lang) {
      var name;
      if (!card || !lang) {
        return name;
      }

      // Priority is:
      // 1. user given name
      // 2. localized application/deck name if it is an application/deck
      // 3. l10nId if any
      if (card.name && card.name.raw) {
        name = {
          raw: card.name.raw
        };
      } else if (card.nativeApp &&
          (card instanceof Application || card instanceof Deck)) {
        name = {
          raw: this._getLocalizedName(card.nativeApp.manifestURL, lang)
        };
      } else if (card.name && card.name.id) {
        name = card.name;
      }
      return name;
    },

    getCardList: function cm_getCardList() {
      var that = this;
      return this._getPipedPromise('getCardList', function(resolve, reject) {
        that._asyncSemaphore.wait(function() {
          resolve(that._reloadCardList());
        }, that);
      }).then(function() {
        return Promise.resolve(that._cardList);
      });
    },

    // TODO: need to be protected by semaphore
    // There are three types of query:
    // 1. query by cardId
    // 2. query by manifestURL and optionally launchURL
    // 3. query by cardEntry (i.e. serialized card)
    findCardFromCardList: function cm_findCardFromCardList(query) {
      var found;
      this._cardList.some(function(card) {
        if (card instanceof Folder) {
          // XXX: findCard() shares almost the same logic as
          // findCardFromCardList. We should consolidate them. See
          // http://bugzil.la/1156726
          found = card.findCard(query);
          if (found) {
            return true;
          }
        }

        if (card.cardId === query.cardId) {
          found = card;
          return true;
        } else if (query.manifestURL && card.nativeApp &&
            card.nativeApp.manifestURL === query.manifestURL) {

          // if we specify launchURL in query, then we must compare
          // launchURL first
          if (query.launchURL) {
            if (card.launchURL === query.launchURL) {
              found = card;
              return true;
            }
          } else {
            found = card;
            return true;
          }
        } else if (query.cardEntry) {
          // XXX: this could be bad at performance because we serialize card
          // in every loop. We might need improvement on this query.
          if (JSON.stringify(card.serialize()) ===
              JSON.stringify(query.cardEntry)) {
            found = card;
            return true;
          }
        }
      });
      return found;
    },

    isPinned: function cm_isPinned(options) {
      var that = this;
      return this._getPipedPromise('isPinned', function(resolve, reject) {
        that._asyncSemaphore.wait(function() {
          resolve(that._reloadCardList());
        }, that);
      }).then(function() {
        return Promise.resolve(!!that.findCardFromCardList(options));
      });
    },

    handleEvent: function cr_handleEvent(evt) {
      switch(evt.type) {
        case 'install':
          this._onAppInstall(evt);
          break;
        case 'uninstall':
          this._onAppUninstall(evt);
          break;
      }
    }
  });

  SharedUtils.addMixin(CardManager, new PipedPromise());

  exports.CardManager = CardManager;
}(window));
