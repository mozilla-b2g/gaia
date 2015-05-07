/* exported TitleBar */
/* global LazyLoader, ModeManager, MODE_PICKER, MODE_PLAYER, PlayerView,
          AlbumArtCache, App */
'use strict';

var TitleBar = {
  get view() {
    return document.getElementById('title');
  },

  get titleText() {
    return document.querySelector('#title-text bdi');
  },

  get playerIcon() {
    return document.getElementById('title-player');
  },

  get scanProgress() {
    return document.getElementById('scan-progress');
  },

  get scanCount() {
    return document.getElementById('scan-count');
  },

  get scanArtist() {
    return document.getElementById('scan-artist');
  },

  get scanTitle() {
    return document.getElementById('scan-title');
  },

  init: function tb_init() {
    this.view.addEventListener('click', this);
    this.view.addEventListener('action', this.onActionBack);
  },

  changeTitleText: function tb_changeTitleText(content) {
    this.titleText.textContent = content;
  },

  showBackArrow: function(show) {
    if (show) { this.view.setAttribute('action', 'back'); }
    else { this.view.removeAttribute('action'); }
  },

  onActionBack: function() {
    if (App.pendingPick) {
      if (ModeManager.currentMode === MODE_PICKER) {
        App.pendingPick.postError('pick cancelled');
        return;
      }

      PlayerView.stop();
    }

    ModeManager.pop();
  },

  showScanProgress: function(info) {
    this.scanProgress.classList.remove('hidden');
    this.scanCount.textContent = info.count;
    this.scanArtist.textContent = info.artist || '';
    this.scanTitle.textContent = info.title || '';
  },

  hideScanProgress: function() {
    this.scanProgress.classList.add('hidden');
  },

  handleEvent: function tb_handleEvent(evt) {
    var target = evt.target;

    function cleanupPick() {
      PlayerView.stop();
    }

    switch (evt.type) {
      case 'click':
        if (!target) {
          return;
        }

        switch (target.id) {
          case 'title-player':
            // We cannot to switch to player mode
            // when there is no song in the dataSource of player
            if (PlayerView.dataSource.length !== 0) {
              ModeManager.push(MODE_PLAYER);
            }

            break;
          case 'title-done':
            var currentFileinfo = PlayerView.dataSource[
              PlayerView.currentIndex
            ];
            var playingBlob = PlayerView.playingBlob;

            LazyLoader.load('js/metadata/album_art_cache.js', function() {
              AlbumArtCache.getCoverBlob(currentFileinfo)
                           .then(function(picture) {
                var currentMetadata = currentFileinfo.metadata;
                App.pendingPick.postResult({
                  type: playingBlob.type,
                  blob: playingBlob,
                  name: currentMetadata.title || '',
                  // We only pass some metadata attributes so we don't share
                  // personal details like # of times played and ratings.
                  metadata: {
                    title: currentMetadata.title,
                    artist: currentMetadata.artist,
                    album: currentMetadata.album,
                    picture: picture
                  }
                });

                cleanupPick();
              });
            });
            break;
        }

        break;

      default:
        return;
    }
  }
};
