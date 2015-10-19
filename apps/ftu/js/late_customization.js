/* global URLSearchParams, Navigation, UIManager,
   IconsHelper, MobileOperator, Sanitizer, LazyLoader */
(function(exports) {
'use strict';

  const MANIFEST_SETTING_NAME = 'latecustomization.url';
  const OPERATOR_INFO_SETTING_NAME = 'latecustomization.operatorInfo';
  const COMMS_CHANNEL = 'ftucomms';
  const ICON_SIZE = 32;
  const IMG_PATH = 'style/images/late_customization';
  const ICON_INSTALLING_URL = `${IMG_PATH}/app_installing.svg`;
  const ICON_FAILED_URL = `${IMG_PATH}/app_install_unrecoverable.svg`;
  const ICON_DEFAULT_URL = `${IMG_PATH}/default_icon.svg`;

  function LateCustomizationPanel() {
    this.debug('LateCustomizationPanel ctor');
  }

  LateCustomizationPanel.prototype = {
    DEBUG: false,
    name: 'LateCustomizationPanel',
    constructor: LateCustomizationPanel,
    _initialized: false,
    _downloadPossible: false,

    /* The manifest URL for the customization (comes from mozSettings) */
    // e.g. https://marketplace-dev.allizom.org/\
    //      api/v2/late-customization/?carrier=telenor&region=ca
    _customizationManifestUrl: '',

    get enabled() {
      return Boolean(this._customizationManifestUrl &&
                     (this._operatorInfo || this._predefinedOperatorInfo));
    },

    get operatorInfo() {
      var info = {};
      Object.assign(info,
                    this._operatorInfo || this.getInfoFromMobileConnection(),
                    this._predefinedOperatorInfo);
      return info;
    },

    get carrierName() {
      var info = this.operatorInfo;
      return info.carrier || info.operator;
    },

    get region() {
      return this.operatorInfo.region || '';
    },

    start: function() {
      window.addEventListener('hashchange', this);
      window.addEventListener('ftu-done', this);
      window.addEventListener('online', this);
      window.addEventListener('offline', this);

      this._operatorInfo = this.getInfoFromMobileConnection();
      this.waitForSettingValues().then((results) => {
        var [url, predefinedInfo] = results;
        if (url) {
          this._customizationManifestUrl = url;
        }
        if (predefinedInfo) {
          // store operator/params separate from
          // bona-fide mobileconnection details
          this._predefinedOperatorInfo = predefinedInfo;
        }
        this.debug(
          'start, resolved manifest url: ' + this._customizationManifestUrl,
          ' is enabled? ' + this.enabled,
          ' operatorInfo: ', this._operatorInfo);

        if (this.enabled) {
          // bail completely if not enabled: don't register step, don't render
          this.init();
        } else {
          this.debug('Not enabled; not initializing');
          if (!this._operatorInfo) {
            // keep watching in case we can init later
            this.waitForOperatorInfo().then((info) => {
              if (!this._initialized && this.enabled) {
                this.init();
              }
            });
          }
        }
      }).catch(e => {
        this.debug('start: didnt init, error from waitForSettingValues: ', e);
      });
    },

    init: function() {
      // conditions for displaying Late Customization pane
      // are embodied in this.enabled. If not enabled, init is skipped
      // and the step is not registered at all.
      if (this._initialized || !this.enabled) {
        return;
      }
      this._initialized = true;
      this.appManifestUrls = [];
      this.render();

      Navigation.registerStep({
        hash: '#late_customization',
        afterStep: 'firefox_accounts'
      });

      this.attemptToPopulateAppList();
    },

    postConnectMessage: function(message) {
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        if (app.connect) {
          app.connect(COMMS_CHANNEL).then(function onConnAccepted(ports) {
            ports.forEach(function(port) {
              port.postMessage(message);
            });
          }, function onConnRejected(reason) {
            console.error('Cannot notify collection: ', reason);
          });
        } else {
          console.error ('mozApps does not have a connect method. ' +
                         'Cannot launch the collection preload process.');
        }
      };
    },

    attemptToPopulateAppList: function() {
      this.debug('attemptToPopulateAppList, waiting to go online');
      // start waiting to go online.
      // We bail if ftu completes first
      var connected = this.whenUsableConnection();

      connected.then(() => {
        this.debug('attemptToPopulateAppList, came online');
        return this.fetchAppsToInstall().then((appsMap) => {
          if (!(this._appsToInstall && this._appsToInstall.size)) {
            // no apps, bail early
            this.debug('No apps in response from ' +
                       this._customizationManifestUrl + ', bailing');
            return;
          }
          var urls = Array.from(this._appsToInstall.keys());
          var postMessageDetail = {
            type: 'late-customization-apps',
            urls: urls
          };
          this.postConnectMessage(postMessageDetail);
          this.updateAppList(this._appsToInstall);
        }).catch(err => {
          console.warn('LateCustomizationPanel, error fetching customization ' +
                       'manifest from: ' + this._customizationManifestUrl,
                       err.message);
        });
      }).catch((e) => {
        this.debug('No connection available in time to ' +
                    'fetch late customization manifest:', e);
      });
      return connected;
    },
    fetchAppsToInstall: function() {
      if (this._appsToInstall) {
        return Promise.resolve(this._appsToInstall);
      }
      return this.fetchManifest().then((manifestResp) => {
        var appsMap = this.getAppsFromManifest(manifestResp);
        if (!appsMap) {
          return Promise.reject('getAppsFromManifest didnt return appsMap');
        }
        return (this._appsToInstall = appsMap);
      }, (err) => {
        console.warn('LateCustomization: ', err.message || err);
      });
    },

    waitForSettingValues: function() {
      var haveUrl, haveInfo;
      var lock = navigator.mozSettings.createLock();

      function getSetting(name) {
        return new Promise((resolve, reject) => {
          lock = (lock && !lock.closed) ?
                  lock : navigator.mozSettings.createLock();
          var get = lock.get(name);
          get.addEventListener('success', (function() {
            resolve(get.result[name]);
          }));
          get.addEventListener('error', (function() {
            reject();
          }));
        });
      }

      if (this._customizationManifestUrl) {
        haveUrl = Promise.resolve(this._customizationManifestUrl);
      } else {
        haveUrl = getSetting(MANIFEST_SETTING_NAME);
      }
      haveInfo = getSetting(OPERATOR_INFO_SETTING_NAME);

      return Promise.all([haveUrl, haveInfo]);
    },

    waitForOperatorInfo: function() {
      var info = this.getInfoFromMobileConnection();
      if (info) {
        this._operatorInfo = info;
        return Promise.resolve(info);
      }

      return new Promise((resolve, reject) => {
        this._operatorInfoRequest = {
          resolve: resolve,
          reject: reject
        };
      });
    },

    getInfoFromMobileConnection: function() {
      var connections = navigator.mozMobileConnections;
      if (connections) {
        for (var i=0, conn; i<connections.length; i++) {
          conn = connections[i];
          if(conn && conn.voice && conn.voice.connected) {
            var operatorInfos = MobileOperator.userFacingInfo(conn);
            if (operatorInfos.operator) {
              operatorInfos.mcc = conn.voice.network.mcc;
              operatorInfos.mnc = conn.voice.network.mnc;
              return operatorInfos;
            }
          }
        }
      }
      return null;
    },

    getAppsFromManifest: function(data) {
      var apps = new Map();
      var langs = navigator.languages;
      var list = data && (data.apps || data.objects);
      if (!(list && list.length)) {
        return apps;
      }
      list.filter((app) => {
        return app.is_disabled !== true &&
               (new Set(app.device_types)).has('firefoxos');
      }).forEach((appData) => {
        appData.manifestURL = appData.manifest_url;
        // get locale-appropriate name for user display
        var appName = '';
        langs.some(function tryLanguage(lang) {
          if (this[lang]) {
            appName = this[lang];
            // aborts [].some
            return true;
          }
        }, appData.name);

        appData.displayName = appName;
        this.debug('app data: ', appData.displayName, appData);
        apps.set(appData.manifestURL, appData);
      });
      return apps;
    },

    attemptInstalls: function() {
      this._installQueue = [];
      if (this._appsToInstall && this._appsToInstall.size) {
        var attempts = [];
        this._appsToInstall.forEach((appData, manifestURL) => {
          if (appData.installState == 'installed' ||
                appData.installState == 'pending') {
            this.debug('attemptInstalls: app install already underway: ',
                      manifestURL, appData.installState);
          } else {
            attempts.push(this.enqueAppInstall(appData));
          }
        });
        return Promise.all(attempts);
      } else {
        return Promise.resolve();
      }
    },
    installApp: function(appData) {
      this.debug('installApp: ', appData.manifestURL);
      return this.whenUsableConnection().then(() => {
        return new Promise((resolve, reject) => {
          var req = window.navigator.mozApps.install(appData.manifestURL);
          var onOutcome = (arg) => {
            var selector = `li[data-manifest-url="${appData.manifestURL}"]`;
            var itemNode = this.appListNode.querySelector(selector);
            var manifestURL = req.result && req.result.manifestURL;
            this.debug('appinstall DOMRequest outcome:', arg, req.result);

            if (req.error) {
              delete appData.installState;
              itemNode && itemNode.classList.add('failed');
              console.warn('Install error: ', req.error);
            } else if (req.result) {
              appData.installState = req.result.installState;
              this.debug('Install success, app: ',
                          manifestURL, appData.installState);
            }
            itemNode && itemNode.classList.remove('pending');
            resolve(req);
          };
          req.onsuccess = req.onerror = onOutcome;
        });
      }).catch(() => {
          this.debug('Lost connection while attempting install of ' +
                    appData.manifestURL);
      });
    },

    enqueAppInstall: function(app) {
      var installQueue = this._installQueue;
      installQueue.push(app);
      this.debug('enqueAppInstall, queue: ', app.manifestURL);

      var currentInstallAttempt = this._installAttempt || Promise.resolve();
      return currentInstallAttempt.then(req => {
        if (req && req.error) {
          console.warn('install error:', req.error);
        }
        if (this._installQueue.length) {
          this._installAttempt =
            this.installApp(this._installQueue.shift());
        }
      });
    },

    debug: function() {
      if (!this.DEBUG) {
        return;
      }
      var args = Array.from(arguments);
      args.unshift('LateCustomizationPanel');
      console.log.apply(console, args);
    },

    buildManifestUrl: function(url, infos={}) {
      var apiURL = new URL(url);
      var params = new URLSearchParams(apiURL.search.substr(1));
      for(var key in infos) {
        if (typeof infos[key] !== 'undefined') {
          params.set(key, infos[key]);
        }
      }
      apiURL.search = params.toString();
      return apiURL.href;
    },

    fetchManifest: function() {
      var url = this.buildManifestUrl(this._customizationManifestUrl,
                                    this.operatorInfo);
      if (!url) {
        return Promise.reject(new Error('No manifest URL available'));
      }
      this.debug('fetchManifest at: ' + url);
      return new Promise((resolve, reject) => {
        LazyLoader.getJSON(url, true).then((resp) => {
          if (resp.objects) {
            resolve(resp);
          } else {
            reject('No apps in reponse to: ' + url);
          }
        }).catch(ex => {
          reject(ex);
        });
      });
    },

    whenUsableConnection: function() {
      if (this._pendingNextOnline) {
        return this._pendingNextOnline;
      }
      var canDownload = navigator.onLine;
      if (canDownload) {
        return Promise.resolve(true);
      }
      return new Promise((resolve, reject) => {
        this._nextOnlineRequest = {
          resolve: resolve,
          reject: reject
        };
      });
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'hashchange':
          if (this.enabled &&
              evt.target.location.hash === '#late_customization') {
            if (this._appsToInstall && this._appsToInstall.size) {
              this.onPanelShown();
            } else {
              Navigation.skipStep();
            }
          }
          // TODO: is some event I can listen to to know the sim is ready
          // to be asked these questions?
          if (this._operatorInfoRequest) {
            var info = this.getInfoFromMobileConnection();
            if (info) {
              this._operatorInfo = info;
              this._operatorInfoRequest.resolve(info);
              this._operatorInfoRequest = null;
            }
          }
          break;
        case 'online':
        case 'offline':
          // install is underway, try to resume
          if (navigator.onLine &&
              this._installQueue && this._installQueue.length) {
            return this.attemptInstalls();
          }
          if (navigator.onLine && this._nextOnlineRequest) {
            this._nextOnlineRequest.resolve(true);
          } else if (this._nextOnlineRequest) {
            this._nextOnlineRequest.reject(new Error('offline'));
            // re-start the wait/fetch/install process
            if (!this._appsToInstall) {
              this.attemptToPopulateAppList();
            }
          }
          this._nextOnlineRequest = null;
          break;
        case 'ftu-done':
          // abort anything pending
          if (this._operatorInfoRequest) {
            this._operatorInfoRequest.reject(
                new Error('FTU complete with no viable operator'));
            this._operatorInfoRequest = null;
          }
          if (this._nextOnlineRequest) {
            this._nextOnlineRequest.reject(
                new Error('done before connection became available'));
            this._nextOnlineRequest = null;
          }
          break;
      }
    },

    onPanelShown: function() {
      UIManager.mainTitle.setAttribute('data-l10n-id',
                                             'late-customization');
      this.finalizeRender();
      this.attemptInstalls();
    },

    _createElement: function(name, options) {
      var elm = document.createElement(name);
      if (options.id) {
        elm.id = options.id;
      }
      if (options.className) {
        elm.className = options.className;
      }
      if (options.dataset) {
        for(var p in options.dataset) {
          elm.dataset[p] = options.dataset[p];
        }
      }
      if (options.attributes) {
        for(var a in options.attributes) {
          elm.setAttribute(a, options.attributes[a]);
        }
      }
      if ('textContent' in options) {
        elm.textContent = options.textContent;
      }
      return elm;
    },

    render: function() {
      var section = this.element =
          document.getElementById('late_customization');
      if (!section) {
        section = this._createElement('section', {
          attributes: { role: 'region' },
          id: 'late_customization'
        });
        this.element = section;
      }

      section.innerHTML = Sanitizer.escapeHTML `
      <section id="late-customization-cando" class="content hidden">
        <p id="late_customization-downloading-message"></p>
      </section>
      <section id="late-customization-nocando" class="content">
        <p id="late_customization-download-later-message"></p>
        <p id="late_customization-download-later-marketplace"></p>
      </section>
      <article data-type="list">
        <ul id="late_customization-applist" class="hidden"></ul>
      </article>`;

      function setTranslationById(domId, l10Id, attrs) {
        var elem = section.querySelector('#' + domId);
        navigator.mozL10n.setAttributes(elem, l10Id, attrs);
      }

      var carrierName = this.carrierName;
      if (carrierName) {
        setTranslationById(
          'late_customization-downloading-message',
          'late-customization-downloading-message',
          { carrierName: this.carrierName });
        setTranslationById(
          'late_customization-download-later-message',
          'late-customization-download-later',
          { carrierName: this.carrierName });
      } else {
        // Use an alternate string if we have no carrier name to display
        setTranslationById(
          'late_customization-downloading-message',
          'late-customization-downloading-message-default');
        setTranslationById(
          'late_customization-download-later-message',
          'late-customization-download-later-default');
      }
      setTranslationById(
        'late_customization-download-later-marketplace',
        'late-customization-download-later-marketplace',
        { carrierName: this.carrierName });

      if (!section.parentNode) {
        document.querySelector('#activation-screen > article')
          .appendChild(section);
      }
      this.appListNode = document.querySelector('#late_customization-applist');
    },

    renderAppItem: function(appData) {
      var itemNode = this._createElement('li', {
        dataset: { manifestUrl: appData.manifestURL },
        className: 'pending'
      });
      var listNode = this.element.querySelector('#late_customization-applist');
      if (!listNode) {
        this.debug('No element found to render app details into');
        return;
      }

      itemNode.innerHTML = Sanitizer.escapeHTML `
        <span class="icon"
              style="background-image: url(${ICON_INSTALLING_URL})"></span>
        <p dir="auto">${appData.displayName}</p>
      `;
      listNode.appendChild(itemNode);
      var iconElem = itemNode.querySelector('.icon');

      this.getAppIconUrl(appData).then((iconUrl) => {
        this.debug('getAppIconUrl returned:', iconUrl);
        var img = new Image();
        img.onload = () => {
          iconElem.style.backgroundImage = 'url('+img.src+')';
        };
        img.onerror = () => {
          iconElem.style.backgroundImage = 'url('+ICON_DEFAULT_URL+')';
        };
        img.src = iconUrl.href;
      });
      return itemNode;
    },

    getAppIconUrl: function(appData, iconSize = ICON_SIZE) {
      var siteObj = {};
      var manifest = appData;
      var manifestURL = appData.manifest_url;
      var origin = manifest.origin = new URL(manifestURL).origin;
      var hasIcons = (manifest.icons && Object.keys(manifest.icons).length);
      if (!hasIcons) {
        return Promise.resolve(new URL(ICON_DEFAULT_URL));
      }
      //Getting the icons from the FirefoxOS-style manifest
      siteObj.manifestURL = manifestURL;
      siteObj.manifest = manifest;
      var gotIcon = new Promise((resolve, reject) => {
        IconsHelper.getIcon(origin, iconSize, null, siteObj)
        .then((iconUrl) => {
          this.debug('getIcon returned: ', iconUrl);
          resolve(iconUrl);
        }).catch(err => {
          this.debug('Failed to load icon from: ' +
                   JSON.stringify(appData.icons));
          console.warn('getIcon errback, err: ',err);
          resolve(new URL(ICON_FAILED_URL));
        });
      });
      return gotIcon;
    },

    finalizeRender: function() {
      var container = this.element;
      var appsMap = this._appsToInstall;
      var hasApps = (appsMap && appsMap.size);

      var canDoElm = container.querySelector('#late-customization-cando');
      var noCanDoElm = container.querySelector('#late-customization-nocando');
      var appListElm = container.querySelector('#late_customization-applist');

      canDoElm.classList.toggle('hidden', !hasApps);
      appListElm.classList.toggle('hidden', !hasApps);
      noCanDoElm.classList.toggle('hidden', !!hasApps);
    },

    updateAppList: function(appsMap) {
      var list = this.element.querySelector('#late_customization-applist');

      this.debug('updateAppList: ', appsMap);

      while (list.firstChild) {
        list.firstChild.remove();
      }

      if (appsMap && appsMap.size) {
        for (var appData of appsMap.values()) {
          this.debug('calling renderAppItem with app: ', appData.manifestURL);
          this.renderAppItem(appData);
        }
      }
      this.finalizeRender();
    }
  };

  exports.LateCustomizationPanel = LateCustomizationPanel;
  var panel;

  navigator.mozL10n.once(function firstLocalized() {
    panel = exports.lateCustomizationPanel = new LateCustomizationPanel();
  });

  window.addEventListener('ftu-setup', function onSetup(evt) {
    window.removeEventListener('ftu-setup', onSetup);
    panel && (panel.manager = evt.detail);
    panel && panel.start();
  });

})(window);
