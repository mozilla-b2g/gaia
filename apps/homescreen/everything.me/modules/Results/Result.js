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

  Evme.Result = function Evme_Result() {
    var NAME = 'Result',
        self = this,
        el = null,

        image = new Image();

    this.type = 'NOT_SET';
    this.cfg = {};
    this.elIcon = null;
    this.elName = null;

    this.init = function init(cfg) {
      self.cfg = cfg;

      el = Evme.$create('li', {
        'id': 'app_' + cfg.id,
        'data-name': cfg.name
      }, '<img class="icon" />' +
         '<img class="name" />');

      this.elIcon = el.querySelector('.icon');
      this.elName = el.querySelector('.name');

      this.elIcon.setAttribute('aria-label', cfg.name);
      this.elName.setAttribute('aria-label', cfg.name);

      if ('isOfflineReady' in cfg) {
        el.dataset.offlineReady = cfg.isOfflineReady;
      }

      // remove button
      if (cfg.isRemovable) {
        var removeButton = document.createElement('span');
        removeButton.className = 'remove';
        removeButton.addEventListener('click', cbRemoveClick);
        removeButton.addEventListener('touchstart', stopPropagation);
        removeButton.addEventListener('touchend', stopPropagation);
        el.appendChild(removeButton);
      }

      el.addEventListener('click', onClick);
      el.addEventListener('contextmenu', onContextMenu);

      el.dataset.id = this.cfg.id;
      return el;
    };

    this.drawAppName = function drawAppName() {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');

      canvas.width = TEXT_WIDTH;
      canvas.height = APP_NAME_HEIGHT;

      Evme.Utils.writeTextToCanvas({
        'text': self.cfg.name,
        'context': context,
        'offset': TEXT_MARGIN
      });

      self.elName.src = canvas.toDataURL();
    };

    this.draw = function draw(iconObj) {
      self.cfg.icon = iconObj;

      if (el) {
        el.setAttribute('data-name', self.cfg.name);

        self.drawAppName();

        if (Evme.Utils.isBlob(iconObj)) {
          Evme.Utils.blobToDataURI(iconObj, function onDataReady(src) {
            setImageSrc(src);
          });
        } else {
          var src = Evme.Utils.formatImageData(iconObj);
          setImageSrc(src);
        }
      }

      function setImageSrc(src) {
        image.onload = self.onAppIconLoad;
        image.src = src;
      }
    };

    /**
     * Save reference to the raw, unmaniputaled icon
     * Used when closing a collection to update its homescreen icon
     */
    this.setIconSrc = function(src) {
      el.dataset.iconId = this.cfg.id;
      el.dataset.iconSrc = src;
    };

    // @default
    this.onAppIconLoad = function onAppIconLoad() {
      var canvas = self.initIcon(Evme.Utils.getOSIconSize()),
          context = canvas.getContext('2d'),
          width = canvas.width,
          height = canvas.height,
          // hard coded since it's from page.js, which is a homescreen file
          SHADOW = INSTALLED_APPS_SHADOW_OFFSET;

      // account for shadow - pad the canvas from the bottom,
      // and move the name back up
      canvas.height += SHADOW;
      self.elIcon.style.cssText += '; margin-bottom: ' + -SHADOW + 'px;';

      context.drawImage(image,
          (width - image.width) / 2,
          (height - image.height) / 2);

      self.finalizeIcon(canvas);
      self.setIconSrc(image.src);
    };

    // @default
    this.initIcon = function initIcon(height) {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');

      canvas.width = TEXT_WIDTH;
      canvas.height = height;

      return canvas;
    };

    // @default
    this.finalizeIcon = function finalizeIcon(canvas) {
      var icon = self.elIcon,
          ratio = window.devicePixelRatio || 1;

      icon.addEventListener('load', function onIconLoad() {
        icon.removeEventListener('load', onIconLoad);

        // resize to "real" size to handle pixel ratios greater than 1
        icon.style.width =
          self.elName.style.width = Evme.Utils.rem(canvas.width / ratio);

        el.dataset.loaded = true;
      });

      icon.src = canvas.toDataURL();
    };

    // @default
    this.launch = function launchResult() {
      Evme.Utils.log('Result.launch [not implemented]');
    };

    this.remove = function remove() {
      Evme.$remove(el);
    };

    this.isExternal = function isExternal() {
      return self.cfg.isWeblink;
    };

    this.getElement = function getElement() {
      return el;
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

    function onClick(e) {
      e.stopPropagation();

      Evme.EventHandler.trigger(NAME, 'click', {
        'app': self,
        'appId': self.cfg.id,
        'el': el,
        'data': self.cfg,
        'e': e
      });
    }

    function onContextMenu(e) {
      e.stopPropagation();
      e.preventDefault();

      Evme.EventHandler.trigger(NAME, 'hold', {
        'evt': e,
        'app': self,
        'appId': self.cfg.id,
        'el': el,
        'data': self.cfg
      });
    }

    // prevent app click from being triggered
    function stopPropagation(e) {
      e.stopPropagation();
    }

    function cbRemoveClick(e) {
      e.stopPropagation();
      self.remove();
      Evme.EventHandler.trigger(NAME, 'remove', {
        'id': self.cfg.id
      });
    }
  };

  var SCALE_RATIO = window.devicePixelRatio || 1,
      LINE_SPACING = 1 * SCALE_RATIO,
      TEXT_HEIGHT = (Evme.Utils.APPS_FONT_SIZE + LINE_SPACING) * 3,
      TEXT_WIDTH = 72 * SCALE_RATIO,
      TEXT_MARGIN = 6 * SCALE_RATIO,
      APP_NAME_HEIGHT = TEXT_MARGIN + TEXT_HEIGHT +
                        Evme.Utils.APP_NAMES_SHADOW_OFFSET_Y;

  Evme.Result.prototype.TEXT_WIDTH = TEXT_WIDTH;
  Evme.Result.prototype.TEXT_MARGIN = TEXT_MARGIN;
  Evme.Result.prototype.APP_NAME_HEIGHT = APP_NAME_HEIGHT;
  Evme.Result.prototype.DOWNLOAD_LABEL_FONT_SIZE = 11 * SCALE_RATIO;

}());
