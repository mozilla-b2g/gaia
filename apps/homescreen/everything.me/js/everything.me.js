var EverythingME = {

  displayed: false,

  pageHideBySwipe: false,

  init: function EverythingME_init() {
    var footerStyle = document.querySelector('#footer').style;
    footerStyle.MozTransition = '-moz-transform .3s ease';
    
    var self = this,
        page = document.getElementById('landing-page'),
        activationIcon = document.getElementById('evme-activation-icon');

    activationIcon.innerHTML = '<input type="text" x-inputmode="verbatim" data-l10n-id="evme-searchbar-default" />';
    navigator.mozL10n.ready(function loadSearchbarValue() {
      var input = activationIcon.querySelector('input'),
          defaultText = navigator.mozL10n.get('evme-searchbar-default2') || '';

      input.setAttribute('placeholder', defaultText);
    });

    activationIcon.addEventListener('click', onClick);
    activationIcon.addEventListener('contextmenu', onContextMenu);

    page.addEventListener('gridpageshowend', function onPageShow() {
      EvmeFacade.onShow();
    });
    page.addEventListener('gridpagehideend', function onPageHide() {
      EvmeFacade.onHide();
    });

    function onClick(e) {
      this.removeEventListener('click', onClick);
      this.removeEventListener('contextmenu', onContextMenu);
      self.activate();
    }

    function onContextMenu(e) {
      e.stopPropagation();
    }
  },
  
  activate: function EverythingME_activate(e) {
    document.body.classList.add('evme-loading');

    this.load(function onEvmeLoaded() {
      var page = document.getElementById('evmeContainer'),
          landingPage = document.getElementById('landing-page'),
          activationIcon = document.getElementById('evme-activation-icon'),
          input = activationIcon.querySelector('input'),
          existingQuery = input && input.value;
      
      landingPage.appendChild(page.parentNode.removeChild(page));
      EvmeFacade.onShow();
      
      // set the query the user entered before loaded
      input = document.getElementById('search-q');
      if (input) {
        if (existingQuery) {
          EvmeFacade.searchFromOutside(existingQuery);
        }

        EvmeFacade.Searchbar && EvmeFacade.Searchbar.focus && EvmeFacade.Searchbar.focus();
        input.setSelectionRange(existingQuery.length, existingQuery.length);
      }

      document.body.classList.remove('evme-loading');
      
      activationIcon.parentNode.removeChild(activationIcon);
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
                    'modules/Location/Location.js',
                    'modules/Shortcuts/Shortcuts.js',
                    'modules/ShortcutsCustomize/ShortcutsCustomize.js',
                    'modules/Searchbar/Searchbar.js',
                    'modules/SearchHistory/SearchHistory.js',
                    'modules/Helper/Helper.js',
                    'modules/ConnectionMessage/ConnectionMessage.js',
                    'modules/SmartFolder/SmartFolder.js',
                    'modules/Tasker/Tasker.js',
                    'modules/Features/Features.js',
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
                     'modules/Shortcuts/Shortcuts.css',
                     'modules/ShortcutsCustomize/ShortcutsCustomize.css',
                     'modules/Searchbar/Searchbar.css',
                     'modules/Helper/Helper.css',
                     'modules/ConnectionMessage/ConnectionMessage.css',
                     'modules/SmartFolder/SmartFolder.css'];
    var head = document.head;

    var scriptLoadCount = 0;
    var cssLoadCount = 0;

    var progressLabel = document.querySelector('#loading-overlay span');
    var progressElement = document.querySelector('#loading-overlay progress');
    var total = js_files.length + css_files.length, counter = 0;

    function onScriptLoad(event) {
      event.target.removeEventListener('load', onScriptLoad);
      if (++scriptLoadCount == js_files.length) {
        EverythingME.start(success);
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
  onShow: function onShow() {
    return false;
  },
  onHide: function onHide() {
    return false;
  }
};
