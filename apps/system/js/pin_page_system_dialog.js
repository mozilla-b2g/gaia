/* global SystemDialog, Service, GaiaPinCard, LazyLoader, BookmarksDatabase */
'use strict';

(function(exports) {

  /**
   * @class PinPageSystemDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var PinPageSystemDialog = function(controller) {
    this.instanceID = 'pin-page-dialog';
    this.controller = controller || {};
    this.options = {};
    LazyLoader.load('shared/elements/gaia-component/gaia-component.js')
      .then(() => {
        var webComponents = [
          'shared/elements/gaia-site-icon/script.js',
          'shared/elements/gaia-button/gaia-button.js',
          'shared/elements/gaia-dialog/gaia-dialog.js',
          'shared/elements/gaia-toast/gaia-toast.js'
        ];
        LazyLoader.load(webComponents)
          .then(() => {
            this.render();
            this._banner = document.createElement('gaia-toast');
            this._banner.className = 'banner';
            this._banner.dataset.zIndexLevel = 'system-notification-banner';
            var message = document.createElement('p');
            var l10nId = 'site-pinned-to-home-screen';
            message.setAttribute('data-l10n-id', l10nId);
            this._banner.appendChild(message);
            this.element.appendChild(this._banner);
        });
      });

    this.publish('created');
  };

  PinPageSystemDialog.prototype = Object.create(SystemDialog.prototype, {
    visible: {
      configurable: false,
      get: function() {
        return this._visible;
      }
    }
  });

  PinPageSystemDialog.prototype.customID = 'pin-page-dialog';

  PinPageSystemDialog.prototype.DEBUG = false;

  PinPageSystemDialog.prototype.name = 'PinPageSystemDialog';

  PinPageSystemDialog.prototype.view = function spd_view() {
    return `<gaia-dialog id="${this.instanceID}">
              <div class="dialog" data-z-index-level="system-dialog">
                <gaia-header id="pin-page-header" action="close">
                  <h1 id="pin-page-header" data-l10n-id="pinning-pin"></h1>
                </gaia-header>
                <div id="pin-page-container" class="container">
                  <div id="pin-card-container"></div>
                  <span id="pin-page-title" class="page-title" dir="ltr"></span>
                  <gaia-button data-action="pin-page" class="centered">
                    <i data-icon="pin" aria-hidden="true"></i>
                    <span data-l10n-id="pinning-pin-page"></span>
                  </gaia-button>
                  <div class="divider"><span data-l10n-id="or"></span></div>
                </div>
                <div id="pin-site-container" class="container">
                  <gaia-app-icon></gaia-app-icon>
                  <span id="site-name"></span>
                  <gaia-button data-action="pin-site" class="centered">
                    <i data-icon="pin" aria-hidden="true"></i>
                    <span data-l10n-id="pinning-pin-site"></span>
                  </gaia-button>
                </div>
              </div>
            </gaia-dialog>`;
  };

  PinPageSystemDialog.prototype.onHide = function() {
    this._visible = false;
    this.controller.onHide && this.controller.onHide();
  };

  PinPageSystemDialog.prototype._registerEvents = function() {
    this.header.addEventListener('action', function() {
      this.element.close();
    }.bind(this));
    this.element.addEventListener('closed', this.hide.bind(this));
    this.pinPageButton.addEventListener('click', this.save.bind(this));
    this.pinSiteButton.addEventListener('click', this.save.bind(this));
  };

  PinPageSystemDialog.prototype._fetchElements = function spl_initElements() {
    this.element = document.querySelector('#' + this.instanceID);
    this.pageTitle = this.element.querySelector('#pin-page-title');
    this.pinCardContainer = this.element.querySelector('#pin-card-container');
    this.header = this.element.querySelector('gaia-header');
    var pinSelector = 'gaia-button[data-action="pin-page"]';
    this.pinPageButton = this.element.querySelector(pinSelector);
    this.pageButtonSpan = this.pinPageButton.querySelector('span');
    this.pageButtonIcon = this.pinPageButton.querySelector('i');
    this.siteBadge = this.element.querySelector('gaia-app-icon');
    this.siteName = this.element.querySelector('#site-name');
    pinSelector = 'gaia-button[data-action="pin-site"]';
    this.pinSiteButton = this.element.querySelector(pinSelector);
    this.siteButtonSpan = this.pinSiteButton.querySelector('span');
    this.siteButtonIcon = this.pinSiteButton.querySelector('i');
  };

  PinPageSystemDialog.prototype._renderPinCard = function renderPinCard(data) {
    this.data = data;
    this.card = new GaiaPinCard();
    this.card.title = data.title;
    if (data.icon) {
      this.card.icon = 'url(' + URL.createObjectURL(data.icon) + ')';
    }

    this.pinCardContainer.innerHTML = '';

    this.card.meta = data.meta;
    this.pinCardContainer.appendChild(this.card);
  };

  PinPageSystemDialog.prototype.save = function(evt) {
    var action = evt.target.dataset.action;
    var activeApp = Service.query('getTopMostWindow');
    switch (action) {
      case 'pin-page':
        activeApp.appChrome.pinPage();
        break;

      case 'unpin-page':
        activeApp.appChrome.unpinPage();
        break;

      case 'pin-site':
        activeApp.appChrome.pinSite();
        break;

      case 'unpin-site':
        activeApp.appChrome.unpinSite();
        break;
    }

    this.element.close();
  };

  PinPageSystemDialog.prototype._visible = false;

  PinPageSystemDialog.prototype.handleEvent = function(evt) {
    switch(evt.type) {
      case 'pin-page-dialog-requestopen':
        this.show(evt.detail);
        break;

      case 'appwillclose':
        if (evt.detail === this.currentApp) {
          this.close();
        }
        break;
    }
  };

  PinPageSystemDialog.prototype.show = function(data) {
    this.currentApp = data.app;
    this.pageTitle.textContent = data.title;
    this._renderPinCard(data);
    this._renderSitePanel(data);
    SystemDialog.prototype.show.apply(this);
    this.element.open();
    this._visible = true;
  };

  PinPageSystemDialog.prototype._renderSitePanel = function(data) {
    var siteBadge = this.siteBadge;
    siteBadge.classList.add('default');
    siteBadge.addEventListener('icon-loaded', function onLoad() {
      siteBadge.removeEventListener('icon-loaded', onLoad);
      siteBadge.classList.remove('default');
      siteBadge.refresh();
    });
    siteBadge.icon = data.icon;
    this.siteName.textContent = data.name;

    Service.request('Places:isPinned', data.url)
      .then((isPinned) => {
        var action = isPinned ? 'unpin-page' : 'pin-page';
        this.pageButtonSpan.setAttribute('data-l10n-id', 'pinning-' + action);
        this.pageButtonIcon.setAttribute('data-icon', action.split('-')[0]);
        this.pinPageButton.dataset.action = action;
      });

    BookmarksDatabase.get(data.url).then((site) => {
      var action = site ? 'unpin-site' : 'pin-site';
      if (!site) {
        var scope = Service.query('getScope', data.url);
        if (scope && Service.query('getTopMostWindow').inScope(scope)) {
          action = 'unpin-site';
        }
      }
      this.siteButtonSpan.setAttribute('data-l10n-id', 'pinning-' + action);
      this.siteButtonIcon.setAttribute('data-icon', action.split('-')[0]);
      this.pinSiteButton.dataset.action = action;
    });
  };

  PinPageSystemDialog.prototype.hide = function() {
    this._visible = false;
    this.currentApp = null;
    SystemDialog.prototype.hide.apply(this);
  };

  PinPageSystemDialog.prototype.updateHeight = function() {
    var height = Service.query('LayoutManager.height');
    this.containerElement.style.height = height + 'px';
    // We need to manually set the gaia-dialog height,
    // as it is fixed positioned
    this.element.style.height = height + 'px';
    this.debug('updateHeight: new height = ' + height);
  };

  SystemDialog.prototype.updateWidth = function sd_updateWidth() {
    var width = Service.query('LayoutManager.width');
    this.containerElement.style.width = width + 'px';
    // We need to manually set the gaia-dialog width,
    // as it is fixed positioned
    this.element.style.width = width + 'px';
    this.debug('updateWidth: new width = ' + width);
  };

  PinPageSystemDialog.prototype.close = function() {
    this.publish('close');
    this.hide();
  };

  PinPageSystemDialog.prototype._start = function() {
    window.addEventListener('pin-page-dialog-requestopen', this);
    window.addEventListener('appwillclose', this);
  };

  PinPageSystemDialog.prototype._stop = function() {
    window.removeEventListener('pin-page-dialog-requestopen', this);
    window.removeEventListener('appwillclose', this);
  };

  PinPageSystemDialog.prototype.destroy = function() {
    this.stop();
    SystemDialog.prototype.destroy.apply(this);
  };

  exports.PinPageSystemDialog = PinPageSystemDialog;
}(window));
