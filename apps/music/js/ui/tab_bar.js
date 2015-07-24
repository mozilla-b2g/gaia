/* exported TabBar */
/* global AccessibilityHelper, ListView, TilesView,
          MODE_TILES, MODE_LIST, ModeManager, musicdb */
'use strict';

var TabBar = {
  // this array is for automated playlists
  playlistArray: [
    { metadata: { l10nId: 'playlists-shuffle-all' }, option: 'shuffleAll' },
    { metadata: { l10nId: 'playlists-highest-rated' }, option: 'rated' },
    { metadata: { l10nId: 'playlists-recently-added' }, option: 'date' },
    { metadata: { l10nId: 'playlists-most-played' }, option: 'played' },
    { metadata: { l10nId: 'playlists-least-played' }, option: 'played' },
    // update ListView with null result to hide the scan progress
    null
  ],

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

              this.playlistArray.forEach(function(playlist) {
                ListView.update(this.option, playlist);
              }.bind(this));

              musicdb.getAllPlaylists(function(playlists) {
                playlists.forEach(function(playlist) {
                  ListView.update(this.option, playlist);
                }.bind(this));
              }.bind(this));
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
