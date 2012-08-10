(function(window) {

  var template = Calendar.Templates.Calendar;

  function Settings(options) {
    Calendar.View.apply(this, arguments);

    this._initEvents();
  }

  Settings.prototype = {
    __proto__: Object.create(Calendar.View.prototype),

    selectors: {
      element: '#settings',
      calendars: '#settings .calendars',
      calendarName: '.name',
      syncButton: '#settings .sync'
    },

    get calendars() {
      return this._findElement('calendars');
    },

    get syncButton() {
      return this._findElement('syncButton');
    },

    _initEvents: function() {
      var store = this.app.store('Calendar');

      store.on('update', this._update.bind(this));
      store.on('add', this._add.bind(this));
      store.on('remove', this._remove.bind(this));

      this.syncButton.addEventListener('click', this._onSyncClick.bind(this));
    },

    _onSyncClick: function() {
      var self = this;
      var syncController = this.app.syncController;
      var button = this.syncButton;

      button.classList.add(this.activeClass);

      syncController.sync(function() {
        button.classList.remove(self.activeClass);
      });
    },

    _update: function(id, model) {
      var htmlId = 'calendar-' + id;
      var el = document.getElementById(htmlId);
      var check = el.querySelector('input[type="checkbox"]');

      el.querySelector(this.selectors.calendarName).textContent = model.name;
      check.checked = model.localDisplayed;
    },

    _add: function(id, object) {
      var html = template.item.render(object);
      this.calendars.insertAdjacentHTML(
        'beforeend',
        html
      );
    },

    _remove: function(id) {
      var htmlId = 'calendar-' + id;
      var el = document.getElementById(htmlId);
      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var list = this.calendars;
      var store = this.app.store('Calendar');
      var key;
      var html = '';

      for (key in store.cached) {
        html += template.item.render(
          store.cached[key]
        );
      }

      list.innerHTML = html;
    }

  };

  Settings.prototype.onfirstseen = Settings.prototype.render;
  Calendar.ns('Views').Settings = Settings;

}(this));
