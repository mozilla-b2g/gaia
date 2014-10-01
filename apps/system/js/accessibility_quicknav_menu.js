'use strict';
/* global SettingsListener */

(function(exports) {

  function AccessibilityQuicknavMenu() {
    SettingsListener.observe('accessibility.screenreader_quicknav_modes', '',
      function observe(aValue) {
        this.updateModes(aValue.split(','));
      }.bind(this));
    SettingsListener.observe('accessibility.screenreader_quicknav_index', 0,
      function observe(aValue) {
        this.updateCurrentMode(aValue);
      }.bind(this));
    this.render();
  }

  AccessibilityQuicknavMenu.prototype = {
    container: null,
    currentMode: 0,
    modes: [],

    render: function render() {
      this.element = document.createElement('div');
      this.element.id = 'accessibility-quicknav';
      this.element.dataset.zIndexLevel = 'accessibility-quicknav-menu';
      this.element.dataset.type = 'value-selector';
      this.element.setAttribute('role', 'dialog');
      this.element.addEventListener('click', this);
      this.element.innerHTML =
        '<div id="accessibility-quicknav-container">' +
          '<section>' +
            '<ul role="listbox">' +
            '</ul>' +
          '</section>' +
        '</div>';

      if (this.modes.length) {
        this.updateModes(this.modes);
      }

      var screen = document.getElementById('screen');
      screen.appendChild(this.element);
    },

    updateModes: function updateModes(aModes) {
      this.modes = aModes;
      if (!this.element) {
        return;
      }

      var ul = this.element.querySelector('ul');
      ul.innerHTML = '';
      for (var i in aModes) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        if (i == this.currentMode) {
          li.setAttribute('aria-selected', true);
        }
        li.setAttribute('aria-moz-quick-activate', true);
        li.dataset.quicknavIndex = i;
        var label = document.createElement('label');
        label.setAttribute('role', 'presentation');
        li.appendChild(label);
        var span = document.createElement('span');
        span.dataset.l10nId = 'accessibility-quicknav_' + aModes[i];
        label.appendChild(span);
        ul.appendChild(li);
      }
    },

    updateCurrentMode: function updateCurrentMode(aCurrentMode) {
      this.currentMode = aCurrentMode;
      if (!this.element) {
        return;
      }

      var item = this.element.querySelector('li[aria-selected=true]');
      if (item) {
        item.removeAttribute('aria-selected');
      }
      item = this.element.querySelectorAll('li[role=option]')[aCurrentMode];
      if (item) {
        item.setAttribute('aria-selected', true);
      }
    },

    show: function show() {
      this.element.classList.add('visible');
    },

    hide: function hide() {
      this.element.classList.remove('visible');
    },

    handleEvent: function quicknavMenu_handleEvent(aEvent) {
      var index = Number(aEvent.target.dataset.quicknavIndex);
      // This configures the screen reader to use the selected mode for quicknav
      SettingsListener.getSettingsLock().set({
        'accessibility.screenreader_quicknav_index': index
      });

      this.hide();
    }
  };

  exports.AccessibilityQuicknavMenu = AccessibilityQuicknavMenu;
}(window));