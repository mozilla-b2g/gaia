'use strict';

var EverythingME = {
  init: function EverythingME_init() {
    var footer = document.querySelector('#footer');
    if (footer) {
      footer.style.MozTransition = '-moz-transform .3s ease';
    }

    var page = document.getElementById('evmeContainer'),
        gridPage = document.querySelector('#icongrid > div:first-child');

    // TODO
    // We need to re-think how to lazy-load E.me
    // it is required for interacting with Collections:
    // create initial collections, open collections, create collections etc.
    EverythingME.activate();

    gridPage.addEventListener('gridpageshowend', function onPageShow() {
      EvmeFacade.onShow();
    });
    gridPage.addEventListener('gridpagehideend', function onPageHide() {
      EvmeFacade.onHide();
    });

    // add evme into the first grid page
    gridPage.classList.add('evmePage');
    gridPage.appendChild(page.parentNode.removeChild(page));

    function onContextMenu(e) {
      e.stopPropagation();
    }

    EverythingME.migrateStorage();
  },

  activate: function EverythingME_activate(e) {
    document.body.classList.add('evme-loading');

    this.load();
  },

  load: function EverythingME_load() {
    var CB = !('ontouchstart' in window),
        js_files = [
          'js/Core.js',
          'js/etmmanager.js',

          'config/config.js',
          'config/shortcuts.js',
          'js/developer/utils.1.3.js',
          'js/helpers/Utils.js',
          'js/helpers/Storage.js',
          'js/helpers/IconManager.js',
          'js/plugins/Scroll.js',
          'js/external/uuid.js',
          'js/api/apiv2.js',
          'js/api/DoATAPI.js',
          'js/helpers/EventHandler.js',
          'js/helpers/Idle.js',
          'js/developer/utils.1.3.js',
          'shared/js/settings_listener.js',
          'js/plugins/Analytics.js',
          'js/plugins/APIStatsEvents.js',
          'js/Brain.js',
          'modules/BackgroundImage/BackgroundImage.js',
          'modules/Banner/Banner.js',
          'modules/ConnectionMessage/ConnectionMessage.js',
          'modules/Features/Features.js',
          'modules/Helper/Helper.js',
          'modules/Location/Location.js',
          'modules/Results/Result.js',
          'modules/Results/providers/CloudApps.js',
          'modules/Results/providers/InstalledApps.js',
          'modules/Results/providers/MarketApps.js',
          'modules/Results/providers/MarketSearch.js',
          'modules/Results/providers/StaticApps.js',
          'modules/Results/ResultManager.js',
          'modules/Searchbar/Searchbar.js',
          'modules/SearchHistory/SearchHistory.js',
          'modules/CollectionsSuggest/CollectionsSuggest.js',
          'modules/Collection/Collection.js'
        ],
        css_files = [
          'shared/style/confirm.css',
          'shared/style_unstable/progress_activity.css',
          'shared/style/status.css',
          'shared/style/action_menu.css',
          'css/common.css',
          'modules/BackgroundImage/BackgroundImage.css',
          'modules/Banner/Banner.css',
          'modules/ConnectionMessage/ConnectionMessage.css',
          'modules/Helper/Helper.css',
          'modules/Results/Results.css',
          'modules/Searchbar/Searchbar.css',
          'modules/CollectionsSuggest/CollectionsSuggest.css',
          'modules/Collection/Collection.css'
        ];

    var head = document.head;

    var scriptLoadCount = 0;
    var cssLoadCount = 0;

    function onScriptLoad(event) {
      event.target.removeEventListener('load', onScriptLoad);
      if (++scriptLoadCount == js_files.length) {
        EverythingME.start();
      } else {
        loadScript(js_files[scriptLoadCount]);
      }
    }

    function onCSSLoad(event) {
      event.target.removeEventListener('load', onCSSLoad);
      if (++cssLoadCount === css_files.length) {
        loadScript(js_files[scriptLoadCount]);
      } else {
        loadCSS(css_files[cssLoadCount]);
      }
    }

    function loadCSS(file) {
      var link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = (file.indexOf('shared/') !== -1 ? '' : 'everything.me/') +
                   file + (CB ? '?' + Date.now() : '');
      link.addEventListener('load', onCSSLoad);
      window.setTimeout(function load() {
        head.appendChild(link);
      }, 0);
    }

    function loadScript(file) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = (file.indexOf('shared/') !== -1 ? '' : 'everything.me/') +
                   file + (CB ? '?' + Date.now() : '');
      script.defer = true;
      script.addEventListener('load', onScriptLoad);
      window.setTimeout(function load() {
        head.appendChild(script);
      }, 0);
    }

    loadCSS(css_files[0]);
  },

  start: function EverythingME_start() {
    if (document.readyState === 'complete') {
      EverythingME.initEvme();
    } else {
      window.addEventListener('load', function onload() {
        window.removeEventListener('load', onload);
          EverythingME.initEvme();
      });
    }
  },

  initEvme: function EverythingME_initEvme() {
    Evme.init(EverythingME.onEvmeLoaded);
    EvmeFacade = Evme;
  },

  onEvmeLoaded: function onEvmeLoaded() {
    EvmeFacade.onShow();
    document.body.classList.remove('evme-loading');
  },

  destroy: function EverythingME_destroy() {
    // Deleting all resources of everything.me from DOM
    var list = document.querySelectorAll('head > [href*="everything.me"]');
    for (var i = 0; i < list.length; i++) {
      var resource = list[i];
      resource.parentNode.removeChild(resource);
    }
  },

  // copy relevant user data from 1.0.1 to 1.1 versions
  migrateStorage: function EverythingME_migrateStorage(onComplete, force) {
    var migrationStorageKey = 'migrated_1.0.1_to_1.1';

    if (!onComplete) {
      onComplete = function() {};
    }

    asyncStorage.getItem(migrationStorageKey, function evmeMigration(value) {
      // this means we already migrated, so everything's a-ok
      if (value === true && !force) {
        onComplete();
        return;
      }

      // first mark as "migrated", so if we have an error we won't keep running this
      asyncStorage.setItem(migrationStorageKey, true);

      // start the migration
      console.log('[EVME migration] migrating from 1.0.1 to 1.1...');

      // these are properties that don't need special attention -
      // simply copy from sync to async, oldKey: newKey
      var AUTOMATIC_KEYS = {
            'userHistory': 'evme-userHistory',
            'localShortcuts': 'evme-localShortcuts',
            'localShortcutsIcons': 'evme-localShortcutsIcons'
          },
          numberOfKeys = Object.keys(AUTOMATIC_KEYS).length,
          numberOfKeysDone = 0;

      for (var key in AUTOMATIC_KEYS) {
        EverythingME.copyStorageToDB(key, AUTOMATIC_KEYS[key], onDataMigrated);
      }

      function onDataMigrated() {
        numberOfKeysDone++;
        if (numberOfKeysDone >= numberOfKeys) {
          console.log('[EVME migration] complete successfully!');
          onComplete();
        }
      }
    });
  },

  copyStorageToDB: function copyStorageToDB(oldKey, newKey, onComplete) {
    if (!onComplete) {
      onComplete = function() {};
    }

    console.log('[EVME migration] [' + oldKey + ']: retrieving...');

    try {
      var oldValue = window.localStorage[oldKey];

      if (!oldValue) {
        console.log('[EVME migration] [' + oldKey + ']: no value');
        onComplete(false);
        return false;
      }

      console.log('[EVME migration] [' + oldKey + '] got value: ' + oldValue);
      oldValue = JSON.parse(oldValue);
      if (!oldValue) {
        console.log('[EVME migration] [' + oldKey + ']: invalid json: ' + window.localStorage[oldKey]);
        deleteOld();
        onComplete(false);
        return false;
      }

      // convert old structure to new
      var newValue = {
        'value': oldValue._v,
        'expires': oldValue._e
      };

      console.log('[EVME migration] [' + oldKey + ':' + newKey + ']: saving: ' + JSON.stringify(newValue));
      asyncStorage.setItem(newKey, newValue, function onsaved() {
        console.log('[EVME migration] [' + oldKey + ':' + newKey + ']: saved, remove old data');
        deleteOld();
        onComplete(true);
      });
    } catch(ex) {
      deleteOld();
      console.warn('[EVME migration] [' + oldKey + ']: error: ' + oldValue + ' (' + ex.message + ')');
      onComplete(false);
      return false;
    }

    function deleteOld() {
      window.localStorage[oldKey] = null;
      delete window.localStorage[oldKey];
    }

    return true;
  }
};

var EvmeFacade = {
  onShow: function onShow() {
    return false;
  },
  onHide: function onHide() {
    return false;
  }
};
