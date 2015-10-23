/* global BookmarksDatabase */
/* global eventSafety */
/* global IconsHelper */
/* global LazyLoader */
/* global ModalDialog */
/* global MozActivity */
/* global SettingsListener */
/* global Service */
/* global SystemBanner */

'use strict';

(function(exports) {
  const PINNING_PREF = 'dev.gaia.pinning_the_web';
  // 32px + 4px padding added by the Icon renderer
  const ICON_SIZE = 32 + 4;
  const PREVIEW_ICON_SIZE = 64;

  var _id = 0;

  var newTabManifestURL = null;
  SettingsListener.observe('rocketbar.newTabAppURL', '',
    function(url) {
      // The application list in applications.js is not yet ready, so we store
      // only the manifestURL for now and we look up the application whenever
      // we trigger a new window.
      newTabManifestURL = url ? url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp' : '';
    });

  /**
   * The chrome UI of the AppWindow.
   *
   * @class AppChrome
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  var AppChrome = function AppChrome(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    this._themeChanged = false;
    this.scrollable = app.browserContainer;
    this._currentOrigin = app.origin || '';
    this._currentIconUrl = '';
    this.render();

    if (this.app.themeColor && this.app.themeColor !== '') {
      // If titlestatechanged is fired during creation, appChrome won't have
      // been set yet.
      app.appChrome = this;

      this._themeChanged = true;
      this.setThemeColor(this.app.themeColor);
    }

    this.reConfig();
  };

  AppChrome.prototype = Object.create(window.BaseUI.prototype);

  AppChrome.prototype.CLASS_NAME = 'AppChrome';

  AppChrome.prototype.EVENT_PREFIX = 'chrome';

  AppChrome.prototype._DEBUG = false;

  AppChrome.prototype.reConfig = function() {
    var chrome = this.app.config.chrome;
    if (!chrome) {
      return;
    }

    this.pinned = chrome.pinned || false;
    this.debug('AppChrome#' + this.app.instanceID + ', pinned ' + this.pinned);

    if (this.isSearchApp()) {
      this._fixedTitle = true;
      this.app.element.classList.add('search-app');
    } else {
      this._fixedTitle = false;
      this.app.element.classList.remove('search-app');

      if (!this.app.isHomescreen) {
        this.title.textContent = this.app.name;
      }
    }

    if (this.app.isHomescreen || this.isSearchApp()) {
      this.title.setAttribute('data-l10n-id', 'search-or-enter-address');
    }

    if (chrome.bar) {
      this.app.element.classList.add('bar');
      this.bar.classList.add('visible');
    }

    if (chrome.scrollable) {
      this.app.element.classList.add('collapsible');

      if (this.app.isPrivateBrowser()) {
        this.element.classList.add('private');
      } else if (!this.app.themeColor) {
        this.app.element.classList.add('light');
      }

      this.scrollable.scrollgrab = true;
    }

    if (chrome.maximized) {
      this.expand();

      if (!this.app.isBrowser() && !this.app.isHomescreen) {
        this.app.element.classList.add('scrollable');
      }
    }

    this.setSiteIcon();
  };

  AppChrome.prototype.combinedView = function an_combinedView() {
    var className = this.CLASS_NAME + this.instanceID;

    return `<div class="chrome chrome-combined" id="${className}">
              <gaia-progress></gaia-progress>
              <section role="dialog" class="pin-dialog hidden">
                <header>
                  <h2 class="pin-type" data-l10n-id="pinning-pin-type"></h2>
                </header>
                <div class="card-container">
                  <div class="pin-site-icon"></div>
                  <h2 class="pin-site-name"></h2>
                </div>
                <div class="footer-container">
                  <button data-l10n-id="pinning-pin" data-action="pin"
                    class="pin-button">
                    Pin
                  </button>
                  <footer>
                    <span data-l10n-id="from">from</span>
                    <span class="origin"></span>
                  </footer>
                </div>
              </section>
              <div class="pin-scrim"></div>
              <div class="controls">
                <button type="button" class="back-button"
                        data-l10n-id="back-button" disabled></button>
                <button type="button" class="forward-button"
                        data-l10n-id="forward-button" disabled></button>
                <div class="urlbar js-chrome-ssl-information">
                  <div class="urlbar-hit-area"></div>
                  <span class="pb-icon"></span>
                  <div class="site-icon"></div>
                  <div class="chrome-ssl-indicator chrome-title-container">
                    <span class="title" dir="auto"></span>
                  </div>
                  <button type="button" class="reload-button"
                          data-l10n-id="reload-button" disabled></button>
                  <button type="button" class="stop-button"
                          data-l10n-id="stop-button"></button>
                </div>
                <button type="button" class="menu-button" alt="Menu"></button>
                <button type="button" class="windows-button"
                        data-l10n-id="windows-button"></button>
              </div>
            </div>`;
  };

  AppChrome.prototype.view = function an_view() {
    var className = this.CLASS_NAME + this.instanceID;

    return `<div class="chrome chrome-plain" id="${className}">
            <gaia-progress></gaia-progress>
            <section role="region" class="bar">
              <gaia-header action="close" class='js-chrome-ssl-information'>
                <div class="chrome-ssl-indicator chrome-ssl-indicator-ltr">
                </div>
                <h1 class="chrome-title-container">
                  <bdi dir="auto" class="title"></bdi>
                </h1>
                <div class="chrome-ssl-indicator chrome-ssl-indicator-rtl">
                </div>
              </gaia-header>
            </section>
          </div>`;
  };

  AppChrome.prototype.overflowMenuView = function an_overflowMenuView() {
    var template = `<gaia-overflow-menu>

     <button id="new-window" data-l10n-id="new-window">
     </button>

     <button id="new-private-window" data-l10n-id="new-private-window">
     </button>

     <button id="add-to-home" data-l10n-id="add-to-home-screen" hidden>
     </button>

     <button id="share" data-l10n-id="share">
     </button>

    </gaia-overflow-menu>`;
    return template;
  };

  AppChrome.prototype.__defineGetter__('height', function ac_getHeight() {
    if (this._height) {
      return this._height;
    }

    this._height = this.element.getBoundingClientRect().height;
    return this._height;
  });

  AppChrome.prototype._fetchElements = function ac__fetchElements() {
    this.element = this.containerElement.querySelector('.chrome');

    this.progress = this.element.querySelector('gaia-progress');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.stopButton = this.element.querySelector('.stop-button');
    this.backButton = this.element.querySelector('.back-button');
    this.menuButton = this.element.querySelector('.menu-button');
    this.windowsButton = this.element.querySelector('.windows-button');
    this.title = this.element.querySelector('.chrome-title-container > .title');
    this.urlbar = this.element.querySelector('.urlbar');
    this.siteIcon = this.element.querySelector('.site-icon');
    LazyLoader.load(['js/system_banner.js']).then(function() {
      this.systemBanner = new SystemBanner();
    }.bind(this));

    if (this.useCombinedChrome()) {
      this.pinDialog = this.element.querySelector('.pin-dialog');
      this.pinButton = this.element.querySelector('.pin-button');
      this.originElement = this.pinDialog.querySelector('.origin');
      this.pinCardContainer = this.pinDialog.querySelector('.card-container');
      this.pinSiteIcon = this.pinCardContainer.querySelector('.pin-site-icon');
      this.pinSiteName = this.pinCardContainer.querySelector('.pin-site-name');
      this.pinType = this.pinDialog.querySelector('.pin-type');
      this.pinScrim = this.element.querySelector('.pin-scrim');
    }

    this.sslIndicator =
      this.element.querySelector('.js-chrome-ssl-information');

    this.bar = this.element.querySelector('.bar');
    if (this.bar) {
      this.header = this.element.querySelector('gaia-header');
    }

    if (this.reloadButton) {
      this.reloadButton.disabled = !this.hasNavigation();
    }
  };

  AppChrome.prototype.handleEvent = function ac_handleEvent(evt) {
    switch (evt.type) {
      case 'rocketbar-overlayclosed':
        window.removeEventListener('rocketbar-overlayclosed', this);
        this.collapse();
        break;

      case 'rocketbar-activating':
        this.hidePinDialogCard();
        break;

      case 'click':
        this.handleClickEvent(evt);
        break;

      case 'action':
        this.handleActionEvent(evt);
        break;

      case 'scroll':
        this.handleScrollEvent(evt);
        break;

      case '_loading':
        this.show(this.progress);
        this.progress.start();
        break;

      case '_loaded':
        this.hide(this.progress);
        this.progress.stop();
        break;

      case 'mozbrowserloadstart':
        this.handleLoadStart(evt);
        break;

      case 'mozbrowserloadend':
        this.handleLoadEnd(evt);
        break;

      case 'mozbrowsererror':
        this.handleError(evt);
        break;

      case '_locationchange':
        this.hidePinDialogCard();
        this.handleLocationChange();
        break;

      case 'mozbrowserscrollareachanged':
        this.handleScrollAreaChanged(evt);
        break;

      case '_securitychange':
        this.handleSecurityChanged(evt);
        break;

      case '_namechanged':
        this.handleNameChanged();
        break;

      case 'mozbrowsermetachange':
        this.handleMetaChange(evt);
        break;
      case 'pins-scopechange':
        this.handleBookmarksScopeChange(evt);
        break;
    }
  };

  AppChrome.prototype.handleClickEvent = function ac_handleClickEvent(evt) {
    evt.stopPropagation(); // We'll handle all clicks here, thanks.

    switch (evt.currentTarget) {
      case this.reloadButton:
        this.app.reload();
        break;

      case this.stopButton:
        this.app.stop();
        break;

      case this.backButton:
        this.app.back();
        break;

      case this.forwardButton:
        this.app.forward();
        break;

      case this.siteIcon:
        evt.stopImmediatePropagation();
        this.onClickSiteIcon();
        break;

      case this.urlbar:
      case this.title:
        this.titleClicked();
        break;

      case this.menuButton:
        this.showOverflowMenu();
        break;

      case this.windowsButton:
        this.showWindows();
        break;

      case this.newWindowButton:
        evt.stopImmediatePropagation();
        // XXX: this isn't a function!
        // this.onNewWindow();
        break;

      case this.newPrivateWinButton:
        // Currently not in use, awaiting shared menu web components work.
        evt.stopImmediatePropagation();
        this.onNewPrivateWindow();
        break;

      case this.addToHomeButton:
        evt.stopImmediatePropagation();
        this.onAddToHome();
        break;

      case this.shareButton:
        evt.stopImmediatePropagation();
        this.onShare();
        break;

      case this.pinButton:
        if (this.pinButton.dataset.action == 'unpin') {
          this.unpinSite();
        } else {
          this.pinSite();
        }
        break;

      case this.pinScrim:
        this.hidePinDialogCard();
        break;
    }
  };

  /**
   * Pin current page in places database.
   */
  AppChrome.prototype.pinPage = function ac_pinPage() {
    Service && Service.request('Places:setPinned', this.app.config.url, true)
      .then(() => {
      this.app.debug('Succeeding in pinning ' + this.app.config.url);
      this.systemBanner.show('page-pinned-to-home-screen');
      var screenshotBlob = this.app.getCachedScreenshotBlob();
      if (screenshotBlob) {
        Service.request('Places:saveScreenshot', this.app.config.url,
                        screenshotBlob);
      }
      if (this._themeChanged) {
        Service.request('Places:saveThemeColor', this.app.config.url,
                        this.app.themeColor, true);
      }
    }, () => {
      console.error('Failed to pin ' + this.app.config.url);
    });
  };

  /**
   * Unpin current page in places database.
   */
  AppChrome.prototype.unpinPage = function ac_unpinPage() {
    Service && Service.request('Places:setPinned', this.app.config.url, false)
      .then(() => {
        this.app.debug('Succeeding in unpinning ' + this.app.config.url);
        this.systemBanner.show('page-unpinned-from-home-screen');
      }, () => {
        console.error('Failed to unpin ' + this.app.config.url);
      });
  };

  AppChrome.prototype.getSiteUrl = function() {
    var pageUrl = this.app.config.url;
    var webManifest = this.app.webManifest;
    var startURL = (webManifest && this.app.webManifest.start_url) ?
      new URL(this.app.webManifest.start_url, pageUrl) : null;
    return startURL ? startURL.href : pageUrl;
  };

  /**
   * Pin current site in bookmarks database.
   */
  AppChrome.prototype.pinSite = function ac_pinSite() {
    var siteObject = {};
    var manifestURL = this.app.webManifestURL;
    var manifestObject = this.app.webManifest;
    var pageURL = new URL(this.app.config.url);
    var scope = pageURL.origin + '/';
    var hostname = pageURL.hostname;

    siteObject.type = 'url';
    siteObject.iconable = false;
    siteObject.icons = this.app.favicons;
    siteObject.frecency = 1;
    siteObject.pinned = true;
    siteObject.pinnedFrom = pageURL.href;

    var siteUrl = this.getSiteUrl();
    siteObject.id = siteUrl;
    siteObject.url = siteUrl;

    if (manifestURL && manifestObject) {
      siteObject.webManifestUrl = manifestURL;
      siteObject.webManifest = manifestObject;
      siteObject.name = manifestObject.short_name || manifestObject.name ||
        hostname;
      if (manifestObject.scope) {
        var scopeURL = new URL(manifestObject.scope, pageURL);
        siteObject.scope = scopeURL.origin + scopeURL.pathname;
      } else {
        siteObject.scope = scope;
      }
    } else {
      siteObject.name = this.app.name || hostname;
      siteObject.scope = scope;
    }

    // Set the .icon property before saving for
    // backwards compatibility with verticalhome
    IconsHelper.getIcon(siteObject.url, null,
      {icons: this.app.favicons}, siteObject).then(icon => {
        siteObject.icon = icon;
        BookmarksDatabase.put(siteObject, siteObject.id)
          .then(() => {
            this.app.debug('pinSite: ' + siteObject.id);
            this.systemBanner.show('site-pinned-to-home-screen');
          })
          .catch((error) => {
            console.error('pinSite, Failed to pin site: ' + error);
          });
      });
  };

  /**
   * Unpin current site from bookmarks database.
   */
  AppChrome.prototype.unpinSite = function ac_pinSite() {
    if (!this.pinned) {
      return;
    }
    var siteId = this.getSiteUrl();
    BookmarksDatabase.remove(siteId)
      .then(() => {
        this.app.debug('unpinSite: ' + siteId);
        this.systemBanner.show('site-unpinned-from-home-screen');
        // 'removed' listener will call unpin()
      }, (evt) => {
        this.app.debug('unpinSite, unpinning cancelled for: ' + siteId);
      });
  };

  /**
   * Put browser chrome in pinned state.
   */
  AppChrome.prototype.pin = function ac_pin() {
    this.hidePinDialogCard();
    this.collapse();
    this.pinned = true;
    this.app.element.classList.remove('collapsible');
  };

  /**
   * Remove pinned state from the browser.
   */
  AppChrome.prototype.unpin = function ac_unpin() {
    this.hidePinDialogCard();
    this.pinned = false;
    if (this.app.config && this.app.config.chrome.scrollable) {
      this.app.element.classList.add('collapsible');
    }
    this.expand();
  };

  AppChrome.prototype.titleClicked = function ac_titleClicked() {
    var contextMenu = this.app.contextmenu && this.app.contextmenu.isShown();
    var locked = Service && Service.query('locked');

    if (locked || contextMenu) {
      return;
    }

    if (!this.isMaximized() && this.app.isBrowser()) {
      if (this.pinned) {
        this.app.element.classList.add('collapsible');
        this.scrollable.scrollTop = 0;
      }
      this.maximize();
    } else {
      window.dispatchEvent(new CustomEvent('global-search-request'));
    }
  };

  AppChrome.prototype.onClickSiteIcon = function onClickSiteIcon() {
    if (!this.app.isBrowser() || this.app.loading || !this.isMaximized()) {
      this.app.debug('Pinning is only enabled in the browser');
      return;
    }

    if (this.pinDialog.classList.contains('hidden')) {
      this.setPinDialogCard();
    } else {
      this.hidePinDialogCard();
    }
  };

  AppChrome.prototype.setPinDialogCard = function ac_setPinDialogCard() {
    if (this.pinned) {
      navigator.mozL10n.setAttributes(this.pinType, 'pinning-unpin-type', {
        'type': this.app.name
      });
      this.pinButton.setAttribute('data-l10n-id', 'pinning-unpin-site');
      this.pinButton.dataset.action = 'unpin';
    } else {
      navigator.mozL10n.setAttributes(this.pinType, 'pinning-pin-type', {
        'type': this.app.name
      });
      this.pinButton.setAttribute('data-l10n-id', 'pinning-pin');
      this.pinButton.dataset.action = 'pin';
    }
    this.pinSiteName.textContent = this.app.name;
    this.setOrigin();
    this.pinDialog.classList.remove('hidden');
  };

  AppChrome.prototype.setOrigin = function ac_setOrigin() {
    var origin = this._currentOrigin.split('://')[1].split('.');
    var tld = this.originElement.querySelector('.tld');

    if (!tld) {
      tld = document.createElement('span');
      tld.className = 'tld';
    } else {
      tld.remove();
    }

    tld.textContent = origin.slice(origin.length - 2, origin.length).join('.');

    if (origin.length > 2) {
      var subdomains = origin.slice(0, origin.length - 2).join('.');
      this.originElement.textContent = subdomains + '.';
    }

    this.originElement.appendChild(tld);
  };

  AppChrome.prototype.hidePinDialogCard = function ac_hidePinDialogCard(url) {
    this.pinDialog && this.pinDialog.classList.add('hidden');
  };

  AppChrome.prototype.expand = function ac_expand() {
    this.element.classList.add('maximized');
  };

  AppChrome.prototype.collapse = function ac_collapse() {
    this.hidePinDialogCard();
    this.element.classList.remove('maximized');
  };

  AppChrome.prototype.handleActionEvent = function ac_handleActionEvent(evt) {
    if (evt.detail.type === 'close') {
      this.app.kill();
    }
  };

  AppChrome.prototype.handleScrollEvent = function ac_handleScrollEvent(evt) {
    if (!this.containerElement.classList.contains('scrollable')) {
      return;
    }

    // Ideally we'd animate based on scroll position, but until we have
    // the necessary spec and implementation, we'll animate completely to
    // the expanded or collapsed state depending on whether it's at the
    // top or not.
    // XXX Open a bug since I wonder if there is scrollgrab rounding issue
    // somewhere. While panning from the bottom to the top, there is often
    // a scrollTop position of scrollTopMax - 1, which triggers the transition!
    if (this.scrollable.scrollTop >= this.scrollable.scrollTopMax - 1) {
      this.collapse();
      if (this.pinned) {
        this.app.element.classList.remove('collapsible');
      }
    } else if (!this.pinned) {
      this.expand();
    }

    if (this.app.isActive()) {
      this.app.publish('titlestatechanged');
    }
  };

  AppChrome.prototype._pinningObserver = function ac__pinningObserver(enabled) {
    // Disable the pinning doorhanger in 2.5 since we have removed all
    // functionality from it. Beyond 2.5 we will use the doorhanger for
    // Tracking protection and privacy configuration.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=1207710
    var targets = [
      // this.siteIcon, * See comment above. *
      this.pinScrim
    ];
    var method = enabled ? 'addEventListener' : 'removeEventListener';
    targets.forEach(element => {
      element[method]('click', this);
    });
  };

  AppChrome.prototype.handleBookmarksScopeChange = function (evt) {
    var scope = evt.detail.scope;
    if (this.app.inScope(scope)) {
      switch (evt.detail.action) {
        case 'add':
        case 'update':
          this.pin();
          break;
        case 'remove':
          this.unpin();
          break;
        default:
          this.app.debug('Unknown pins-scopechange action: ' +
                         evt.detail.action);
      }
    }
  };

  AppChrome.prototype._registerEvents = function ac__registerEvents() {
    if (this.useCombinedChrome()) {
      LazyLoader.load('shared/js/bookmarks_database.js').then(() => {
        this.updateAddToHomeButton();
      }).catch((err) => {
        console.error(err);
      });
      LazyLoader.load('shared/elements/gaia_overflow_menu/script.js');

      window.addEventListener('pins-scopechange', this);
      window.addEventListener('rocketbar-activating', this);
      this.stopButton.addEventListener('click', this);
      this.reloadButton.addEventListener('click', this);
      this.backButton.addEventListener('click', this);
      this.forwardButton.addEventListener('click', this);
      this.urlbar.addEventListener('click', this);
      this.title.addEventListener('click', this);
      this.scrollable.addEventListener('scroll', this);
      this.menuButton.addEventListener('click', this);
      this.windowsButton.addEventListener('click', this);
      this.pinButton.addEventListener('click', this);

      // Adding or removing the click listener, depending on
      // the 'Pinning the Web' setting enabled or disabled
      this._boundPinningObserver =
        this._boundPinningObserver || this._pinningObserver.bind(this);
      SettingsListener.observe(PINNING_PREF, '', this._boundPinningObserver);

    } else {
      this.header.addEventListener('action', this);
    }

    this.app.element.addEventListener('mozbrowserloadstart', this);
    this.app.element.addEventListener('mozbrowserloadend', this);
    this.app.element.addEventListener('mozbrowsererror', this);
    this.app.element.addEventListener('mozbrowsermetachange', this);
    this.app.element.addEventListener('mozbrowserscrollareachanged', this);
    this.app.element.addEventListener('_locationchange', this);
    this.app.element.addEventListener('_namechanged', this);
    this.app.element.addEventListener('_securitychange', this);
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);

    var element = this.element;

    var animEnd = function(evt) {
      if (evt && evt.target !== element) {
        return;
      }
      var publishEvent = this.isMaximized() ? 'expanded' : 'collapsed';
      this.app.publish('chrome' + publishEvent);
    }.bind(this);

    element.addEventListener('transitionend', animEnd);
  };

  AppChrome.prototype._unregisterEvents = function ac__unregisterEvents() {

    if (this.useCombinedChrome()) {
      window.removeEventListener('pins-scopechange', this);
      window.removeEventListener('rocketbar-activating', this);
      this.stopButton.removeEventListener('click', this);
      this.menuButton.removeEventListener('click', this);
      this.windowsButton.removeEventListener('click', this);
      this.pinButton.removeEventListener('click', this);
      this.reloadButton.removeEventListener('click', this);
      this.backButton.removeEventListener('click', this);
      this.forwardButton.removeEventListener('click', this);
      this.title.removeEventListener('click', this);
      this.scrollable.removeEventListener('scroll', this);

      SettingsListener.unobserve(PINNING_PREF, this._boundPinningObserver);

      if (this.newWindowButton) {
        this.newWindowButton.removeEventListener('click', this);
      }

      if (this.addToHomeButton) {
        this.addToHomeButton.removeEventListener('click', this);
      }

      if (this.shareButton) {
        this.shareButton.removeEventListener('click', this);
      }
    } else {
      this.header.removeEventListener('action', this);
    }

    if (!this.app) {
      return;
    }

    this.app.element.removeEventListener('mozbrowserloadstart', this);
    this.app.element.removeEventListener('mozbrowserloadend', this);
    this.app.element.removeEventListener('mozbrowsererror', this);
    this.app.element.removeEventListener('mozbrowsermetachange', this);
    this.app.element.removeEventListener('_locationchange', this);
    this.app.element.removeEventListener('_namechanged', this);
    this.app.element.removeEventListener('_loading', this);
    this.app.element.removeEventListener('_loaded', this);
    this.app = null;
  };

  // Name has priority over the rest
  AppChrome.prototype.handleNameChanged =
    function ac_handleNameChanged(evt) {
      if (this._fixedTitle) {
        return;
      }
      if (!this.app.isHomescreen && !this.isSearchApp()) {
        this.title.textContent = this.app.name;
      } else {
        this.title.setAttribute('data-l10n-id', 'search-or-enter-address');
      }
    };

  AppChrome.prototype.handleScrollAreaChanged = function(evt) {
    // Make sure the scroll-area-changed is coming from the right element.
    if (evt && (!this.app || !this.app.browser ||
                evt.target !== this.app.browser.element)) {
      return;
    }

    // Check if the page has become scrollable and add the scrollable class.
    // We don't check if a page has stopped being scrollable to avoid oddness
    // with a page oscillating between scrollable/non-scrollable states, and
    // other similar issues that Firefox for Android is still dealing with
    // today.
    if (this.containerElement.classList.contains('scrollable')) {
      return;
    }

    // Cache the last given scroll area height so this function can be called
    // without an event object.
    if (evt) {
      this.browserScrollHeight = evt.detail.height;
    }

    // Don't respond to this event when we aren't visible. The container size
    // isn't updated in this case, which can ending up incorrectly causing it
    // to be labelled as scrollable.
    if (!this.app.isVisible()) {
      return;
    }

    // We allow the bar to collapse if the page is greater than the area of the
    // window with a collapsed bar. Strictly speaking, we'd allow it to
    // collapse if it was greater than the area of the window with the expanded
    // bar, but due to prevalent use of -webkit-box-sizing and plain mistakes,
    // this causes too many false-positives.
    if (this.browserScrollHeight > this.containerElement.clientHeight) {
      this.containerElement.classList.add('scrollable');
    }
  };

  AppChrome.prototype.handleSecurityChanged = function(evt) {
    var sslState = this.app.getSSLState();
    this.sslIndicator.dataset.ssl = sslState;
    this.sslIndicator.classList.toggle(
      'chrome-has-ssl-indicator', sslState === 'broken' || sslState === 'secure'
    );
    if (this.pinDialog) {
      this.pinDialog.classList.toggle('secure', sslState === 'secure');
    }
  };

  AppChrome.prototype.handleMetaChange =
    function ac__handleMetaChange(evt) {
      var detail = evt.detail;
      if (detail.name !== 'theme-color' || !detail.type) {
        return;
      }

      // If the theme-color meta is removed, let's reset the color.
      var color = '';

      // Otherwise, set it to the color that has been asked.
      if (detail.type !== 'removed') {
        color = detail.content;
      }

      this._themeChanged = true;
      this.setThemeColor(color);
      if (!this.app.isHomescreen && this.app.config.url) {
        Service && Service.request('Places:saveThemeColor',
                                   this.app.config.url, color, true);
      }
    };

  AppChrome.prototype.setThemeColor = function ac_setThemColor(color) {
    // Overwrite theme color for private windows and add private class
    if (this.app.isPrivateBrowser()) {
      color = '#392E54';
      this.containerElement.classList.add('private');
    }

    var bottomApp = this.app.getBottomMostWindow();

    if (this.app.CLASS_NAME === 'PopupWindow' &&
      bottomApp &&
      bottomApp.themeColor) {
      color = bottomApp.themeColor;
    }

    this.app.themeColor = color;
    this.element.style.backgroundColor = color;

    if (!this.app.isHomescreen) {
      this.scrollable.style.backgroundColor = color;
    }

    if (color === '') {
      this.app.element.classList.add('light');
      this.app.publish('titlestatechanged');
      return;
    }

    if (color === 'transparent') {
      this.app.element.classList.remove('light');
      this.app.publish('titlestatechanged');
      return;
    }

    var self = this;
    var finishedFade = false;
    var endBackgroundFade = function(evt) {
      if (evt && evt.propertyName != 'background-color') {
        return;
      }
      finishedFade = true;
      if (self.element) {
        self.element.removeEventListener('transitionend', endBackgroundFade);
      }
    };
    eventSafety(this.element, 'transitionend', endBackgroundFade, 1000);

    window.requestAnimationFrame(function updateAppColor() {
      if (finishedFade || !self.element) {
        return;
      }

      var computedColor = window.getComputedStyle(self.element).backgroundColor;
      var colorCodes = /rgb\((\d+), (\d+), (\d+)\)/.exec(computedColor);
      if (!colorCodes || colorCodes.length === 0) {
        return;
      }

      var r = parseInt(colorCodes[1]);
      var g = parseInt(colorCodes[2]);
      var b = parseInt(colorCodes[3]);
      var brightness =
        Math.sqrt((r*r) * 0.241 + (g*g) * 0.691 + (b*b) * 0.068);

      var wasLight = self.app.element.classList.contains('light');
      var isLight = brightness > 200;
      if (wasLight != isLight) {
        self.app.element.classList.toggle('light', isLight);
        self.app.publish('titlestatechanged');
      }
      window.requestAnimationFrame(updateAppColor);
    });
  };

  AppChrome.prototype.render = function() {
    this.publish('willrender');

    var view = this.useCombinedChrome() ? this.combinedView() : this.view();
    this.app.element.insertAdjacentHTML('afterbegin', view);

    this._fetchElements();
    this._registerEvents();
    this.publish('rendered');
  };

  AppChrome.prototype.useLightTheming = function ac_useLightTheming() {
    // The rear window should dictate the status bar color when the front
    // window is a popup.
    if (this.app.CLASS_NAME == 'PopupWindow' &&
        this.app.rearWindow &&
        this.app.rearWindow.appChrome) {
      return this.app.rearWindow.appChrome.useLightTheming();
    }
    // All other cases can use the front window.
    return this.app.element.classList.contains('light');
  };

  AppChrome.prototype.useCombinedChrome = function ac_useCombinedChrome(evt) {
    return this.app.config.chrome && !this.app.config.chrome.bar;
  };

  AppChrome.prototype.updateAddToHomeButton =
    function ac_updateAddToHomeButton() {
      if (!this.addToHomeButton || !BookmarksDatabase) {
        return;
      }

      // Enable/disable the bookmark option
      BookmarksDatabase.get(this._currentURL).then(function resolve(result) {
        this.addToHomeButton.hidden = !!result;
      }.bind(this),
      function reject() {
        this.addToHomeButton.hidden = true;
      }.bind(this));
    };

  AppChrome.prototype.handleLocationChange =
    function ac_handleLocationChange() {
      if (!this.app) {
        return;
      }

      // Check if this is just a location-change to an anchor tag.
      var anchorChange = false;

      if (this._currentURL && this.app.config.url) {
        anchorChange =
          this._currentURL.replace(/#.*/g, '') ===
          this.app.config.url.replace(/#.*/g, '');
      }

      this._currentURL = this.app.config.url;
      if (!this._fixedTitle && !this.app.isHomescreen) {
        this.title.textContent = this.app.name;
      }

      if (this.backButton && this.forwardButton) {
        this.app.canGoForward(function forwardSuccess(result) {
          if (!this.hasNavigation()) {
            return;
          }
          this.forwardButton.disabled = !result;
        }.bind(this));

        this.app.canGoBack(function backSuccess(result) {
          if (!this.hasNavigation()) {
            return;
          }
          this.backButton.disabled = !result;
        }.bind(this));
      }

      this.updateAddToHomeButton();

      // We only change the icon back to the default one if the new page is not
      // on the same domain than the previous one.
      // In both cases, we look for the best icon after `mozbrowserloadend`.
      var origin = new URL(this._currentURL).origin;
      if (this._currentOrigin !== origin) {
        this.setSiteIcon();
        this._currentOrigin = origin;
      }

      if (!this.app.isBrowser()) {
        return;
      }

      if (!anchorChange) {
        // Make the rocketbar unscrollable until the page resizes to the
        // appropriate height.
        this.containerElement.classList.remove('scrollable');

        // Expand
        if (!this.isMaximized()) {
          this.expand();
        }
        this.scrollable.scrollTop = 0;
        Service.request('PinsManager:isPinned', this._currentURL)
          .then((isPinned) => {
            isPinned ? this.pin() : this.unpin();
          });
      }

      // Set the title for the private browser landing page.
      // This is explicitly placed in the locationchange handler as it's
      // currently possibly to navigate back to the landing page with the
      // back button. Otherwise it could be in the constructor.
      if (this.app.isPrivateBrowser() &&
        this.app.config.url.startsWith('app:')) {
        this.title.dataset.l10nId = 'search-or-enter-address';
      }
    };

  AppChrome.prototype.handleLoadStart = function ac_handleLoadStart(evt) {
    this.containerElement.classList.add('loading');
    this._themeChanged = false;
  };

  AppChrome.prototype.handleLoadEnd = function ac_handleLoadEnd(evt) {
    this.containerElement.classList.remove('loading');
    if (!this._themeChanged) {
      this.setThemeColor('');
    }
    this.setSiteIcon();
    this.setPinPreviewIcon();
  };

  AppChrome.prototype.handleError = function ac_handleError(evt) {
    if (evt.detail && evt.detail.type === 'fatal') {
      return;
    }
    if (this.useCombinedChrome() && this.app.config.chrome.scrollable &&
      !this.pinned) {
      // When we get an error, keep the rocketbar maximized.
      this.expand();
      this.containerElement.classList.remove('scrollable');
    }
  };

  AppChrome.prototype.maximize = function ac_maximize(callback) {
    var element = this.element;
    this.expand();
    window.addEventListener('rocketbar-overlayclosed', this);

    if (!callback) {
      return;
    }
    eventSafety(element, 'transitionend', callback, 250);
  };

  AppChrome.prototype.isMaximized = function ac_isMaximized() {
    return this.element.classList.contains('maximized');
  };

  AppChrome.prototype.isSearch = function ac_isSearch() {
    var dataset = this.app.config;
    return dataset.searchURL && this._currentURL === dataset.searchURL;
  };

  AppChrome.prototype.isSearchApp = function() {
    return this.app.config.manifest &&
      this.app.config.manifest.role === 'search';
  };

  AppChrome.prototype.hasNavigation = function ac_hasNavigation(evt) {
    return this.app.isBrowser() ||
      (this.app.config.chrome && this.app.config.chrome.navigation);
  };

  AppChrome.prototype.addBookmark = function ac_addBookmark() {
    var dataset = this.app.config;
    var favicons = this.app.favicons;

    var name;
    if (this.isSearch()) {
      name = dataset.searchName;
    } else {
      name = this.title.textContent;
    }
    var url = this._currentURL;

    LazyLoader.load('shared/js/icons_helper.js').then(() => {
      IconsHelper.getIcon(url, null, {icons: favicons}).then(icon => {
        var activity = new MozActivity({
          name: 'save-bookmark',
          data: {
            type: 'url',
            url: url,
            name: name,
            icon: icon,
            iconable: false
          }
        });

        if (this.addToHomeButton) {
          activity.onsuccess = function onsuccess() {
            this.addToHomeButton.hidden = true;
          }.bind(this);
        }
      });
    }).catch((err) => {
      console.error(err);
    });
  };

  AppChrome.prototype.onAddBookmark = function ac_onAddBookmark() {
    var self = this;
    function selected(value) {
      if (value) {
        self.addBookmark();
      }
    }

    var title = 'add-to-home-screen';
    var options = [];

    if (this.isSearch()) {
      var dataset = this.app.config;
      options.push({
        id: 'search',
        text: {
          raw: dataset.searchName
        }
      });
    } else {
      options.push({
        id: 'origin',
        text: {
          raw: this.title.textContent
        }
      });
    }

    ModalDialog.selectOne(title, options, selected);
  };

  AppChrome.prototype.showWindows = function ac_showWindows() {
    window.dispatchEvent(
      new CustomEvent('taskmanagershow',
                      { detail: { filter: 'browser-only' }})
    );
  };

  AppChrome.prototype.__defineGetter__('overflowMenu',
    // Instantiate the overflow menu when it's needed
    function ac_getOverflowMenu() {
      if (!this._overflowMenu && this.useCombinedChrome() &&
          window.GaiaOverflowMenu) {
        this.app.element.insertAdjacentHTML('afterbegin',
                                            this.overflowMenuView());
        this._overflowMenu = this.containerElement.
          querySelector('gaia-overflow-menu');
        this.newWindowButton = this._overflowMenu.
          querySelector('#new-window');
        this.newPrivateWinButton = this._overflowMenu.
          querySelector('#new-private-window');
        this.addToHomeButton = this._overflowMenu.
          querySelector('#add-to-home');
        this.shareButton = this._overflowMenu.
          querySelector('#share');

        this.newWindowButton.addEventListener('click', this);
        this.newPrivateWinButton.addEventListener('click', this);
        this.addToHomeButton.addEventListener('click', this);
        this.shareButton.addEventListener('click', this);

        this.updateAddToHomeButton();
      }

      return this._overflowMenu;
    });

  AppChrome.prototype.showOverflowMenu = function ac_showOverflowMenu() {
    this.overflowMenu.show();
  };

  AppChrome.prototype.hideOverflowMenu = function ac_hideOverflowMenu() {
    this.overflowMenu.hide();
  };

  /* Bug 1054466 switched the browser overflow menu to use the system style,
   * but we eventually want to switch back to the new style. We can do that
   * by removing this function.
   */
  AppChrome.prototype.showOverflowMenu = function ac_showOverflowMenu() {
    if (this.app.contextmenu) {
      var name = this.isSearch() ?
        this.app.config.searchName : this.title.textContent;
      this.app.contextmenu.showDefaultMenu(newTabManifestURL, name);
    }
  };


  /**
   * Display the website icon in the URL bar, if any.
   * If the url parameter is specified, it is loaded immediately. Otherwise,
   * we look for the best possible icon for this website.
   *
   * @param {string?} url
   */
  AppChrome.prototype.setSiteIcon = function ac_setSiteIcon() {
    if (!this.siteIcon || this.app.isPrivateBrowser()) {
      return;
    }

    this.app.getSiteIconUrl(ICON_SIZE)
      .then(iconObject => {
        // We compare the original icon URL, otherwise there is a flickering
        // effect because a different object url is created each time.
        if (this._currentIconUrl !== iconObject.originalUrl) {
          this.siteIcon.style.backgroundImage = iconObject.url;
          this._currentIconUrl = iconObject.originalUrl;
        }
      })
      .catch((err) => {
        this.siteIcon.style.backgroundImage = '';
        this.app.debug('setSiteIcon, error from getSiteIcon: %s', err);
      });
  };

  /**
   * Populate the pin preview doorhanger with current site/app icon.
   */
  AppChrome.prototype.setPinPreviewIcon = function ac_setPinPreviewIcon() {
    if (!this.pinSiteIcon) {
      return;
    }
    this.app.getSiteIconUrl(PREVIEW_ICON_SIZE).then(iconObject => {
      this.pinSiteIcon.style.backgroundImage = iconObject.url;
    }).catch((err) => {
      this.app.debug('setPinPreviewIcon, error from getSiteIcon: %s', err);
      this.pinSiteIcon.style.backgroundImage = '';
    });
  };

  exports.AppChrome = AppChrome;
}(window));
