define(function(require, exports, module) {
'use strict';

var CalendarModel = require('models/calendar');
var CalendarTemplate = require('templates/calendar');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var debug = require('common/debug')('views/settings');
var mixIn = require('common/object').mixIn;
var router = require('router');

require('dom!settings');

function Settings(options) {
  View.apply(this, arguments);

  this.calendarList = [];
  this._hideSettings = this._hideSettings.bind(this);
  this._onDrawerTransitionEnd = this._onDrawerTransitionEnd.bind(this);

  this._observeUI();
}
module.exports = Settings;

Settings.prototype = {
  __proto__: View.prototype,

  calendarList: null,

  /**
   * used internally to check if calendar and account data was loaded from db
   * @type {Promise}
   * @private
   */
  _load: null,

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
    header: '#settings-header',
    headerTitle: '#settings-header h1',

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
    syncButton: '#settings .sync',
    syncProgress: '#settings .sync-progress',

    // A view that settings overlays. Still needs to be active/visible but
    // hidden from the screen reader.
    timeViews: '#time-views'
  },

  get calendars() {
    return this._findElement('calendars');
  },

  get toolbar() {
    return this._findElement('toolbar');
  },

  get header() {
    return this._findElement('header');
  },

  get headerTitle() {
    return this._findElement('headerTitle');
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

  get syncProgress() {
    return this._findElement('syncProgress');
  },

  get timeViews() {
    return this._findElement('timeViews');
  },

  _syncStartStatus: function () {
    this.syncProgress.setAttribute('data-l10n-id', 'sync-progress-syncing');
    this.syncProgress.classList.add('syncing');
  },

  _syncCompleteStatus: function () {
    this.syncProgress.setAttribute('data-l10n-id', 'sync-progress-complete');
    this.syncProgress.classList.remove('syncing');
  },

  _observeUI: function() {
    this.advancedSettingsButton.addEventListener('click', function(e) {
      e.stopPropagation();
      router.show('/advanced-settings/');
    });

    this.syncButton.addEventListener('click', this._onSyncClick.bind(this));
    core.syncListener.on('syncStart', this._syncStartStatus.bind(this));
    core.syncListener.on('syncComplete',
      this._syncCompleteStatus.bind(this));

    this.calendars.addEventListener(
      'change', this._onCalendarDisplayToggle.bind(this)
    );
  },

  _observeAccounts: function() {
    var stream = core.bridge.observeAccounts();
    stream.listen(this._updateSyncButton.bind(this));
    return new Promise(resolve => stream.listen(resolve));
  },

  _observeCalendars: function() {
    var stream = core.bridge.observeCalendars();
    stream.listen(this._updateCalendars.bind(this));
    return new Promise(resolve => stream.listen(resolve));
  },

  _updateCalendars: function(records) {
    // template expects a CalendarModel :/
    this.calendarList = records.map(r => new CalendarModel(r.calendar));
    this.render();
  },

  _persistCalendarDisplay: co.wrap(function *(id, displayed) {
    try {
      var calendar = this.calendarList.find(c => String(c._id) === String(id));
      // we "clone" the calendar otherwise the caching logic will affect the
      // 'calendarVisibilityChange' event (we check if value changed this way)
      calendar = mixIn({}, calendar);
      calendar.localDisplayed = displayed;
      yield core.bridge.updateCalendar(calendar);
    } catch (err) {
      console.error(`Can't save calendar display: ${err}`);
    }
  }),

  _onCalendarDisplayToggle: function(e) {
    var input = e.target;
    this._persistCalendarDisplay(input.getAttribute('value'), !!input.checked);
  },

  _onSyncClick: function() {
    // trigger the sync the syncStart/complete events
    // will hide/show the button.
    core.bridge.syncAll();
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
    debug('Will render settings view.');
    this.calendars.innerHTML = '';

    debug('Inject calendars into settings list.');
    this.calendarList.forEach(calendar => {
      debug('Will add calendar to settings view', calendar.id, calendar);
      var html = CalendarTemplate.item.render(calendar);
      this.calendars.insertAdjacentHTML('beforeend', html);

      if (calendar.error) {
        var idx = this.calendars.children.length - 1;
        var el = this.calendars.children[idx];
        el.classList.add('error');
      }

      this._setCalendarContainerSize();
    });

    this.onrender && this.onrender();
  },

  _updateSyncButton: function(list) {
    var canSync = list.some(o => o.provider.canSync);
    this.toolbar.classList.toggle('noaccount', !canSync);
  },

  _onDrawerTransitionEnd: function(e) {
    this._updateDrawerAnimState('done');
    if (!document.body.classList.contains('settings-drawer-visible')) {
      router.resetState();
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
    if (!this._rendered) {
      return debug('Skip animation since not yet rendered.');
    }

    if (!this._activated) {
      return debug('Skip animation since not yet activated.');
    }

    var classList = document.body.classList;
    if (classList.contains('settings-drawer-visible')) {
      return debug('Skip animation since drawer already visible?');
    }

    this._updateDrawerAnimState('animating');
    classList.add('settings-drawer-visible');
  },

  _loadBaseData: function() {
    if (!this._load) {
      // make sure we only observe data once and wait until it's ready before
      // showing the animation
      this._load = Promise.all([
        this._observeCalendars(),
        this._observeAccounts()
      ]);
    }

    return this._load;
  },

  onactive: co.wrap(function *() {
    debug('Will do settings animation.');

    try {
      yield this._loadBaseData();
    } catch(err) {
      console.error(
        `Error fetching calendars in View.Settings ${err.toString()}`
      );
      return;
    }

    // View#onactive will call Views.Settings#render the first time.
    View.prototype.onactive.apply(this, arguments);

    // onactive can be called more times than oninactive, since
    // settings can overlay over and not trigger an inactive state,
    // so only bind these listeners and do the drawer animation once.
    if (document.body.classList.contains('settings-drawer-visible')) {
      return;
    }

    debug('Settings drawer is not visible... will activate.');
    this._activated = true;
    this._animateDrawer();

    // Set header title to same as time view header
    this.headerTitle.textContent =
      document.getElementById('current-month-year').textContent;

    // Both the transparent back and clicking on the semi-opaque
    // shield should close the settings since visually those sections
    // do not look like part of the drawer UI, and UX wants to give
    // the user a few options to close the drawer since there is no
    // explicit close button.
    this.header.addEventListener('action', this._hideSettings);
    this.shield.addEventListener('click', this._hideSettings);
    this.timeViews.setAttribute('aria-hidden', true);
    this.drawer.addEventListener('transitionend', this._onDrawerTransitionEnd);
  }),

  oninactive: function() {
    debug('Will deactivate settings.');
    View.prototype.oninactive.apply(this, arguments);
    this._activated = false;
    this.header.removeEventListener('action', this._hideSettings);
    this.shield.removeEventListener('click', this._hideSettings);
    this.timeViews.removeAttribute('aria-hidden');
    this.drawer.removeEventListener('transitionend',
                                 this._onDrawerTransitionEnd);
  }

};

Settings.prototype.onfirstseen = Settings.prototype.render;

});
