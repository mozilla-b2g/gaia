/* exported TabBar */
/* global shuffleAllTitle, shuffleAllTitleL10nId, highestRatedTitle,
          highestRatedTitleL10nId, recentlyAddedTitle, recentlyAddedTitleL10nId,
          mostPlayedTitle, mostPlayedTitleL10nId, leastPlayedTitle,
          leastPlayedTitleL10nId, AccessibilityHelper, ListView, TilesView,
          MODE_TILES, MODE_LIST, ModeManager */
'use strict';

var TabBar = {
  // this array is for automated playlists
  playlistArray: [
    {metadata: {title: shuffleAllTitle,
      l10nId: shuffleAllTitleL10nId}, option: 'shuffleAll'},
    {metadata: {title: highestRatedTitle,
      l10nId: highestRatedTitleL10nId}, option: 'rated'},
    {metadata: {title: recentlyAddedTitle,
      l10nId: recentlyAddedTitleL10nId}, option: 'date'},
    {metadata: {title: mostPlayedTitle,
      l10nId: mostPlayedTitleL10nId}, option: 'played'},
    {metadata: {title: leastPlayedTitle,
      l10nId: leastPlayedTitleL10nId}, option: 'played'},
    // update ListView with null result to hide the scan progress
    null
  ],

  get view() {
    return document.getElementById('tabs');
  },

  get tabs() {
    return this.view.querySelectorAll('[role="tab"]');
  },

  init: function tab_init() {
    this.option = '';
    this.view.addEventListener('click', this);

    this.playlistArray.localize = function() {
      this.forEach(function(playList) {
        if (playList) {
          var metadata = playList.metadata;
          if (metadata && metadata.l10nId) {
            metadata.title = navigator.mozL10n.get(metadata.l10nId);
          }
        }
      });
    };
  },

  setDisabled: function tab_setDisabled(option) {
    this.disabled = option;
  },

  handleEvent: function tab_handleEvent(evt) {
    if (this.disabled) {
      return;
    }

    switch (evt.type) {
      case 'click':
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

        AccessibilityHelper.setAriaSelected(target, this.tabs);

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
            ModeManager.start(MODE_LIST);
            ListView.activate();

            this.playlistArray.forEach(function(playlist) {
              ListView.update(this.option, playlist);
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

            ModeManager.start(MODE_LIST);
            ListView.activate(info);
            break;
        }

        break;

      default:
        return;
    }
  }
};
