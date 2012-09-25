Calendar.ns('Views').TimeHeader = (function() {

  const SETTINGS = /settings/;

  function TimeHeader() {
    Calendar.View.apply(this, arguments);
    this.controller = this.app.timeController;
    this.controller.on('scaleChange', this);

    this.settings.addEventListener('click', function settingsClick(e) {
      e.preventDefault();
      var path = window.location.pathname;
      if (SETTINGS.test(path)) {
        Calendar.App.resetState();
      } else {
        Calendar.App.router.show('/settings/');
      }
    });
  }

  TimeHeader.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#time-header',
      title: '#time-header h1',
      settings: '#time-header .settings'
    },

    scales: {
      month: '%B %Y',
      day: '%A %B %e'
    },

    handleEvent: function(e) {
      // respond to all events here but
      // we add/remove listeners to reduce
      // calls
      switch (e.type) {
        case 'yearChange':
        case 'monthChange':
        case 'dayChange':
          this._updateTitle();
          break;
        case 'scaleChange':
          this._updateScale.apply(this, e.data);
          break;
      }
    },

    get settings() {
      return this._findElement('settings');
    },

    get title() {
      return this._findElement('title');
    },

    _scaleEvent: function(event) {
      switch (event) {
        case 'month':
          return 'monthChange';
        case 'year':
          return 'yearChange';
      }

      return 'dayChange';
    },

    _updateScale: function(newScale, oldScale) {
      // we check for month & year
      // everything else is day based scale (week, etc..)
      if (oldScale) {
        this.controller.removeEventListener(
          this._scaleEvent(oldScale),
          this
        );
      }

      this.controller.addEventListener(
        this._scaleEvent(newScale),
        this
      );

      this._updateTitle();
    },

    getScale: function(type) {
      return this.app.dateFormat.localeFormat(
        this.controller.position,
        this.scales[type] || this.scales.month
      );
    },

    _updateTitle: function() {
      var con = this.app.timeController;
      this.title.textContent = this.getScale(
        con.scale
      );
    },

    render: function() {
      this._updateScale(this.controller.scale);
    }
  };

  return TimeHeader;
}());
