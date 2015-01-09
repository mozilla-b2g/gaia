/* global evt, addMixin, Promise, PipedPromise, Application, CardStore,
        Deck, AppBookmark, Folder, uuid */

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

    // We have two states: READY and SYNCING. When we are in SYNCING mode, it
    // means either _cardList is out-dated or cardStore is out-dated. We need to
    // block anyone who try to access _cardList until cardManager turns back to
    // READY state.
    _state: CardManager.STATES.SYNCING,

    get state() {
      return this._state;
    },

    set state(to) {
      if (CardManager.STATES[to] && CardManager.STATES[to] !== this._state) {
        this._state = CardManager.STATES[to];
        this.fire('state-changed', this._state);
      }
    },

    isReady: function cr_isReady() {
      return this.state === CardManager.STATES.READY;
    },

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
        case 'Application':
          cardInstance = Application.deserialize(cardEntry, this.installedApps);
          break;
        case 'Deck':
          cardInstance = Deck.deserialize(cardEntry, this.installedApps);
          break;
        case 'AppBookmark':
          cardInstance = AppBookmark.deserialize(cardEntry, this.installedApps);
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
        if (folder instanceof Folder && folder.cardsInFolder.length > 0) {
          that.state = CardManager.STATES.SYNCING;
          var cardEntriesInFolder =
            folder.cardsInFolder.map(that._serializeCard.bind(that));
          that._cardStore.saveData(folder.folderId,
            cardEntriesInFolder).then(function() {
              folder.state = Folder.STATES.NORMAL;
            }).then(function() {
              that.state = CardManager.STATES.READY;
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
        that.state = CardManager.STATES.SYNCING;
        // The cards inside of folder are not saved nested in cardList
        // but we explicit save them under key of folderId.
        // Here we save content of each folder one by one
        newCardList = that._cardList.filter(function(card, index) {
          if (card instanceof Folder) {
            if (card.cardsInFolder.length > 0) {
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
        that.state = CardManager.STATES.READY;
        if (options && options.cleanEmptyFolder) {
          that.fire('card-removed', emptyFolderIndices);
        }
      });
    },

    _loadDefaultCardList: function cm_loadDefaultCardList() {
      var that = this;
      return this._getPipedPromise('_loadDefaultCardList',
        function(resolve, reject) {
          var defaultCardListFile = 'js/init.json';
          that._loadFile({
            url: defaultCardListFile,
            responseType: 'json'
          }).then(function onFulfill(config) {
            that._cardList =
              config.card_list.map(function(cardEntry) {
                var card = that._deserializeCardEntry(cardEntry);
                if (card instanceof Folder &&
                    card.state === Folder.STATES.DESERIALIZING) {
                  // to load content of folder from config file
                  card.cardsInFolder =
                    cardEntry.cardsInFolder.map(
                      that._deserializeCardEntry.bind(that));
                }
                return card;
              });
            // write cardList into data store for the first time
            that.writeCardlistInCardStore().then(resolve, reject);
          }, function onReject(error) {
            var reason ='request ' + defaultCardListFile +
              ' got reject ' + error;
            reject(reason);
          });
        });
    },

    _onCardStoreChange: function cm_onCardStoreChange(evt) {
      var that = this;
      if (evt.id === 'cardList' && evt.operation === 'updated') {
        this.state = CardManager.STATES.SYNCING;
        // When we receives 'cardlist-changed' in readonly mode, it means
        // Smart-Home app has change cardList. We'd better re-fetch cardList
        // as a whole.
        if (this._mode === 'readonly') {
          this._cardList = [];
        }
        this._reloadCardList().then(function() {
          that.state = CardManager.STATES.READY;
          that.fire('cardlist-changed');
        });
      }
    },

    _onFolderChange: function cm_onFolderChange(folder) {
      if (folder && folder.state === Folder.STATES.DETACHED) {
        this.writeCardlistInCardStore();
      } else {
        this.writeFolderInCardStore(folder);
      }
    },

    _reloadCardList: function cm_loadCardList() {
      var that = this;
      return this._getPipedPromise('_reloadCardList',
        function(resolve, reject) {
          // initialize card store if needed
          if (!that._cardStore) {
            that._cardStore =
              new CardStore(that._mode, that._manifestURLOfCardStore);
            that._cardStore.on('change', that._onCardStoreChange.bind(that));
          }
          that.state = CardManager.STATES.SYNCING;
          that._cardStore.getData('cardList').then(function(cardList) {
            if (cardList) {
              cardList.forEach(function(cardEntry) {
                var found = that.findCardFromCardList({cardEntry: cardEntry});
                if (!found) {
                  var card = that._deserializeCardEntry(cardEntry);
                  // The cards inside of folder are not saved nested in
                  // datastore 'cardList'. But we explicit save them under key
                  // of folderId. So we need to retrieve them by their folderId
                  // and put them back to folders where they belong.
                  if (card instanceof Folder &&
                      card.state === Folder.STATES.DESERIALIZING) {
                    // to load content of folder
                    that._cardStore.getData(card.folderId).then(
                      function(innerCardList) {
                        innerCardList.forEach(function(innerCardEntry) {
                          card.cardsInFolder.push(
                            that._deserializeCardEntry(innerCardEntry));
                        });
                      });
                  }
                  that._cardList.push(card);
                }
              });
              resolve();
            } else {
              // no cardList in datastore, load default from config file
              that._loadDefaultCardList().then(function() {
                resolve();
              }, reject);
            }
          }).then(function() {
            that.state = CardManager.STATES.READY;
          });
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
      if (!(typeof index === 'number')) {
        index = this._cardList.length;
      }
      this._cardList.splice(index, 0, newFolder);
      // Notice that we are not saving card list yet
      // Because newFolder is empty, it is meaningless to save it
      // But we need to hook `folder-changed` event handler in case
      // we need to save it when its content changed
      newFolder.on('folder-changed', this._onFolderChange.bind(this));
      this.fire('card-inserted', newFolder, index);
      return newFolder;
    },

    insertCard: function cm_insertCard(options) {
      var that = this;
      var card = this._deserializeCardEntry(options.cardEntry);
      var index = (typeof options.index === 'number') ?
        options.index : this._cardList.length;

      // TODO: If the given card belongs to an app, we assume the app spans a
      // pseudo group with all its bookmarks following app icon itself, and the
      // given card should be put at the end of the group.

      this._cardList.splice(index, 0, card);
      this.writeCardlistInCardStore().then(function() {
        that.fire('card-inserted', card, index);
      });
    },

    removeCard: function cm_removeCard(item) {
      var that = this;
      var index =
        (typeof item === 'number') ? item : this._cardList.indexOf(item);

      if (index >= 0) {
        this._cardList.splice(index, 1);
        this.writeCardlistInCardStore().then(function() {
          that.fire('card-removed', [index]);
        });
      }
    },

    swapCard: function cm_switchCard(item1, item2) {
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

      this.writeCardlistInCardStore();

      this.fire('card-swapped',
                        this._cardList[idx1], this._cardList[idx2], idx1, idx2);
    },

    init: function cm_init(mode) {
      var that = this;
      var appMgmt = navigator.mozApps.mgmt;
      this._mode = mode || 'readwrite';
      // If we are running in readonly mode, we need to tell card store what
      // manifestURL of the datastore we are going to use, because we are not
      // using card store of current app.
      if (this._mode === 'readonly') {
        this._manifestURLOfCardStore =
         'app://smart-home.gaiamobile.org/manifest.webapp';
      }
      return this._getPipedPromise('init', function(resolve, reject) {
        appMgmt.getAll().onsuccess = function onsuccess(event) {
          event.target.result.forEach(function eachApp(app) {
            var manifest = app.manifest;
            if (!app.launch || !manifest || !manifest.icons ||
                that._isHiddenApp(manifest.role)) {
              return;
            }
            that.installedApps[app.manifestURL] = app;
          });

          that._reloadCardList().then(function() {
            resolve();
          });
        };
        appMgmt.addEventListener('install', that);
        appMgmt.addEventListener('uninstall', that);
      });
    },

    uninit: function cm_uninit() {
      var appMgmt = navigator.mozApps.mgmt;
      appMgmt.removeEventListener('install', this);
      appMgmt.removeEventListener('uninstall', this);

      this.state = CardManager.STATES.SYNCING;
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

    // TODO: need to be protected by state and _reloadCardList
    getCardList: function cm_getCardList() {
      var that = this;
      return this._getPipedPromise('getCardList', function(resolve, reject) {
        if (!that._isCardListLoaded()) {
          that._reloadCardList().then(function() {
            resolve(that._cardList);
          });
        } else {
          resolve(that._cardList);
        }
      });
    },

    // TODO: need to be protected by state and _reloadCardList
    // There are three types of query:
    // 1. query by cardId
    // 2. query by manifestURL
    // 3. query by cardEntry (i.e. serialized card)
    findCardFromCardList: function cm_findCardFromCardList(query) {
      var found;
      this._cardList.some(function(card) {
        if (card.cardId === query.cardId) {
          found = card;
          return true;
        } else if (query.manifestURL && card.nativeApp &&
            card.nativeApp.manifestURL === query.manifestURL) {

          // The launchURL only happens to AppBookmark, we only need to check if
          // launchURL is exactly the same in this case.
          if (!(card instanceof AppBookmark) ||
              (query.launchURL && card.launchURL === query.launchURL)) {
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

    // TODO: need to be protected by state and _reloadCardList
    findFolderFromCardList: function cm_findFolderFromCardList(query) {
      var found;
      this._cardList.some(function(card) {
        if (card instanceof Folder && card.folderId === query.folderId) {
          found = card;
          return true;
        }
      });
      return found;
    },

    isPinned: function cm_isPinned(options) {
      var that = this;
      return this._getPipedPromise('isPinned', function(resolve, reject) {
        // we only answered isPinned when card manager is in READY state
        if (that.isReady()) {
          resolve(!!that.findCardFromCardList(options));
        } else {
          // card manager is not ready, so we append query at the end of
          // promise of _reloadCardList (which would guarantee card manager will
          // be READY eventually)
          that._reloadCardList().then(function() {
            resolve(!!that.findCardFromCardList(options));
          });
        }
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
