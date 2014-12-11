/* global evt, addMixin, Promise, PipedPromise, Application, CardStore,
        Deck, AppBookmark, Folder, uuid */

(function(exports) {
  'use strict';

  var CardManager = function() {
  };

  CardManager.prototype = evt({
    HIDDEN_ROLES: ['system', 'homescreen', 'addon'],

    _cardStore: undefined,

    _cardList: [],

    installedApps: {},

    _isHiddenApp: function cm_isHiddenApp(role) {
      if (!role) {
        return false;
      }
      return (this.HIDDEN_ROLES.indexOf(role) !== -1);
    },

    _isCardListLoaded: function cm_isCardListLoaded() {
      return this._cardList && this._cardList.length > 0;
    },

    // When we store Application or Deck into data store,
    // we serialize them into the form like this:
    // {
    //   manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp',
    //   name: 'Gallery',
    //   type: 'Application'
    // }
    // this method do the job of serializing
    _serializeCard: function cm_serializeCard(card) {
      var cardEntry;
      if (card instanceof AppBookmark) {
        cardEntry = {
          manifestURL: card.nativeApp.manifestURL,
          name: card.name,
          thumbnail: card.thumbnail,
          launchURL: card.launchURL,
          type: 'AppBookmark'
        };
      }
      else if (card instanceof Application) {
        cardEntry = {
          manifestURL: card.nativeApp.manifestURL,
          name: card.name,
          type: 'Application'
        };
      } else if (card instanceof Deck) {
        // A deck doesn't need background color because it is always full-sized
        // icon. If not, it is an issue from visual's image.
        cardEntry = {
          name: card.name,
          cachedIconURL: card.cachedIconURL,
          manifestURL: card.nativeApp && card.nativeApp.manifestURL,
          type: 'Deck'
        };
      } else if (card instanceof Folder) {
        cardEntry = {
          name: card.name,
          folderId: card.folderId,
          type: 'Folder'
        }
      }
      return cardEntry;
    },

    _deserializeCardEntry: function cm_deserializeCardEntry(cardEntry) {
      var cardInstance;
      switch (cardEntry.type) {
        case 'Application':
          cardInstance = new Application({
            nativeApp: this.installedApps[cardEntry.manifestURL],
            name: cardEntry.name
          });
          break;
        case 'Deck':
          cardInstance = new Deck({
            name: cardEntry.name,
            nativeApp: cardEntry.manifestURL &&
                       this.installedApps[cardEntry.manifestURL],
            cachedIconURL: cardEntry.cachedIconURL
          });
          break;
        case 'AppBookmark':
          cardInstance = new AppBookmark({
            nativeApp: this.installedApps[cardEntry.manifestURL],
            name: cardEntry.name,
            thumbnail: cardEntry.thumbnail,
            launchURL: cardEntry.launchURL
          });
          break;
        case 'Folder':
          cardInstance = new Folder({
            name: cardEntry.name,
            folderId: cardEntry.folderId,
            // The content of folder is saved in datastore under key of folderId
            // thus we are not complete deserialize it yet, mark its state
            // as 'DESERIALIZING'. Caller needs to put content of the folder
            // back to its structure. Please refer to _reloadCardList().
            state: Folder.STATES.DESERIALIZING
          });
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
          var cardEntriesInFolder =
            folder.cardsInFolder.map(that._serializeCard.bind(that));
          that._cardStore.saveData(folder.folderId,
            cardEntriesInFolder).then(function() {
              folder.state = Folder.STATES.NORMAL;
            }).then(resolve, reject);
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
    writeCardlistInCardStore: function cm_writeCardlistInCardStore() {
      var that = this;
      return new Promise(function(resolve, reject) {
        var cardEntries =
          that._cardList.map(that._serializeCard.bind(that));
        that._cardStore.saveData('cardList', cardEntries).then(function() {
          var saveDataPromises = [];
          // The cards inside of folder are not saved nested in cardList
          // but we explicit save them under key of folderId.
          // Here we save content of each folder one by one
          that._cardList.forEach(function(card, index) {
            if (card instanceof Folder) {
              if (card.cardsInFolder.length > 0) {
                saveDataPromises.push(that.writeFolderInCardStore(card));
              } else {
                // remove empty folder
                that._cardList.splice(index, 1);
              }
            }
          });
          // resolve current promise only when all saveData is finished
          Promise.all(saveDataPromises).then(resolve);
        }, reject);
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
      if (evt.id === 'cardList' && evt.operation === 'updated') {
        this.fire('card-changed');
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
          // load card from datastore
          if (!that._cardStore) {
            that._cardStore = new CardStore();
            that._cardStore.on('change', that._onCardStoreChange.bind(that));
          }
          that._cardStore.getData('cardList').then(function(cardList) {
            if (cardList) {
              cardList.forEach(function(cardEntry) {
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
              });
              resolve();
            } else {
              // no cardList in datastore, load default from config file
              that._loadDefaultCardList().then(resolve, reject);
            }
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

    insertNewFolder: function cm_insertFolder(name) {
      var newFolder = new Folder({
        name: name,
        state: Folder.STATES.DETACHED
      });
      this._cardList.push(newFolder);
      // Notice that we are not saving card list yet
      // Because newFolder is empty, it is meaningless to save it
      // But we need to hook `folder-changed` event handler in case
      // we need to save it when its content changed
      newFolder.on('folder-changed', this._onFolderChange.bind(this));
      return newFolder;
    },

    insertCard: function cm_insertCard(options) {
      var that = this;
      var card = this._deserializeCardEntry(options);

      // TODO: If the given card belongs to an app, we assume the app spans a
      // pseudo group with all its bookmarks following app icon itself, and the
      // given card should be put at the end of the group.

      // add card to the end of the list
      this._cardList.push(card);
      this.writeCardlistInCardStore().then(function() {
        that.fire('card-inserted', card, that._cardList.length - 1);
      });
    },

    removeCard: function cm_removeCard(item) {
      var that = this;
      var idx;
      if(typeof item === 'number') {
        idx = item;
        this._cardList.splice(item, 1);
      } else {
        idx = this._cardList.indexOf(item);
        this._cardList.splice(idx, 1);
      }
      this.writeCardlistInCardStore().then(function() {
        that.fire('card-removed', idx);
      });
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

    init: function cm_init() {
      var that = this;
      var appMgmt = navigator.mozApps.mgmt;
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

        appMgmt.oninstall = that._onAppInstall.bind(that);
        appMgmt.onuninstall = that._onAppUninstall.bind(that);
      });
    },

    uninit: function cm_uninit() {
      var appMgmt = navigator.mozApps.mgmt;
      appMgmt.oninstall = null;
      appMgmt.onuninstall = null;

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

      if (!entryPoints || manifest.type !== 'certified') {
        entries.push({
          manifestURL: manifestURL,
          entryPoint: '',
          name: manifest.name,
          type: 'Application'
        });
      } else {
        for (var entryPoint in entryPoints) {
          if (entryPoints[entryPoint].icons) {
            entries.push({
              manifestURL: manifestURL,
              entryPoint: entryPoint,
              name: entryPoints[entryPoint].name,
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

    findCardFromCardList: function cm_findCardFromCardList(query) {
      var found;
      this._cardList.some(function(card) {
        if (card.cardId === query.cardId) {
          found = card;
          return true;
        }
      })
      return found;
    },

    findFolderFromCardList: function cm_findFolderFromCardList(query) {
      var found;
      this._cardList.some(function(card) {
        if (card instanceof Folder && card.folderId === query.folderId) {
          found = card;
          return true;
        }
      })
      return found;
    }
  });

  SharedUtils.addMixin(CardManager, new PipedPromise());

  exports.CardManager = CardManager;
}(window));
