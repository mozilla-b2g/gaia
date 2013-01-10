var EverythingME = {

  displayed: false,

  pageHideBySwipe: false,

  init: function EverythingME_init() {
    var footerStyle = document.querySelector('#footer').style;
    footerStyle.MozTransition = '-moz-transform .3s ease';

    var page = document.getElementById('evmePage');
    page.addEventListener('gridpageshowend', function onpageshow() {
      page.removeEventListener('gridpageshowend', onpageshow);

      document.querySelector('#loading-overlay .loading-icon').
                                                    classList.remove('frozen');

      EverythingME.displayed = true;
      footerStyle.MozTransform = "translateY(75px)";

      page.addEventListener('gridpageshowend', function onpageshowafterload() {
        if (EverythingME.displayed) return;

        EverythingME.displayed = true;
        footerStyle.MozTransform = "translateY(75px)";
        EvmeFacade.onShow();
      });

      EverythingME.load(function success() {
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

  load: function EverythingME_load(onSuccess) {
    // ready the main Evme object- all Evme modules should be added to it
    window.Evme = {};
    
    var CB = !('ontouchstart' in window),
        js_files = [
                    // the first file will load atfer everything else is done
                    'js/Core.js',
                    
                    'js/etmmanager.js',
                    'config/config.js',
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
                    'js/developer/utils.1.3.js',
                    'js/plugins/Scroll.js',
                    'js/external/iscroll.js',
                    'js/developer/log4js2.js',
                    'js/api/apiv2.js',
                    'js/api/DoATAPI.js',
                    'js/helpers/Utils.js',
                    'js/helpers/EventHandler.js',
                    'js/helpers/Idle.js',
                    'js/plugins/Analytics.js',
                    'js/plugins/APIStatsEvents.js'],
                    
        css_files = ['css/common.css',
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
                     'modules/SmartFolder/SmartFolder.css'],
                     
        filesLoaded = 0;
    
    // load all the JS files EXCEPT FOR THE FIRST ONE
    // the first one will load when all the rest is done
    function loadJS() {
        for (var i=1,file; file=js_files[i++];) {
            createJS(file);
        }
    }

    // load all the CSS files together
    function loadCSS() {
        for (var i=0,file; file=css_files[i++];) {
            createCSS(file);
        }
    }
    
    // fires each time a JS file is loaded
    // once all of the files are loaded, we load the first one
    // which has dependecies
    function onJSLoad(e) {
        filesLoaded++;
        
        if (filesLoaded === js_files.length-1) {
            createJS(js_files[0]);
        } else if (filesLoaded === js_files.length) {
            EverythingME.start(onSuccess);
        }
    }
    
    function createCSS(file) {
      var elLink = document.createElement('link');
      elLink.type = 'text/css';
      elLink.rel = 'stylesheet';
      elLink.href = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
      window.setTimeout(function() {
        document.head.appendChild(elLink);
      }, 0);
    }

    function createJS(file) {
      var elScript = document.createElement('script');
      elScript.type = 'text/javascript';
      elScript.src = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
      elScript.defer = true;
      elScript.addEventListener('load', onJSLoad);
      window.setTimeout(function() {
        document.head.appendChild(elScript);
      }, 0);
    }
    
    loadCSS();
    loadJS();
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
  }
};

var EvmeFacade = {
  onHideStart: function onHideStart() {
    return false;
  }
};

EverythingME.init();
