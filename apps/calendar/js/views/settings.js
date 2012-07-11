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

    this._initEvents();
  }

  Settings.prototype = {
    __proto__: Object.create(Calendar.View.prototype),

    bodyClass: 'configure',

    activeState: '#settings',

    selectors: {
      element: '#settings',
      toggle: '.toggle-settings'
    },

    get settingsElements() {
      if (!this._settingsElements) {
        this._settingsElements = document.querySelectorAll(
          this.selectors.toggle
        );
      }

      return this._settingsElements;
    },

    _initEvents: function() {
      var self = this;
      this.controller.on('inSettingsChange', function() {
        var enabled = self.controller.inSettings;
        if (enabled) {
          document.body.classList.add(self.bodyClass);
          self.onactive();
        } else {
          self.oninactive();
          document.body.classList.remove(self.bodyClass);
        }
      });

      var elements = this.settingsElements;

      function toggleSettings(e) {
        var value = !self.controller.inSettings;
        self.controller.setInSettings(value);
      }

      Array.prototype.forEach.call(elements, function(el) {
        el.addEventListener('click', toggleSettings);
      });
    }
  };

  Calendar.Views.Settings = Settings;

}(this));
