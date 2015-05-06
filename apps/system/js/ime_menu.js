'use strict';

/* global Template, LazyLoader, MozActivity */
(function(exports) {
  /**
   * ImeMenu displays a list of currently enabled IMEs in an overlay.
   * @class ImeMenu
   * @param {Array} listItems An array of objects to display.
   * @param {String} title The content of the header.
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
      LazyLoader.load('shared/js/template.js', this.initUI.bind(this));
    },

    /**
     * Builds dom and adds event listeners
     * @memberof ImeMenu.prototype
     */
    initUI: function() {
      var dummy = document.createElement('div');
      var _ = navigator.mozL10n ? navigator.mozL10n.get : function(){};

      dummy.innerHTML = Template('ime-menu-template').interpolate({
        title: this.title,
        cancelLabel: _('cancel')
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
     * Builds the dom for the menu.
     * @memberof ImeMenu.prototype
     */
    buildMenu: function(items) {
      this.menu.innerHTML = '';
      var itemTemplate = new Template('ime-menu-item-template');

      items.forEach(function traveseItems(item) {
        this.menu.innerHTML += itemTemplate.interpolate({
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
