var EverythingME = {

  loaded: false,

  init: function EverythingME_init() {
    var page = document.getElementById("evmePage");
    page.addEventListener("gridpageshow", function onpageshow(event) {
      window.removeEventListener("gridpageshow", onpageshow);
      EverythingME.load();
    });
  },

  load: function EverythingME_load() {
    if (this.loaded)
      return;

    this.loaded = true;

    var js_files = ['js/etmmanager.js',
                    'js/Core.js',
                    'config/config.js',
                    'js/Brain.js',
                    'modules/Apps/Apps.js',
                    'modules/BackgroundImage/BackgroundImage.js',
                    'modules/Dialog/Dialog.js',
                    'modules/Location/Location.js',
                    'modules/Screens/Screens.js',
                    'modules/Shortcuts/Shortcuts.js',
                    'modules/ShortcutsCustomize/ShortcutsCustomize.js',
                    'modules/Searchbar/Searchbar.js',
                    'modules/SearchHistory/SearchHistory.js',
                    'modules/Helper/Helper.js',
                    'modules/Tip/Tip.js',
                    'modules/Connection/Connection.js',
                    'js/helpers/Storage.js',
                    'js/developer/zepto.0.7.js',
                    'js/developer/utils.1.3.js',
                    'js/plugins/Scroll.js',
                    'js/external/iscroll.js',
                    'js/external/spin.js',
                    'js/developer/log4js2.js',
                    'js/api/apiv2.js',
                    'js/api/DoATAPI.js',
                    'js/helpers/Utils.js',
                    'js/helpers/EventHandler.js',
                    'js/helpers/Idle.js',
                    'js/plugins/Analytics.js',
                    'js/plugins/APIStatsEvents.js'];
    var css_files = ['css/common.css',
                     'modules/Apps/Apps.css',
                     'modules/BackgroundImage/BackgroundImage.css',
                     'modules/Dialog/Dialog.css',
                     'modules/Location/Location.css',
                     'modules/Screens/Screens.css',
                     'modules/Shortcuts/Shortcuts.css',
                     'modules/ShortcutsCustomize/ShortcutsCustomize.css',
                     'modules/Searchbar/Searchbar.css',
                     'modules/SearchHistory/SearchHistory.css',
                     'modules/Helper/Helper.css',
                     'modules/Tip/Tip.css',
                     'modules/Connection/Connection.css'];
    var head = document.head;

    var scriptLoadCount = 0;
    function onScriptLoad(event) {
      event.target.removeEventListener("load", onScriptLoad);
      scriptLoadCount += 1;
      if (scriptLoadCount == js_files.length) {
        EverythingME.start();
      }
    }

    for each (var file in js_files) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'everything.me/' + file;
      script.defer = true;
      script.addEventListener("load", onScriptLoad);
      head.appendChild(script);
    }
    for each (var file in css_files) {
      var link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href= 'everything.me/' + file;
      head.appendChild(link);
    }
  },

  start: function EverythingME_start() {
    if (document.readyState == "complete") {
      Evme.init();
    } else {
      window.addEventListener("load", function onload() {
        Evme.init();
      });
    }
  }
};

EverythingME.init();
