/* global SystemDialog, Service, GaiaPinCard, LazyLoader */
'use strict';

(function(exports) {

  var pinDialogInstance;

  /**
   * @class PinPageSystemDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var PinPageSystemDialog = function(controller) {
    if (pinDialogInstance) {
      return pinDialogInstance;
    }

    this.instanceID = 'pin-page-dialog';
    this.controller = controller || {};
    this.options = {};
    this.render();
    LazyLoader.load('shared/elements/gaia-component/gaia-component.js')
      .then(() => {
        LazyLoader.load('shared/elements/gaia-site-icon/script.js');
        LazyLoader.load('shared/elements/gaia-toast/gaia-toast.js')
          .then(() => {
            this._banner = document.createElement('gaia-toast');
            this._banner.className = 'banner';
            this._banner.dataset.zIndexLevel = 'system-notification-banner';
            var message = document.createElement('p');
            var l10nId = 'pinned-to-home-screen-message';
            message.setAttribute('data-l10n-id', l10nId);
            this._banner.appendChild(message);
            this.element.appendChild(this._banner);
        });
      });

    this.publish('created');
    pinDialogInstance = this;
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
    return `<div id="${this.instanceID}" role="dialog"
           class="generic-dialog" data-z-index-level="system-dialog" hidden>
              <section role="region">
                <gaia-header id="pin-page-header" action="close">
                  <h1 id="pin-page-title" data-l10n-id="pinning-pin-page"></h1>
                </gaia-header>
                <div class="container">
                  <div id="pin-card-container"></div>
                  <p id="pin-page-url" class="url" dir="ltr"></p>
                  <button data-l10n-id="pinning-pin" data-action="pin"
                  class="pin-button">
                    Pin
                  </button>
                  <p id="pin-page-from" data-l10n-id="from"></p>
                  <div id='pin-site-container'>
                    <a class="icon icon-arrow" id="pin-arrow" href='#'></a>
                    <h1 class="site-panel-element"
                      id="pin-site-title" data-l10n-id="pinning-pin-site"></h1>
                    <gaia-app-icon></gaia-app-icon>
                    <p id="site-name"></p>
                    <p class="origin site-panel-element" dir="ltr" ></p>
                    <button data-l10n-id="pinning-pin" data-action="pin-site"
                    class="pin-button site-panel-element"></button>
                  </div>
                </div>
              </section>
            </div>`;
  };

  PinPageSystemDialog.prototype.onHide = function() {
    this._visible = false;
    this.controller.onHide && this.controller.onHide();
  };

  PinPageSystemDialog.prototype._registerEvents = function() {
    this.header.addEventListener('action', this.close.bind(this));
    this.pinButton.addEventListener('click', this.save.bind(this, 'page'));
    this.pinSiteButton.addEventListener('click', this.save.bind(this, 'site'));
    this.arrow.addEventListener('click', this.toggleSitePanel.bind(this));
  };

  PinPageSystemDialog.prototype._fetchElements = function spl_initElements() {
    this.element = document.querySelector('#' + this.instanceID);
    this.pinURL = this.element.querySelector('#pin-page-url');
    this.pinCardContainer = this.element.querySelector('#pin-card-container');
    this.header = this.element.querySelector('gaia-header');
    var pinSelector = 'button[data-action="pin"]';
    this.pinButton = this.element.querySelector(pinSelector);
    this.arrow = this.element.querySelector('#pin-arrow');
    this.pinSiteContainer = this.element.querySelector('#pin-site-container');
    this.siteBadge = this.element.querySelector('gaia-app-icon');
    this.siteName = this.element.querySelector('#site-name');
    this.origin = this.element.querySelector('.origin');
    pinSelector = 'button[data-action="pin-site"]';
    this.pinSiteButton = this.element.querySelector(pinSelector);
  };

  PinPageSystemDialog.prototype._renderPinCard = function renderPinCard(data) {
    this.data = data;
    this.card = new GaiaPinCard();
    this.card.title = data.title;
    if (data.icon) {
      this.card.icon = 'url(' + URL.createObjectURL(data.icon) + ')';
    }

    this.pinCardContainer.innerHTML = '';

    var screenshot = data.screenshot || null;
    var screenshotURL = screenshot ? URL.createObjectURL(screenshot) : null;
    this.card.background = {
      src: screenshotURL,
      themeColor: data.themeColor
    };
    this.pinCardContainer.appendChild(this.card);
  };

  PinPageSystemDialog.prototype.save = function(type) {
    var activeApp = Service.query('getTopMostWindow');
    switch (type) {
      case 'page':
        activeApp.appChrome.pinPage();
        break;

      case 'site':
        activeApp.appChrome.pinSite();
        this.pinSiteContainer.classList.remove('active');
        break;
    }
    this._banner.show();

    // Waiting for the animation. We should migrate this to a
    // hide event when https://github.com/gaia-components/gaia-toast/issues/2
    // gets fixed
    setTimeout(this.close.bind(this), this._banner.timeout);
  };

  PinPageSystemDialog.prototype.toggleSitePanel = function() {
    this.pinSiteContainer.classList.toggle('active');
  };

  PinPageSystemDialog.prototype._visible = false;

  PinPageSystemDialog.prototype.show = function(data) {
    this.pinURL.textContent = data.url;
    this._renderPinCard(data);
    this._renderSitePanel(data);
    SystemDialog.prototype.show.apply(this);
    this._visible = true;
  };

  PinPageSystemDialog.prototype._renderSitePanel = function(data) {
    var siteBadge = this.siteBadge;
    var origin = new URL(data.url).hostname;
    siteBadge.addEventListener('icon-loaded', function() {
      siteBadge.refresh();
    });
    siteBadge.icon = data.icon;
    if (data.name !== origin) {
      this.origin.textContent = origin;
    }
    this.siteName.textContent = data.name;
  };

  PinPageSystemDialog.prototype.hide = function() {
    this._visible = false;
    this.pinSiteContainer.classList.remove('active');
    SystemDialog.prototype.hide.apply(this);
  };

  PinPageSystemDialog.prototype.close = function() {
    this.publish('close');
    this.hide();
    this._visible = false;
  };

  PinPageSystemDialog.prototype.destroy = function() {
    this.containerElement.removeChild(this.element);
    pinDialogInstance = null;
    this.publish('destroyed');
  };

  exports.PinPageSystemDialog = PinPageSystemDialog;
}(window));
