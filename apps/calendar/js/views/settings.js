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
    Calendar.View.call(this, this.selectors.settings);

    this._initEvents();
  }

  Settings.prototype = {
    __proto__: Object.create(Calendar.View.prototype),

    bodyClass: 'configure',

    selectors: {
      settings: '#settings',
      settingsButtons: '.toggle-settings'
    },

    get settingsElements() {
      if (!this._settingsElements) {
        this._settingsElements = document.querySelectorAll(
          this.selectors.settingsButtons
        );
      }

      return this._settingsElements;
    },

    _initEvents: function() {
      var self = this;
      this.controller.on('inSettingsChange', function() {
        var enabled = self.controller.inSettings;
        if (enabled) {
          self.onactive();
        } else {
          self.oninactive();
        }
      });

      var elements = this.settingsElements;

      function toggleSettings(e) {
        var value = !self.controller.inSettings;
        self.controller.setInSettings(value);

        if (value) {
          document.body.classList.add(self.bodyClass);
        } else {
          document.body.classList.remove(self.bodyClass);
        }

        e.preventDefault();
      }

      Array.prototype.forEach.call(elements, function(el) {
        el.addEventListener('click', toggleSettings, false);
      });
    }
  };

  Calendar.Views.Settings = Settings;

}(this));
