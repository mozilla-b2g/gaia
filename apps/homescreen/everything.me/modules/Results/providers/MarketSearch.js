'use strict';

(function() {
  var SCALE_RATIO = window.devicePixelRatio || 1,
      TEXT_WIDTH = Evme.Result.prototype.TEXT_WIDTH,
      TEXT_MARGIN = Evme.Result.prototype.TEXT_MARGIN,
      APP_NAME_HEIGHT = Evme.Result.prototype.APP_NAME_HEIGHT,

      DOWNLOAD_LABEL_FONT_SIZE = Evme.Result.prototype.DOWNLOAD_LABEL_FONT_SIZE;

  Evme.MarketSearchResult = function Evme_MarketSearch(data) {
    var self = this;
    var query = data.query;
    var label = data.label;

    Evme.Result.call(this);
    this.type = Evme.RESULT_TYPE.MARKET_SEARCH;

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

      var text = document.createTextNode(label);

      self.elName.appendChild(download);
      self.elName.appendChild(document.createElement('br'));
      self.elName.appendChild(text);

      var ariaLabel = downloadLabel + ' ' + label;
      self.elIcon.setAttribute('aria-label', ariaLabel);
      self.elName.setAttribute('aria-label', ariaLabel);
    };

    // @override
    this.launch = function launchMarketSearch() {
      EvmeManager.openMarketplaceSearch({'query' : query});
    };
  };
  Evme.MarketSearchResult.prototype = Object.create(Evme.Result.prototype);
  Evme.MarketSearchResult.prototype.constructor = Evme.MarketSearchResult;

  /*
  Renders the market-search result
  */
  Evme.MarketSearchRenderer = function Evme_MarketSearchRenderer() {
    var NAME = 'MarketSearchRenderer',
        self = this,
        containerEl,
        gridAppOrigin = 'app://marketplace.firefox.com',
        app = {
          id: 'marketsearch',
          appUrl: 'store://?search'
        };

    this.init = function init(cfg) {
      containerEl = cfg.containerEl;
    };

    this.render = function publicRender(data) {
      // get marketlpace icon
      var appInfo = EvmeManager.getAppByOrigin(gridAppOrigin);
      app.icon = appInfo.icon; // update app info
      self.render = render; // override this.render next time

      render(data); // actually render
    };

    this.clear = function clear() {
      containerEl.innerHTML = '';
    };

    this.getResultCount = function getResultCount() {
      return containerEl.childElementCount;
    };

    function render(data) {
      containerEl.classList.add('loading-images');

      self.clear();

      var marketSearchResult = new Evme.MarketSearchResult(data),
      el = marketSearchResult.init(app);

      marketSearchResult.draw(app.icon, function() {
        containerEl.classList.remove('loading-images');
      });

      containerEl.appendChild(el);
    }
  };

}());
