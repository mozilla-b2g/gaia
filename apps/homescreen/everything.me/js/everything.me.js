var EverythingME = {

  displayed: false,

  pageHideBySwipe: false,

  init: function EverythingME_init() {
    var footerStyle = document.querySelector('#footer').style;
    footerStyle.MozTransition = '-moz-transform .3s ease';

    var page = document.getElementById('evmePage');
    page.addEventListener('gridpageshowend', function onpageshow() {
      page.removeEventListener('gridpageshowend', onpageshow);

      document.querySelector('#loading-overlay > section').style.visibility =
                                                                      'visible';

      EverythingME.displayed = true;
      footerStyle.MozTransform = "translateY(100%)";

      page.addEventListener('gridpageshowend', function onpageshowafterload() {
        if (EverythingME.displayed) return;

        EverythingME.displayed = true;
        footerStyle.MozTransform = "translateY(100%)";
        EvmeFacade.onShow();
      });

      EverythingME.load(function success() {
        if (EverythingME.displayed)
          EvmeFacade.onShow();
        var loadingOverlay = document.querySelector('#loading-overlay');
        loadingOverlay.style.opacity = 0;
        setTimeout(function starting() {
          document.querySelector('#evmeContainer').style.opacity = 1;
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }, 0);
      });
    });

    page.addEventListener('gridpagehideend', function onpagehide() {
      if (!EverythingME.displayed) return;

      EverythingME.displayed = false;
      footerStyle.MozTransform = 'translateY(0)';
      EvmeFacade.onHide();
      EverythingME.pageHideBySwipe = false;
    });

    page.addEventListener('gridpagehidestart', function onpagehidestart() {
      EverythingME.pageHideBySwipe = true;
    });

    page.addEventListener('contextmenu', function longPress(evt) {
        evt.stopImmediatePropagation();
    });

    window.addEventListener('hashchange', function hasChange(evt) {
      if (!EverythingME.displayed || document.location.hash === '#evme') {
        return;
      }

      var captured = EvmeFacade.onHideStart(EverythingME.pageHideBySwipe ?
                                            'pageSwipe' : 'homeButtonClick');
      if (captured) {
        evt.stopImmediatePropagation();
        document.location.hash = '#evme';
      }
    });
  },

  load: function EverythingME_load(success) {

    var CB = !('ontouchstart' in window),
        js_files = ['js/etmmanager.js',
                    'js/Core.js',
                    'config/config.js',
                    'config/shortcuts.js',
                    'js/developer/utils.1.3.js',
                    'js/helpers/Utils.js',
                    'js/Brain.js',
                    'modules/Apps/Apps.js',
                    'modules/BackgroundImage/BackgroundImage.js',
                    'modules/Banner/Banner.js',
                    'modules/Dialog/Dialog.js',
                    'modules/Location/Location.js',
                    'modules/Shortcuts/Shortcuts.js',
                    'modules/ShortcutsCustomize/ShortcutsCustomize.js',
                    'modules/Searchbar/Searchbar.js',
                    'modules/SearchHistory/SearchHistory.js',
                    'modules/Helper/Helper.js',
                    'modules/Tip/Tip.js',
                    'modules/ConnectionMessage/ConnectionMessage.js',
                    'modules/SmartFolder/SmartFolder.js',
                    'js/helpers/Storage.js',
                    'js/plugins/Scroll.js',
                    'js/external/uuid.js',
                    'js/api/apiv2.js',
                    'js/api/DoATAPI.js',
                    'js/helpers/EventHandler.js',
                    'js/helpers/Idle.js',
                    'js/plugins/Analytics.js',
                    'js/plugins/APIStatsEvents.js'];
    var css_files = ['css/common.css',
                     'modules/Apps/Apps.css',
                     'modules/BackgroundImage/BackgroundImage.css',
                     'modules/Banner/Banner.css',
                     'modules/Dialog/Dialog.css',
                     'modules/Shortcuts/Shortcuts.css',
                     'modules/ShortcutsCustomize/ShortcutsCustomize.css',
                     'modules/Searchbar/Searchbar.css',
                     'modules/SearchHistory/SearchHistory.css',
                     'modules/Helper/Helper.css',
                     'modules/Tip/Tip.css',
                     'modules/ConnectionMessage/ConnectionMessage.css',
                     'modules/SmartFolder/SmartFolder.css'];
    var head = document.head;

    var scriptLoadCount = 0;
    var cssLoadCount = 0;

    var progressLabel = document.querySelector('#loading-overlay span');
    var progressElement = document.querySelector('#loading-overlay progress');
    var total = js_files.length + css_files.length, counter = 0;

    function updateProgress() {
      var value = Math.floor(((++counter) / total) * 100);
      progressLabel.textContent = value + '%';
      progressElement.value = value;
    }

    function onScriptLoad(event) {
      updateProgress();
      event.target.removeEventListener('load', onScriptLoad);
      if (++scriptLoadCount == js_files.length) {
        EverythingME.start(success);
      } else {
        loadScript(js_files[scriptLoadCount]);
      }
    }

    function onCSSLoad(event) {
      updateProgress();
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
      link.href = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
      link.addEventListener('load', onCSSLoad);
      setTimeout(function appendCSS() { head.appendChild(link); }, 0);
    }

    function loadScript(file) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
      script.defer = true;
      script.addEventListener('load', onScriptLoad);
      setTimeout(function appendScript() { head.appendChild(script) }, 0);
    }

    loadCSS(css_files[cssLoadCount]);
  },

  initEvme: function EverythingME_initEvme(success) {
    Evme.init();
    EvmeFacade = Evme;
    success();
  },

  start: function EverythingME_start(success) {
    if (document.readyState === 'complete') {
      EverythingME.initEvme(success);
    } else {
      window.addEventListener('load', function onload() {
        window.removeEventListener('load', onload);
        EverythingME.initEvme(success);
      });
    }
  },

  destroy: function EverythingME_destroy() {
    // Deleting all resources of everything.me from DOM
    var list = document.querySelectorAll('head > [href*="everything.me"]');
    for (var i = 0; i < list.length; i++) {
      var resource = list[i];
      resource.parentNode.removeChild(resource);
    }
  }
};

var EvmeFacade = {
  onHideStart: function onHideStart() {
    return false;
  }
};
