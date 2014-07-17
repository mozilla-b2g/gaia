define(function(require) {
  'use strict';

  var CALENDAR_PREFIX = 'calendar-';

  var template = require('templates/calendar');
  var View = require('view');
  var _super = View.prototype;
  var router = require('app').router;
  var ERROR = require('calendar').ERROR;

  function Settings(options) {
    View.apply(this, arguments);

    this._hideSettings = this._hideSettings.bind(this);
    this._onDrawerTransitionEnd = this._onDrawerTransitionEnd.bind(this);
    this._updateTimeouts = Object.create(null);

    this._observeUI();
  }

  Settings.prototype = {
    __proto__: _super,

    waitBeforePersist: 600,

    /**
     * Local update is a flag
     * used to indicate that the incoming
     * update was made by this view and
     * should not fire the _update method.
     */
    _localUpdate: false,

    /**
     * Name of the class that will be applied to the
     * body element when sync is in progress.
     */
    selectors: {
      element: '#settings',
      calendars: '#settings .calendars',
      calendarName: '.name',
      toolbar: '#settings [role="toolbar"]',
      backButton: '#settings .settings-back',

      // A dark semi-opaque layer that is used to "gray out" the view behind
      // the element used for settings. Tapping on it will also close out
      // the settings element, per ux desire.
      shield: '#settings .settings-shield',

      // This outer div is used to hide .settings-drawer via an
      // overflow: hidden, so that the .settings-drawer can translateY
      // animate downward and appear to come out from under the view
      // header that is visible "behind" the element used for settings.
      drawerContainer: '#settings .settings-drawer-container',

      // Holds the actual visible drawer contents: list of calendars
      // and bottom toolbar.
      drawer: '#settings .settings-drawer',

      advancedSettingsButton: '#settings .settings',
      syncButton: '#settings .sync'
    },

    get calendars() {
      return this._findElement('calendars');
    },

    get toolbar() {
      return this._findElement('toolbar');
    },

    get backButton() {
      return this._findElement('backButton');
    },

    get shield() {
      return this._findElement('shield');
    },

    get drawerContainer() {
      return this._findElement('drawerContainer');
    },

    get drawer() {
      return this._findElement('drawer');
    },

    get advancedSettingsButton() {
      return this._findElement('advancedSettingsButton');
    },

    get syncButton() {
      return this._findElement('syncButton');
    },

    _observeUI: function() {
      this.advancedSettingsButton.addEventListener('click', function(e) {
        e.stopPropagation();
        router.show('/advanced-settings/');
      });

      this.syncButton.addEventListener('click', this._onSyncClick.bind(this));

      this.calendars.addEventListener(
        'change', this._onCalendarDisplayToggle.bind(this)
      );
    },

    _observeAccountStore: function() {
      var store = this.app.store('Account');
      var handler = this._updateSyncButton.bind(this);

      store.on('add', handler);
      store.on('remove', handler);
    },

    _observeCalendarStore: function() {
      var store = this.app.store('Calendar');
      var self = this;

      function handle(method) {
        return function() {
          self[method].apply(self, arguments);
        };
      }

      // calendar store events
      store.on('update', handle('_update'));
      store.on('add', handle('_add'));
      store.on('remove', handle('_remove'));
    },

    _persistCalendarDisplay: function(id, displayed) {
      var store = this.app.store('Calendar');
      var self = this;

      // clear timeout id
      delete this._updateTimeouts[id];

      function persist(err, id, model) {
        if (err) {
          console.log('View.Setting cannot save calendar', err);
          return;
        }

        if (self.ondisplaypersist) {
          self.ondisplaypersist(model);
        }
      }

      function fetch(err, calendar) {
        if (err) {
          console.log('View.Setting cannot fetch calendar', id);
          return;
        }

        calendar.localDisplayed = displayed;
        store.persist(calendar, persist);
      }

      store.get(id, fetch);
    },

    _onCalendarDisplayToggle: function(e) {
      var input = e.target;
      var id = input.value;

      if (this._updateTimeouts[id]) {
        clearTimeout(this._updateTimeouts[id]);
      }

      this._updateTimeouts[id] = setTimeout(
        this._persistCalendarDisplay.bind(this, id, !!input.checked),
        this.waitBeforePersist
      );
    },

    _onSyncClick: function() {
      // trigger the sync the syncStart/complete events
      // will hide/show the button.
      this.app.syncController.all();
    },

    _update: function(id, model) {
      var el = document.getElementById(this.idForModel(CALENDAR_PREFIX, id));
      var check = el.querySelector('input[type="checkbox"]');

      if (el.classList.contains(ERROR) && !model.error) {
        el.classList.remove(ERROR);
      }

      if (model.error) {
        el.classList.add(ERROR);
      }

      el.querySelector(this.selectors.calendarName).textContent = model.name;
      check.checked = model.localDisplayed;
    },

    _add: function(id, object) {
      var idx = this.calendars.children.length;

      var html = template.item.render(object);
      this.calendars.insertAdjacentHTML(
        'beforeend',
        html
      );

      if (object.error) {
        var el = this.calendars.children[
          idx
        ];

        el.classList.add(ERROR);
      }

      this._setCalendarContainerSize();
    },

    _remove: function(id) {
      var el = document.getElementById(this.idForModel(CALENDAR_PREFIX, id));
      if (el) {
        el.parentNode.removeChild(el);
      }

      this._setCalendarContainerSize();
    },

    // Ajust size of drawer scroll area to fit size of calendars, within
    // a min/max that is controlled by CSS. This has to be a manual
    // calculation because UX wants the list of calendars to form-fit
    // without a scrollbar, but enforce a minimum height and a maximum.
    // The alternative to this approach is to size drawerContainer and
    // drawer to be height 100%, and put the min/max height CSS on the
    // .calendars. However, that means the translate animation is over
    // a 100% height div, which ends up looking not so smooth on close
    // of the animation, since the actual visible content is about half
    // the size of that 100% and in the easing, zips by too quickly that
    // it is harder to track, almost looks like just a harder visibility
    // discontinuity.
    _setCalendarContainerSize: function() {
      var nodes = this.calendars.children;
      var calendarsHeight = nodes[0] ?
                            nodes[0].getBoundingClientRect().height *
                            nodes.length : 0;
      this.drawerContainer.style.height = (calendarsHeight +
                                    this.toolbar.clientHeight) + 'px';
    },

    onrender: function() {
      this._setCalendarContainerSize();
      this._rendered = true;
      this._animateDrawer();
    },

    render: function() {
      var store = this.app.store('Calendar');

      store.all(function(err, calendars) {
        if (err) {
          console.log(
            'Error fetching calendars in View.Settings'
          );
          return;
        }

        // clear list of calendars
        this.calendars.innerHTML = '';

        // append each calendar
        var id;
        for (id in calendars) {
          this._add(id, calendars[id]);
        }

        // observe new calendar events
        this._observeCalendarStore();

        // observe accounts to hide sync button
        this._observeAccountStore();

        // show/hide sync button
        this._updateSyncButton(function() {
          if (this.onrender) {
            this.onrender();
          }
        }.bind(this));
      }.bind(this));
    },

    _updateSyncButton: function(callback) {
      var store = this.app.store('Account');
      var element = this.toolbar;
      var self = this;

      store.syncableAccounts(function(err, list) {
        if (err) {
          return callback(err);
        }

        element.classList.toggle('noaccount', list.length === 0);

        // test only event
        self.onupdatesyncbutton && self.onupdatesyncbutton();
        typeof callback === 'function' ? callback() : '';
      });
    },

    _onDrawerTransitionEnd: function(e) {
      this._updateDrawerAnimState('done');
      if (!document.body.classList.contains('settings-drawer-visible')) {
        this.app.resetState();
      }
    },

    // Update a state visible in the DOM for when animation is taking place.
    // This is mostly useful for a test hook to know when the animation is
    // done.
    _updateDrawerAnimState: function(state) {
      this.drawer.dataset.animstate = state;
    },

    _hideSettings: function() {
      this._updateDrawerAnimState('animating');
      document.body.classList.remove('settings-drawer-visible');
    },

    _animateDrawer: function() {
      // Wait for both _rendered and _activated before triggering
      // the animation, so that it is smooth, without jank due to
      // changes in style/layout from activating or rendering.
      // Also, set the style on the body, since other views will also
      // have items animate based on the class. For instance, the +
      // to add an event in the view-selector views fades out.
      if (this._rendered && this._activated &&
          !document.body.classList.contains('settings-drawer-visible')) {
        this._updateDrawerAnimState('animating');
        document.body.classList.add('settings-drawer-visible');
      }
    },

    onactive: function() {
      _super.onactive.apply(this, arguments);

      // onactive can be called more times than oninactive, since
      // settings can overlay over and not trigger an inactive state,
      // so only bind these listeners and do the drawer animation once.
      if (!document.body.classList.contains('settings-drawer-visible')) {
        this._activated = true;
        this._animateDrawer();

        // Both the transparent back and clicking on the semi-opaque
        // shield should close the settings since visually those sections
        // do not look like part of the drawer UI, and UX wants to give
        // the user a few options to close the drawer since there is no
        // explicit close button.
        this.backButton.addEventListener('click', this._hideSettings);
        this.shield.addEventListener('click', this._hideSettings);

        this.drawer.addEventListener('transitionend',
                                     this._onDrawerTransitionEnd);
      }
    },

    oninactive: function() {
      _super.oninactive.apply(this, arguments);
      this._activated = false;
      this.backButton.removeEventListener('click', this._hideSettings);
      this.shield.removeEventListener('click', this._hideSettings);
      this.drawer.removeEventListener('transitionend',
                                   this._onDrawerTransitionEnd);
    }

  };

  Settings.prototype.onfirstseen = Settings.prototype.render;

  return Settings;

});

