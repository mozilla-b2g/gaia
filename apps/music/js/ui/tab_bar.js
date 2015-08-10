/* exported TabBar */
/* global AccessibilityHelper, ListView, TilesView,
          MODE_TILES, MODE_LIST, ModeManager, musicdb */
'use strict';

var TabBar = {
  get view() {
    return document.getElementById('tabs');
  },

  get tabs() {
    return this.view.querySelectorAll('[role="tab"]');
  },

  set option(choice) {
    var map = {
      'mix': 'tabs-mix',
      'playlist': 'tabs-playlists',
      'artist': 'tabs-artists',
      'album': 'tabs-albums',
      'title': 'tabs-songs'
    };

    var tab = document.getElementById(map[choice]);
    AccessibilityHelper.setAriaSelected(tab, this.tabs);
    this._option = choice;
  },

  get option() {
    return this._option;
  },

  init: function tab_init() {
    this.option = 'mix';
    this.view.addEventListener('touchend', this);
  },

  setDisabled: function tab_setDisabled(option) {
    this.disabled = option;
  },

  handleEvent: function tab_handleEvent(evt) {
    if (this.disabled) {
      return;
    }

    switch (evt.type) {
      case 'touchend':
        document.getElementById('title-playlist-menu').classList.add('hidden');
        var target = evt.target;

        if (!target) {
          return;
        }

        // if users click same option, ignore it
        if (this.option === target.dataset.option) {
          return;
        } else {
          this.option = target.dataset.option;
        }

        switch (target.id) {
          case 'tabs-mix':
            // Assuming the users will switch to ListView later or tap one of
            // the album on TilesView to play, just cancel the enumeration
            // because we will start a new one and it can be responsive.
            ListView.cancelEnumeration();

            ModeManager.start(MODE_TILES);
            TilesView.hideSearch();

            break;
          case 'tabs-playlists':
            ModeManager.start(MODE_LIST, function() {
              ListView.activate();
              updatePlaylists(ListView, this.option);
            }.bind(this));
            break;
          case 'tabs-artists':
          case 'tabs-albums':
          case 'tabs-songs':
            var info = {
              key: 'metadata.' + this.option,
              range: null,
              direction: (this.option === 'title') ? 'next' : 'nextunique',
              option: this.option
            };

            ModeManager.start(MODE_LIST, function() {
              ListView.activate(info);
            });

            break;
        }

        break;

      default:
        return;
    }
  }
};
