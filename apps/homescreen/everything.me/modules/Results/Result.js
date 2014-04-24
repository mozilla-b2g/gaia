'use strict';

(function() {
  var INSTALLED_APPS_SHADOW_OFFSET = Icon.prototype.SHADOW_OFFSET_Y;

  Evme.RESULT_TYPE = {
    CONTACT: 'contact',
    INSTALLED: 'installed',
    MARKET: 'native_download',
    MARKET_SEARCH: 'market_search',
    CLOUD: 'app',
    WEBLINK: 'weblink'
  };

  var NAME = 'Result';

  Evme.Result = function Evme_Result() {
    var self = this;

    this.type = 'NOT_SET';
    this.cfg = {};
    this.elIcon = null;
    this.elName = null;

    this.drawAppName = function drawAppName() {
      this.elName.textContent = self.cfg.name;
    };

    this.draw = function draw(iconObj, callback) {
      self.cfg.icon = iconObj;

      if (self.el) {
        self.el.setAttribute('data-name', self.cfg.name);

        var a = +new Date;
        self.drawAppName();

        self.elIcon.onload = self.elIcon.onerror = function() {
          self.el.dataset.loaded = true;

          if (callback) {
            callback();
          }
        };

        if (Evme.Utils.isBlob(iconObj)) {
          Evme.Utils.blobToDataURI(iconObj, function onDataReady(src) {
            self.elIcon.src = src;
          });
        } else {
          self.elIcon.src = Evme.Utils.formatImageData(iconObj);
        }
      }
      else {
        callback();
      }
    };

    /**
     * Save reference to the raw, unmaniputaled icon
     * Used when closing a collection to update its homescreen icon
     */
    this.setIconSrc = function(src) {
      self.el.dataset.iconId = this.cfg.id;
      self.el.dataset.iconSrc = src;
    };

    // @default
    this.launch = function launchResult() {
      Evme.Utils.log('Result.launch [not implemented]');
    };

    this.remove = function remove() {
      Evme.$remove(self.el);
    };

    this.isExternal = function isExternal() {
      return self.cfg.isWeblink;
    };

    this.getElement = function getElement() {
      return self.el;
    };

    this.getId = function getId() {
      return self.cfg.id;
    };

    this.getLink = function getLink() {
      return self.cfg.appUrl;
    };

    this.getFavLink = function getFavLink() {
      return self.cfg.favUrl != '@' && self.cfg.favUrl || self.cfg.appUrl;
    };

    this.getIcon = function getIcon() {
      return self.cfg.icon;
    };

    this.getCfg = function getCfg() {
      return self.cfg;
    };
  };

  var SCALE_RATIO = window.devicePixelRatio || 1,
      LINE_SPACING = 1 * SCALE_RATIO,
      TEXT_HEIGHT = (Evme.Utils.APPS_FONT_SIZE + LINE_SPACING) * 3,
      TEXT_WIDTH = 72 * SCALE_RATIO,
      TEXT_MARGIN = 6 * SCALE_RATIO,
      APP_NAME_HEIGHT = TEXT_MARGIN + TEXT_HEIGHT +
                        Evme.Utils.APP_NAMES_SHADOW_OFFSET_Y;

  function onClick(e) {
    e.stopPropagation();

    Evme.EventHandler.trigger(NAME, 'click', {
      'app': this,
      'appId': this.cfg.id,
      'el': this.el,
      'data': this.cfg,
      'e': e
    });
  }

  function onContextMenu(e) {
    e.stopPropagation();
    e.preventDefault();

    Evme.EventHandler.trigger(NAME, 'hold', {
      'evt': e,
      'app': this,
      'appId': this.cfg.id,
      'el': this.el,
      'data': this.cfg
    });
  }

  // prevent app click from being triggered
  function stopPropagation(e) {
    e.stopPropagation();
  }

  function cbRemoveClick(e) {
    e.stopPropagation();
    this.remove();
    Evme.EventHandler.trigger(NAME, 'remove', {
      'id': this.cfg.id
    });
  }

  Evme.Result.prototype.init = function Result_init(cfg) {
    this.cfg = cfg;

    // Create Elements
    var el = this.el = document.createElement('li');
    el.id = 'app_' + cfg.id;
    el.dataset.name = cfg.name;

    var elIcon = this.elIcon = document.createElement('img');
    elIcon.classList.add('icon');
    el.appendChild(elIcon);

    var elName = this.elName = document.createElement('div');
    elName.classList.add('name');
    el.appendChild(elName);

    // Apply styles and event handlers
    this.elName.style.width = TEXT_WIDTH + 'px';
    this.elName.style.height = (APP_NAME_HEIGHT - TEXT_MARGIN) + 'px';

    this.elIcon.setAttribute('aria-label', cfg.name);
    this.elName.setAttribute('aria-label', cfg.name);

    if ('isOfflineReady' in cfg) {
      el.dataset.offlineReady = cfg.isOfflineReady;
    }

    // remove button
    if (cfg.isRemovable) {
      var removeButton = document.createElement('span');
      removeButton.className = 'remove';
      removeButton.addEventListener('click', cbRemoveClick.bind(this));
      removeButton.addEventListener('touchstart', stopPropagation.bind(this));
      removeButton.addEventListener('touchend', stopPropagation.bind(this));
      el.appendChild(removeButton);
    }

    el.addEventListener('click', onClick.bind(this));
    el.addEventListener('contextmenu', onContextMenu.bind(this));

    el.dataset.id = this.cfg.id;
    return el;
  };

  Evme.Result.prototype.TEXT_WIDTH = TEXT_WIDTH;
  Evme.Result.prototype.TEXT_MARGIN = TEXT_MARGIN;
  Evme.Result.prototype.APP_NAME_HEIGHT = APP_NAME_HEIGHT;
  Evme.Result.prototype.DOWNLOAD_LABEL_FONT_SIZE = 11 * SCALE_RATIO;

}());
