/* global SystemDialog, Service, GaiaPinCard, LazyLoader */
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
    this.render();
    LazyLoader.load('shared/elements/gaia-component/gaia-component.js')
      .then(() => {
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
    this.pinButton.addEventListener('click', this.save.bind(this));
  };

  PinPageSystemDialog.prototype._fetchElements = function spl_initElements() {
    var prefix = '#' + this.instanceID;
    this.element = document.querySelector(prefix);
    this.pinURL = document.getElementById('pin-page-url');
    this.pinCardContainer = document.getElementById('pin-card-container');
    this.header = document.querySelector(prefix + ' gaia-header');
    var pinSelector = prefix + ' button[data-action="pin"]';
    this.pinButton = document.querySelector(pinSelector);
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

  PinPageSystemDialog.prototype.save = function() {
    var activeApp = Service.query('getTopMostWindow');
    activeApp.appChrome.pinPage && activeApp.appChrome.pinPage();
    this._banner.show();

    // Waiting for the animation. We should migrate this to a
    // hide event when https://github.com/gaia-components/gaia-toast/issues/2
    // gets fixed
    setTimeout(this.close.bind(this), this._banner.timeout);
  };

  PinPageSystemDialog.prototype._visible = false;

  PinPageSystemDialog.prototype.show = function(data) {
    this.pinURL.textContent = data.url;
    this._renderPinCard(data);
    SystemDialog.prototype.show.apply(this);
    this._visible = true;
  };

  PinPageSystemDialog.prototype.hide = function() {
    this._visible = false;
    SystemDialog.prototype.hide.apply(this);
  };

  PinPageSystemDialog.prototype.close = function() {
    this.publish('close');
    this.hide();
    this._visible = false;
  };

  exports.PinPageSystemDialog = PinPageSystemDialog;
}(window));
