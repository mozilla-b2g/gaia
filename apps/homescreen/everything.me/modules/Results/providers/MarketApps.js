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
    this.drawAppName = function drawAppName() {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d'),
          downloadLabel = Evme.Utils.l10n('apps', 'market-download');

      canvas.width = TEXT_WIDTH;
      canvas.height = APP_NAME_HEIGHT + TEXT_MARGIN + DOWNLOAD_LABEL_FONT_SIZE;

      Evme.Utils.writeTextToCanvas({
        'text': downloadLabel,
        'context': context,
        'offset': TEXT_MARGIN,
        'fontSize': DOWNLOAD_LABEL_FONT_SIZE
      });

      Evme.Utils.writeTextToCanvas({
        'text': this.cfg.name,
        'context': context,
        'offset': TEXT_MARGIN + DOWNLOAD_LABEL_FONT_SIZE + SCALE_RATIO
      });

      var ariaLabel = downloadLabel + ' ' + this.cfg.name;
      self.elIcon.setAttribute('aria-label', ariaLabel);
      self.elName.setAttribute('aria-label', ariaLabel);
      self.elName.src = canvas.toDataURL();
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

      for (var i = 0, app; app = apps[i++];) {
        var result = new Evme.MarketResult(app.slug),
        el = result.init(app);

        if (app.icon) {
          getMarketIcon(app, result);
        } else {
          app.icon = DEFAULT_ICON;
          result.draw(app.icon);
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
    function getMarketIcon(app, result) {
      Evme.Utils.systemXHR({
        'url': app.icon.data,
        'responseType': 'blob',
        'onSuccess': function onIconSuccess(response) {
          app.icon = response;
          result.draw(app.icon);
        },
        'onError': function onIconError(e) {
          app.icon = DEFAULT_ICON;
          result.draw(app.icon);
        }
      });
    }
  };

}());
