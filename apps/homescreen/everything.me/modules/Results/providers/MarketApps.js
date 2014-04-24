'use strict';

(function() {
  var SCALE_RATIO = window.devicePixelRatio || 1,
      TEXT_WIDTH = Evme.Result.prototype.TEXT_WIDTH,
      TEXT_MARGIN = Evme.Result.prototype.TEXT_MARGIN,
      APP_NAME_HEIGHT = Evme.Result.prototype.APP_NAME_HEIGHT,

      DOWNLOAD_LABEL_FONT_SIZE = Evme.Result.prototype.DOWNLOAD_LABEL_FONT_SIZE;

  Evme.MarketResult = function Evme_MarketResult(slug) {
    Evme.Result.call(this);

    var self = this;

    this.type = Evme.RESULT_TYPE.MARKET;
    this.slug = slug;

    // @override
    this.init = function CloudResult_init() {
      var res = Evme.Result.prototype.init.apply(this, arguments);

      this.elName.style.height =
        (APP_NAME_HEIGHT + TEXT_MARGIN + DOWNLOAD_LABEL_FONT_SIZE) + 'px';

      return res;
    };

    // @override
    this.drawAppName = function drawAppName() {
      var downloadLabel = Evme.Utils.l10n('apps', 'market-download');

      var download = document.createElement('span');
      download.classList.add('download');
      download.textContent = downloadLabel;

      var text = document.createTextNode(this.cfg.name);

      self.elName.appendChild(download);
      self.elName.appendChild(document.createElement('br'));
      self.elName.appendChild(text);

      var ariaLabel = downloadLabel + ' ' + this.cfg.name;
      self.elIcon.setAttribute('aria-label', ariaLabel);
      self.elName.setAttribute('aria-label', ariaLabel);
    };

    // @override
    this.launch = function launchMarketResult() {
      if (slug) {
        EvmeManager.openMarketplaceApp({'slug': slug});
      }
    };
  };

  Evme.MarketResult.prototype = Object.create(Evme.Result.prototype);
  Evme.MarketResult.prototype.constructor = Evme.Evme_MarketResult;

  Evme.MarketAppsRenderer = function Evme_MarketAppsRenderer() {
    var NAME = 'MarketAppsRenderer',
    DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),

    lastSignature = Evme.Utils.EMPTY_APPS_SIGNATURE,
    self = this,
    containerEl;


    this.init = function init(cfg) {
      // container in which to render apps in
      containerEl = cfg.containerEl;
    };

    this.render = function render(apps, pageNum) {
      if (!apps.length) {
        this.clear();
        return;
      }

      var newSignature = Evme.Utils.getAppsSignature(apps);
      if (lastSignature === newSignature) {
        Evme.Utils.log('MarketAppsRenderer: nothing to render' +
          ' (signature match)');
        return;
      }
      lastSignature = newSignature;

      // always renders the first page - clear previous results
      self.clear();

      _render(apps);
    };

    this.clear = function clear() {
      containerEl.innerHTML = '';
      lastSignature = Evme.Utils.EMPTY_APPS_SIGNATURE;
    };

    this.getResultCount = function getResultCount() {
      return containerEl.childElementCount;
    };

    function _render(apps) {
      var docFrag = document.createDocumentFragment();

      containerEl.classList.add('loading-images');

      var loaded = 0;
      function next() {
        if (++loaded === apps.length) {
          containerEl.classList.remove('loading-images');
        }
      }

      for (var i = 0, app; app = apps[i++];) {
        var result = new Evme.MarketResult(app.slug),
        el = result.init(app);

        if (app.icon) {
          getMarketIcon(app, result, next);
        } else {
          app.icon = DEFAULT_ICON;
          result.draw(app.icon, next);
        }

        // used for result filtering
        result.getElement().dataset.slug = app.slug;

        docFrag.appendChild(el);
      }

      containerEl.appendChild(docFrag);
    }

    /**
     * Market icons are hosted on marketplace.cdn.mozilla.net
     * Get it using system XHR to avoid canvas security issues.
     * see http://www.w3.org/TR/2011/WD-html5-20110525/
     *                     the-canvas-element.html#security-with-canvas-elements
     */
    function getMarketIcon(app, result, appDrawCallback) {
      Evme.Utils.systemXHR({
        'url': app.icon.data,
        'responseType': 'blob',
        'onSuccess': function onIconSuccess(response) {
          app.icon = response;
          result.draw(app.icon, appDrawCallback);
        },
        'onError': function onIconError(e) {
          app.icon = DEFAULT_ICON;
          result.draw(app.icon, appDrawCallback);
        }
      });
    }
  };

}());
