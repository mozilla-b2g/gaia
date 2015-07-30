/* global focusManager */
'use strict';

(function(exports) {

  /**
   * ActionMenu displays a list of user-selectable actions in an overlay.
   * An example of this would be when the user selects a single activity form
   * a list of several activities. Each ActionMenu instance maintains its own
   * dom and event listeners.
   * @class ActionMenu
   * @param {Array} listItems An array of objects to display.
   * @param {String} titleL10nId The l10n id of the header.
   * @param {Function} successCb Called when the user selects an option.
   * @param {Function} cancelCb Called when the menu is cancelled.
   * @param {Boolean} preventFocusChange Set to true to prevent focus changing.
   */
  function ActionMenu(listItems, titleL10nId, successCb, cancelCb,
  preventFocusChange) {
    this.onselected = successCb || function() {};
    this.oncancel = cancelCb || function() {};
    this.listItems = listItems;
    this.titleL10nId = titleL10nId;
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
      if (this.titleL10nId !== undefined) {
        this.header.setAttribute('data-l10n-id', this.titleL10nId);
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
      var screen = document.getElementById('screen');
      screen.appendChild(this.container);
      screen.classList.add('action-menu');

      this.buildMenu(this.listItems);

      this.container.addEventListener('submit', this);
      this.menu.addEventListener('click', this);

      window.addEventListener('attentionopened', this, true);
      window.addEventListener('screenchange', this, true);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);
      window.addEventListener('sheets-gesture-begin', this);

      focusManager.addUI(this);
      focusManager.focus();
      if (this.preventFocusChange) {
        this.menu.addEventListener('mousedown', this.preventFocusChange);
      }
    },

    /**
     * Removes the dom and stops event listeners
     * @memberof ActionMenu.prototype
     */
    stop: function() {
      var screen = document.getElementById('screen');
      focusManager.removeUI(this);
      screen.removeChild(this.container);
      screen.classList.remove('action-menu');

      window.removeEventListener('attentionopened', this, true);
      window.removeEventListener('screenchange', this, true);
      window.removeEventListener('home', this);
      window.removeEventListener('holdhome', this);
      window.removeEventListener('sheets-gesture-begin', this);

      if (this.preventFocusChange) {
        this.menu.removeEventListener('mousedown', this.preventFocusChange);
      }
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
      this.cancel.setAttribute('data-l10n-id', 'cancel');
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
      // focus back to the top most window/overlay.
      focusManager.focus();
      if (callback && typeof callback === 'function') {
        setTimeout(callback);
      }
    },

    /**
     * When IME switcher shows, prevent the keyboard focus getting changed.
     * @memberof ActionMenu.prototype
     * @param  {DOMEvent} evt The event.
     */
    preventFocusChange: function(evt) {
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
        case 'sheets-gesture-begin':
          if (!this.visible) {
            return;
          }

          this.hide();
          this.oncancel();
          break;

        case 'attentionopened':
          this.hide();
          this.oncancel();
          break;
      }
    },

    /**
     * Whether or not the ActionMenu is visible.
     * @memberof ActionMenu.prototype
     * @return {Boolean} if the container is focusible, return true
     */
    isFocusable: function() {
      return this.container && this.visible;
    },

    /**
     * Get the z-index value of container
     * @memberof ActionMenu.prototype
     * @return {HTMLElement} the container
     */
    getElement: function() {
      return this.container;
    },

    /**
     * Focus cancel button in ActionMenu
     * @memberof ActionMenu.prototype
     */
    focus: function() {
      if (this.cancel) {
        document.activeElement.blur();
        this.cancel.focus();
      }
    }
  };

  exports.ActionMenu = ActionMenu;

}(window));
