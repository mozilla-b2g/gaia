'use strict';

(function(exports) {

  /**
   * ActionMenu displays a list of user-selectable actions in an overlay.
   * An example of this would be when the user selects a single activity form
   * a list of several activities. Each ActionMenu instance maintains its own
   * dom and event listeners.
   * @class ActionMenu
   * @return {Array} listItems An array of objects to display.
   * @return {String} title The content of the header.
   * @return {Function} successCb Called when the user selects an option.
   * @return {Function} cancelCb Called when the menu is cancelled.
   */
  function ActionMenu(listItems, title, successCb, cancelCb) {
    this.onselected = successCb || function() {};
    this.oncancel = cancelCb || function() {};
    this.listItems = listItems;
    this.title = title;
  }

  ActionMenu.prototype = {

    /**
     * Whether or not the ActionMenu is visible.
     * @memberof ActionMenu.prototype
     * @return {Boolean} The ActionMenu is visible.
     */
    get visible() {
      return this.container.classList.contains('visible');
    },

    /**
     * Builds dom and adds event listeners
     * @memberof ActionMenu.prototype
     */
    start: function() {
      // Create the structure
      this.container = document.createElement('form');
      this.container.dataset.type = 'action';
      this.container.setAttribute('role', 'dialog');
      this.container.setAttribute('data-z-index-level', 'action-menu');

      // An action menu has a mandatory header
      this.header = document.createElement('header');
      if (this.title !== undefined) {
        this.header.textContent = this.title;
      }

      this.container.appendChild(this.header);

      // Following our paradigm we need a cancel
      this.cancel = document.createElement('button');
      this.cancel.dataset.action = 'cancel';
      this.cancel.dataset.l10nId = 'cancel';

      // We have a menu with all the options
      this.menu = document.createElement('menu');

      this.container.appendChild(this.menu);
      this.container.classList.add('visible');

      // We append to System app (actually to '#screen')
      document.getElementById('screen').appendChild(this.container);

      this.buildMenu(this.listItems);

      this.container.addEventListener('submit', this);
      this.menu.addEventListener('click', this);

      window.addEventListener('attentionscreenshow', this, true);
      window.addEventListener('screenchange', this, true);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);

      // Firing when the keyboard and the IME switcher shows/hides.
      window.addEventListener('keyboardimeswitchershow', this);
      window.addEventListener('keyboardimeswitcherhide', this);
    },

    /**
     * Removes the dom and stops event listeners
     * @memberof ActionMenu.prototype
     */
    stop: function() {
      document.getElementById('screen').removeChild(this.container);

      window.removeEventListener('attentionscreenshow', this, true);
      window.removeEventListener('screenchange', this, true);
      window.removeEventListener('home', this);
      window.removeEventListener('holdhome', this);

      window.removeEventListener('keyboardimeswitchershow', this);
      window.removeEventListener('keyboardimeswitcherhide', this);
    },

    /**
     * Builds the dom for the menu.
     * @memberof ActionMenu.prototype
     */
    buildMenu: function(items) {
      this.menu.innerHTML = '';
      items.forEach(function traveseItems(item) {
        var action = document.createElement('button');
        action.dataset.value = item.value;
        action.textContent = item.label;

        if (item.icon) {
          action.classList.add(item.iconClass || 'icon');
          action.style.backgroundImage = 'url(' + item.icon + ')';
        }
        this.menu.appendChild(action);
      }, this);
      var _ = navigator.mozL10n.get;
      this.cancel.textContent = _('cancel');
      this.menu.appendChild(this.cancel);
    },

    /**
     * Hides the ActionMenu.
     * @memberof ActionMenu.prototype
     * @param  {Function} callback The callback to call after hiding.
     */
    hide: function(callback) {
      this.container.classList.remove('visible');
      this.stop();
      if (callback && typeof callback === 'function') {
        setTimeout(callback);
      }
    },

    /**
     * When IME switcher shows, prevent the keyboard focus getting changed.
     * @memberof ActionMenu.prototype
     * @param  {DOMEvent} evt The event.
     */
    _pdIMESwitcherShow: function(evt) {
       evt.preventDefault();
    },

    /**
     * General event handler interface.
     * Handles submission and cancellation events.
     * @memberof ActionMenu.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
      var target = evt.target;
      var type = evt.type;
      switch (type) {
        case 'submit':
          evt.preventDefault();
          break;
        case 'screenchange':
          if (!this.visible) {
            return;
          }

          if (!evt.detail.screenEnabled) {
            this.hide();
            this.oncancel();
          }
          break;

        case 'click':
          evt.preventDefault();
          var action = target.dataset.action;
          if (action && action === 'cancel') {
             this.hide();
             this.oncancel();
             return;
          }

          var value = target.dataset.value;
          if (!value) {
            return;
          }
          value = parseInt(value);
          this.hide(this.onselected.bind(this, value));
          break;

        case 'home':
        case 'holdhome':
          if (!this.visible) {
            return;
          }

          this.hide();
          this.oncancel();
          break;

        case 'attentionscreenshow':
          this.hide();
          break;

        // When IME switcher shows, prevent the keyboard focus getting changed
        case 'keyboardimeswitchershow':
          this.menu.addEventListener('mousedown', this._pdIMESwitcherShow);
          break;

        case 'keyboardimeswitcherhide':
          this.menu.removeEventListener('mousedown', this._pdIMESwitcherShow);
          break;
      }
    }
  };

  exports.ActionMenu = ActionMenu;

}(window));
