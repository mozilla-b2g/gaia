'use strict';

/* global MozActivity, Sanitizer */
(function(exports) {
  /**
   * ImeMenu displays a list of currently enabled IMEs in an overlay.
   * @class ImeMenu
   * @param {Array} listItems An array of objects to display.
   * @param {String} title L10n ID of the the content of the header.
   * @param {Function} successCb Called when the user selects an option.
   * @param {Function} cancelCb Called when the menu is cancelled.
   */
  function ImeMenu(listItems, title, successCb, cancelCb) {
    this.onselected = successCb || function() {};
    this.oncancel = cancelCb || function() {};
    this.listItems = listItems;
    this.title = title;
  }

  ImeMenu.prototype = {
    /**
     * Start the ImeMenu instance
     * @memberof ImeMenu.prototype
     */
    start: function() {
      this.initUI();
    },

    /**
     * Builds dom and adds event listeners
     * @memberof ImeMenu.prototype
     */
    initUI: function() {
      var dummy = document.createElement('div');

      dummy.innerHTML = this.imeMenuView({
        title: this.title
      });
      this.container = dummy.firstElementChild;

      // We have a menu with all the options
      this.menu = this.container.querySelector('.ime-menu-list');
      this.buildMenu(this.listItems);

      // We append to System app (actually to '#screen')
      document.getElementById('screen').appendChild(this.container);

      this.container.addEventListener('submit', this);
      this.container.addEventListener('click', this);

      window.addEventListener('attentionopened', this, true);
      window.addEventListener('screenchange', this, true);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);

      this.container.addEventListener('mousedown', this.preventFocusChange);

      window.dispatchEvent(new CustomEvent('imemenushow'));
    },

    /**
     * Removes the dom and stops event listeners
     * @memberof ImeMenu.prototype
     */
    stop: function() {
      document.getElementById('screen').removeChild(this.container);

      window.removeEventListener('attentionopened', this, true);
      window.removeEventListener('screenchange', this, true);
      window.removeEventListener('home', this);
      window.removeEventListener('holdhome', this);

      this.container.removeEventListener('mousedown', this.preventFocusChange);
    },

    /**
     * Returns the view for the ime menu.
     * @memberof ImeMenu.prototype
     */
    imeMenuView: function({title, cancelLabel}) {
      return Sanitizer.escapeHTML `<form role="dialog"
        data-type="value-selector" class="ime-menu value-selector-container"
        data-z-index-level="action-menu">
        <section>
          <h1 data-l10n-id="${title}"></h1>
          <ol class="value-selector-options-container ime-menu-list"
            aria-multiselectable="false" role="listbox">
          </ol>
        </section>
        <menu class="ime-menu-button-container">
          <button class="ime-menu-button" data-type="cancel"
            data-action="cancel" data-l10n-id="cancel"></button>
        </menu>
      </div>`;
    },

    /**
     * Returns the view for a menu item.
     * @memberof ImeMenu.prototype
     */
    menuItemView: function({layoutName, appName, layoutId, selected}) {
      return Sanitizer.escapeHTML `<li role="option" aria-selected="${selected}"
        data-id="${layoutId}">
        <label role="presentation">
          <span class="item-label">${layoutName}</span>
          <span class="item-note">${appName}</span>
        </label>
      </li>`;
    },

    /**
     * Builds the dom for the menu.
     * @memberof ImeMenu.prototype
     */
    buildMenu: function(items) {
      this.menu.innerHTML = '';
      items.forEach(function traveseItems(item) {
        this.menu.innerHTML += this.menuItemView({
          layoutName: item.layoutName,
          appName: item.appName,
          layoutId: item.value.toString(),
          selected: item.selected ? 'true' : 'false'
        });
      }, this);
    },

    /**
     * Hides the ImeMenu.
     * @memberof ImeMenu.prototype
     * @param  {Function} callback The callback to call after hiding.
     */
    hide: function(callback) {
      this.stop();
      if (callback && typeof callback === 'function') {
        setTimeout(callback);
      }
    },

    /**
     * When IME switcher shows, prevent the keyboard focus getting changed.
     * @memberof ImeMenu.prototype
     * @param  {DOMEvent} evt The event.
     */
    preventFocusChange: function(evt) {
       evt.preventDefault();
    },

    /**
     * General event handler interface.
     * Handles submission and cancellation events.
     * @memberof ImeMenu.prototype
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
          if (!evt.detail.screenEnabled) {
            this.hide();
            this.oncancel();
          }
          break;

        case 'click':
          evt.preventDefault();
          var action = target.dataset.action;
          if (action) {
            if (action === 'cancel') {
              this.hide();
              this.oncancel();
              return;
            }

            if (action === 'settings') {
              this.hide();
              this.launchSettings();
              return;
            }
          }

          var id = target.dataset.id;
          if (!id) {
            return;
          }
          id = parseInt(id);
          this.hide(this.onselected.bind(this, id));
          break;

        case 'home':
        case 'holdhome':
          this.hide();
          this.oncancel();
          break;

        case 'attentionopened':
          this.hide();
          break;
      }
    },

    /**
     * To lauch the settings via web activity.
     * @memberof ImeMenu.prototype
     */
    launchSettings: function() {
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'keyboard'
        }
      });
      activity.onerror = function() {
        console.error('Failed to invoke keyboard settings.');
      };
    }
  };

  exports.ImeMenu = ImeMenu;
}(window));
