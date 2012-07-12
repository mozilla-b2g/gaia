(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  function Settings(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    // set this.element
    Calendar.View.call(this, this.selectors.element);

    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  Settings.prototype = {
    __proto__: Object.create(Calendar.View.prototype),

    selectors: {
      element: '#settings',
      calendars: '#settings-calendars',
      accounts: '#settings-accounts',
      outside: '#wrapper'
    },

    get calendars() {
      return this._findElement('calendars');
    },

    get accounts() {
      return this._findElement('accounts');
    },

    get outside() {
      return this._findElement('outside');
    },

    _removeClickHandler: function() {
      this.outside.removeEventListener('click', this._handleOutsideClick);
    },

    _handleOutsideClick: function(e) {
      if (this._savedPath) {
        page(this._savedPath);
        this._savedPath = null;

        e.preventDefault();
        e.stopPropagation();

        // in theory this should happen during oninactive
        // when we switch out of the view this is a failsafe
        this._removeClickHandler();
      }
    },

    showCalendars: function() {
      this.calendars.classList.add(this.activeClass);
      this.accounts.classList.remove(this.activeClass);
    },

    showAccounts: function() {
      this.calendars.classList.remove(this.activeClass);
      this.accounts.classList.add(this.activeClass);
    },

    onactive: function() {
      var path;
      Calendar.View.prototype.onactive.apply(this, arguments);
      this._savedPath = window.location.pathname;

      if (this._savedPath.indexOf('/settings') === 0) {
        this._savedPath = '/';
      }

      this.outside.addEventListener('click', this._handleOutsideClick);
    },

    oninactive: function() {
      this._removeClickHandler();
      Calendar.View.prototype.onactive.apply(this, arguments);
    }

  };

  Calendar.Views.Settings = Settings;

}(this));
