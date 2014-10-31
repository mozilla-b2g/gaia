/* global evt, addMixin, Promise, PipedPromise, Application, CardStore */

(function(exports) {
  'use strict';

  var CardManager = function() {
  };

  CardManager.prototype = evt({
    HIDDEN_ROLES: ['system', 'homescreen'],

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
      if (card instanceof Application) {
        cardEntry = {
          manifestURL: card.nativeApp.manifestURL,
          name: card.name,
          type: 'Application'
        };
      } else if (card instanceof Deck) {
        cardEntry = {
          // XXX: use fake deck until we have real deck,
          // so we only store name and cachedIconURL.
          // Real Deck should have nativeApp also.
          name: card.name,
          cachedIconURL: card.cachedIconURL,
          type: 'Deck'
        };
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
            cachedIconURL: cardEntry.cachedIconURL
          });
          break;
      }
      return cardInstance;
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
              config.card_list.map(that._deserializeCardEntry.bind(that));
            that._cardStore.saveData('cardList',
              that._cardList.map(that._serializeCard.bind(that)));
            resolve();
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

      return app.origin + url;
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

        var url = that._bestMatchingIcon(
          that.installedApps[manifestURL], entry_manifest, preferredSize);
        if (!url) {
          reject('No url');
        }

        that._loadFile({
          url: url,
          responseType: 'blob'
        }).then(function onFulfill(blob) {
          resolve(blob);
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
    }
  });

  addMixin(CardManager, new PipedPromise());

  exports.CardManager = CardManager;
}(window));
