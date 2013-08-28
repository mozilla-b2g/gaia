Calendar.ns('Views').TimeHeader = (function() {

  const SETTINGS = /settings/;

  function TimeHeader() {
    Calendar.View.apply(this, arguments);
    this.controller = this.app.timeController;
    this.controller.on('scaleChange', this);

    this.settings.addEventListener('click', function settingsClick(e) {
      e.stopPropagation();
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
      month: 'month-view-header-format',
      day: 'day-view-header-format',
      // when week starts in one month and ends
      // in another, we need both of them
      // in the header
      singleMonth: 'single-month-view-header-format'
    },

    // when the title is wider than there is space
    // these shorter codes are used
    shortScales: {
      month: 'month-view-header-format-short',
      day: 'day-view-header-format-short',
      // when week starts in one month and ends
      // in another, we need both of them
      // in the header
      singleMonth: 'single-month-view-header-format-short'
    },

    handleEvent: function(e) {
      // respond to all events here but
      // we add/remove listeners to reduce
      // calls
      switch (e.type) {
        case 'yearChange':
        case 'monthChange':
        case 'dayChange':
        case 'weekChange':
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
        case 'week':
          return 'weekChange';
      }

      return 'dayChange';
    },

    _updateScale: function(newScale, oldScale) {
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

    getScale: function(type, shortForm) {
      var currentScale = this.scales;
      if (shortForm) {
        currentScale = this.shortScales;
      }
      // If we are creating header for the week view
      if (type === 'week') {
        var scale = '';
        var firstWeekday = this.controller.position;
        // We check if current week ends in the current month.
        // We check only 5 days ahead (so even if last two days
        // are in the next month we don't care about that - we have
        // only 5 days visible, and it looks odd when for example we
        // have Sep 26-30 because 31 & Oct 1 are hidden, and
        // we use September October 2012 as a header).
        // According to spec we display only last month's year
        // (December January 2013, not December 2012 January 2013)
        // and that's how it's implemented here.
        var lastWeekday = new Date(
                firstWeekday.getFullYear(),
                firstWeekday.getMonth(),
                firstWeekday.getDate() + 4
              );

        if (firstWeekday.getMonth() !== lastWeekday.getMonth()) {
          scale = this.app.dateFormat.localeFormat(
            firstWeekday,
            navigator.mozL10n.get(currentScale.singleMonth)
          );
        }

        var result = scale + ' ' + this.app.dateFormat.localeFormat(
            lastWeekday,
            navigator.mozL10n.get(currentScale.month)
        );
        return result;
      }

      return this.app.dateFormat.localeFormat(
        this.controller.position,
        navigator.mozL10n.get(currentScale[type] || currentScale.month)
      );
    },

    _getTextWidth: function(element, text) {
      // Create an invisible DOM element to which all the relevant
      // styles from the element are applied.
      // Returns how wide the invisible element is, using given the text.
      // This value includes the left and right padding as they are
      // included in element.clientWidth as well
      var invisibleElement = document.createElement('span');
      invisibleElement.textContent = text;
      invisibleElement.style.position = "absolute";
      invisibleElement.style.left = "-1000px";
      document.body.appendChild(invisibleElement);
      var styles = {
        'fontFamily'     : 'font-family',
        'fontStyle'      : 'font-style',
        'fontVariant'    : 'font-variant',
        'fontWeight'     : 'font-weight',
        'fontSize'       : 'font-size',
        'fontSizeAdjust' : 'font-size-adjust',
        'fontStretch'    : 'font-stretch',
        'paddingLeft'    : 'padding-left',
        'paddingRight'   : 'padding-right'
      };
      var elementStyle = document.defaultView.getComputedStyle(element, null);
      for (var prop in styles) {
        invisibleElement.style[prop] = elementStyle.getPropertyValue(
          styles[prop]
        );
      }
      var width = invisibleElement.clientWidth;
      document.body.removeChild(invisibleElement);
      return width;
    },

    _updateTitle: function() {
      var con = this.app.timeController;
      var date = this.getScale(con.scale);

      var title = this.title;

      title.dataset.l10nDateFormat =
        this.scales[con.scale] || this.scales.month;

      title.dataset.date = con.position.toString();
      var maxSize = title.clientWidth;
      var size = this._getTextWidth(title, date);

      if (size > maxSize) {
        date = this.getScale(con.scale, true);
      }

      title.textContent = date;
    },

    render: function() {
      this._updateScale(this.controller.scale);
    }
  };

  return TimeHeader;
}());
