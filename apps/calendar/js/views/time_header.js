Calendar.ns('Views').TimeHeader = (function() {

  const SETTINGS = /settings/;

  function TimeHeader() {
    Calendar.View.apply(this, arguments);
    this.controller = this.app.timeController;
    this.dateFormat = navigator.mozL10n.DateTimeFormat();

    this.controller.on('monthChange', this);

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

    handleEvent: function(e) {
      switch (e.type) {
        case 'monthChange':
          this._updateTitle();
          break;
      }
    },

    get settings() {
      return this._findElement('settings');
    },

    get title() {
      return this._findElement('title');
    },

    monthScaleTitle: function() {
      return this.dateFormat.localeFormat(
        this.controller.month,
        '%B %Y'
      );
    },

    _updateTitle: function() {
      this.title.textContent = this.monthScaleTitle();
    }
  };

  TimeHeader.prototype.render = TimeHeader.prototype._updateTitle;

  return TimeHeader;
}());
