var EverythingME = {

  displayed: false,

  init: function EverythingME_init() {
    var footerStyle = document.querySelector('#footer').style;
    footerStyle.MozTransition = '-moz-transform .3s ease';

    var page = document.getElementById('evmePage');
    page.addEventListener('gridpageshowend', function onpageshow() {
      page.removeEventListener('gridpageshowend', onpageshow);
      document.querySelector('#loading-overlay .loading-icon').
                                                    classList.remove('frozen');
      EverythingME.displayed = true;
      page.addEventListener('gridpageshowend', function onpageshowafterload() {
        EverythingME.displayed = true;
        footerStyle.MozTransform = 'translateY(75px)';
        EvmeFacade.setOpacityBackground(1);
      });

      footerStyle.MozTransform = 'translateY(75px)';

      setTimeout(function loading() {
        EverythingME.load(function success() {
          var loadingOverlay = document.querySelector('#loading-overlay');
          loadingOverlay.style.opacity = 0;
          loadingOverlay.addEventListener('transitionend', function tEnd() {
            document.querySelector('#evmeContainer').style.opacity = 1;
            loadingOverlay.removeEventListener('transitionend', tEnd);
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          });
        });
      }, 0);
    });

    page.addEventListener('gridpagehideend', function onpagehide() {
      EverythingME.displayed = false;
      footerStyle.MozTransform = 'translateY(0)';
      EvmeFacade.setOpacityBackground(0);
    });

    page.addEventListener("contextmenu", function longPress(evt) {
        evt.stopImmediatePropagation();
    });
  },

  load: function EverythingME_load(success) {
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
      event.target.removeEventListener('load', onScriptLoad);
      scriptLoadCount += 1;
      if (scriptLoadCount == js_files.length) {
        EverythingME.start(success);
      }
    }

    for each (var file in js_files) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'everything.me/' + file;
      script.defer = true;
      script.addEventListener('load', onScriptLoad);
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

  initEvme: function EverythingME_initEvme(success) {
    Evme.init();
    EvmeFacade = Evme;

    if (this.displayed) {
      EvmeFacade.setOpacityBackground(1);
    }

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
  }
};

var EvmeFacade = {
  setOpacityBackground: function() {}
}

EverythingME.init();
