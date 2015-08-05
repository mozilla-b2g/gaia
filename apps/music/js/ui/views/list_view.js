/* exported ListView */
/* global App, createListElement, Database, IDBKeyRange, ModeManager,
          MODE_PLAYER, MODE_SUBLIST, MODE_SEARCH_FROM_LIST, PlayerView,
          SearchView, SubListView, TabBar, TYPE_MIX, TYPE_SINGLE */
'use strict';

// Assuming the ListView will prepare 5 pages for batch loading.
// Each page contains 7 list elements.
var LIST_BATCH_SIZE = 7 * 5;
// View of List
var ListView = {
  get view() {
    return document.getElementById('views-list');
  },

  get anchor() {
    return document.getElementById('views-list-anchor');
  },

  get searchBox() {
    return document.getElementById('views-list-search');
  },

  get searchInput() {
    return document.getElementById('views-list-search-input');
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;
  },

  init: function lv_init() {
    this.clean();

    this.banner = document.getElementById('info-banner');
    this.bannerChild = document.getElementById('banner-child');

    this.view.addEventListener('click', this);
    this.view.addEventListener('touchmove', this);
    this.view.addEventListener('scroll', this);
    this.view.addEventListener('contextmenu', this);

    this.searchInput.addEventListener('focus', this);

    document.getElementById('btn-add-songs').addEventListener('click', function onClick(e) {
      this.selectToAdd();
    }.bind(this));

    document.getElementById('playlist-menu-add-btn').addEventListener('click', function onClick(e) {
      this.selectToAdd();
    }.bind(this));

    document.getElementById('title-playlist-menu').addEventListener('click', function() {
      document.getElementById('playlist-actions-overlay').classList.remove('hidden');
    });

    document.getElementById('playlist-menu-delete-btn').addEventListener('click', function() {
      musicdb.deletePlaylist(this.currentPlaylist, function(playlistName) {
        document.getElementById('playlist-actions-overlay').classList.add('hidden');
        this.showBanner(navigator.mozL10n.get('playlist-deleted'));
        ModeManager.pop();
      }.bind(this));
    }.bind(this));

    document.getElementById('playlist-menu-rename-btn').addEventListener('click', function() {
      var newName;

      if (newName = prompt(navigator.mozL10n.get('give-playlist-name'))) {
        musicdb.renamePlaylist(this.currentPlaylist, newName, function() {
          document.getElementById('playlist-actions-overlay').classList.add('hidden');
          this.showBanner(navigator.mozL10n.get('playlist-renamed'));
          ModeManager.pop();
        }.bind(this));
      }
    }.bind(this));

    document.getElementById('title-edit-done').addEventListener('click', function() {
      var selectedElems = document.querySelectorAll('input[type=checkbox][name=selected]:checked');
      var selectedIds   = [];

      for (var i = 0; i < selectedElems.length; i++) {
        selectedIds.push(selectedElems[i].value);
      }

      this.showBanner(navigator.mozL10n.get('playlist-adding-wait'));

      this.addToPlaylistArray(this.currentPlaylist, 0, selectedIds, function(songs) {
        this.showBanner(navigator.mozL10n.get('playlist-added'));
        document.getElementById('title-edit-done').classList.add('hidden');

        this.editMode = false;
        this.clean();
        updatePlaylists(this, 'playlist');
      }.bind(this));
    }.bind(this));
  },

  selectToAdd: function lv_selectToAdd() {
    var info = {
      key: 'metadata.title',
      range: null,
      direction:'next',
      option: 'title',
      editMode: true
    };

    ModeManager.start(MODE_LIST);
    ListView.activate(info);

    document.getElementById('empty-playlist-overlay').classList.add('hidden');
    document.getElementById('playlist-actions-overlay').classList.add('hidden');

    document.getElementById('title-edit-done').classList.remove('hidden');
  },

  clean: function lv_clean() {
    this.cancelEnumeration();

    this.info = null;
    this.handle = null;
    this.dataSource = [];

    this.index = 0;
    this.lastDataIndex = 0;
    this.firstLetters = [];
    this.lastFirstLetter = null;
    this.anchor.innerHTML = '';
    this.anchor.style.height = 0;
    this.view.scrollTop = 0;
    this.hideSearch();
    this.moveTimer = null;
    this.scrollTimer = null;
  },

  cancelEnumeration: function lv_cancelEnumeration() {
    // Cancel a pending enumeration before start a new one
    if (this.handle) {
      Database.cancelEnumeration(this.handle);
    }
  },

  hideSearch: function lv_hideSearch() {
    this.searchInput.value = '';
    // XXX: we probably want to animate this...
    if (this.view.scrollTop < this.searchBox.offsetHeight) {
      this.view.scrollTop = this.searchBox.offsetHeight;
    }
  },

  // This function basically create the section header of the list elements.
  // When we hit a different first letter, this function will use it to
  // create a new header then keep it, until to hit another different one,
  // it will create the next header with the new first letter.
  createHeader: function lv_createHeader(option, result) {
    var firstLetter = result.metadata[option].charAt(0);
    var headerLi;

    if (this.lastFirstLetter !== firstLetter) {
      this.lastFirstLetter = firstLetter;

      headerLi = document.createElement('li');
      headerLi.className = 'list-header';
      headerLi.textContent = this.lastFirstLetter || '?';
      headerLi.setAttribute('role', 'heading');
      headerLi.setAttribute('aria-level', '2');
    }

    return headerLi;
  },

  activate: function lv_activate(info) {
    // If info is not provided, then we should be displaying playlists,
    // so it does not need to enumerate from MediaDB.
    if (!info) {
      this.clean();
      return;
    }

    this.editMode = info.editMode;

    // Choose one of the indexes to get the count and it should be the
    // correct count because failed records don't contain metadata, so
    // here we just pick the album, artist or title as indexes.
    Database.count('metadata.' + info.option, null, function(count) {
      this.clean();
      this.info = info;
      // Keep the count with the info for later use in PlayerView.
      this.info.count = count;

      this.handle = Database.enumerate(info.key, info.range, info.direction,
        function(record) {
          if (record) {
            // Check if music is in picker mode because we don't to allow the
            // user to pick locked music.
            if (!App.pendingPick || !record.metadata.locked) {
              this.dataSource.push(record);
            }

            // Save the current length of the dataSource to lastDataIndex
            // because we might expand the length to the total count of
            // the records, since we cannot retrieve all of them in a short
            // time and the enumeration might be cancelled.
            // It will also be used to judge the enumeration is end of not.
            this.lastDataIndex = this.dataSource.length;
          }

          // When we got the first batch size of the records,
          // or the total count is less than the batch size,
          // display it so that users are able to see the first paint
          // very quickly.
          if (this.dataSource.length === LIST_BATCH_SIZE || !record) {
            this.batchUpdate(info.option, LIST_BATCH_SIZE);
            // If record is null then the enumeration is finished,
            // so ListView has all the records and is able to adjust
            // the height.
            count = record ? count : null;
            this.adjustHeight(info.option, count);
            // In picker mode we have to use the ListView's dataSource to
            // display the correct overlay.
            if (App.pendingPick) {
              App.knownSongs = this.dataSource;
              App.showCorrectOverlay();
            }
          }
        }.bind(this));
    }.bind(this));
  },

  update: function lv_update(option, result, noborder) {
    if (result === null) {
      App.showCorrectOverlay();
      return;
    }

    this.dataSource.push(result);

    if (option !== 'playlist' && option !== 'my-playlists-header' && option !== 'create-playlist') {
      var header = this.createHeader(option, result);
      if (header) {
        this.anchor.appendChild(header);
      }
    }

    this.anchor.appendChild(createListElement({
      option: option,
      data: result,
      index: this.index,
      noborder: noborder,
      editMode: this.editMode
    }));

    this.index++;
  },

  // This function is used for judging if the ListView should update and the
  // range it should update, it sees where the bottom element is and calculates
  // its position to know how many to update.
  judgeAndUpdate: function lv_judgeAndUpdate() {
    // If there is no lastChild then the first paint is not drawn yet.
    // Also if the info is not provide, we don't have to judge for updating.
    if (!this.anchor.lastChild || !this.info) {
      return;
    }

    var itemHeight = this.anchor.lastChild.offsetHeight;
    var scrolledHeight = this.view.scrollTop + this.view.offsetHeight;
    var position = Math.round(scrolledHeight / itemHeight);
    var last = this.anchor.children.length;
    var range = position + this.firstLetters.length - last;

    if (range > 0) {
      this.batchUpdate(TabBar.option, range + LIST_BATCH_SIZE);

      // If list handle is cancelled and the lastDataIndex is not -1,
      // it means the enumeration was cancelled and the dataSource is incomplete
      // so that we have to resume it from the last data index we have.
      if (this.handle.state === 'cancelled' && this.lastDataIndex > -1) {
        var info = this.info;
        var index = this.lastDataIndex + 1;

        this.handle = Database.advancedEnumerate(
          info.key, info.range, info.direction, index, function(record) {
            if (record) {
              this.dataSource[index] = record;
              this.lastDataIndex = index;
              index++;
            } else {
              this.lastDataIndex = -1;
            }
          }.bind(this)
        );
      }
    }
  },

  // See where is the last index we have for the existing children, and start
  // to create the rest elements from it, note that here we use fragment to
  // update all the new elements at once, this is for reducing the amount of
  // appending child to the DOM tree.
  batchUpdate: function lv_batchUpdate(option, range) {
    var start = this.index;
    var end = start + range;
    var fragment = document.createDocumentFragment();

    if (end > this.dataSource.length) {
      end = this.dataSource.length;
    }

    for (var i = start; i < end; i++) {
      var data = this.dataSource[i];
      if (data) {
        var header = this.createHeader(option, data);

        if (header) {
          fragment.appendChild(header);
        }

        fragment.appendChild(createListElement({
          option: option,
          data: data,
          index: this.index,
          editMode: this.editMode
        }));

        this.index++;
      }
    }

    this.anchor.appendChild(fragment);
  },

  // Because the correct height of ListView depends on how many records and
  // how many section headers it got, also we don't want to cause too many
  // repaints by appending children to the DOM tree and changes the height,
  // when we got the first count from the MediaDB or the enumeration is end,
  // we can fake the the height by the first adjustment(count), then fix the
  // height to correct by the second adjustment(record is null).
  adjustHeight: function lv_adjustHeight(option, count) {
    // If it's the first launch, then dataSource will be empty and we don't
    // need to adjust the height.
    if (this.dataSource.length === 0) {
      return;
    }

    if (!count) {
      count = this.dataSource.length;
      this.firstLetters.length = 0;
      var previousFirstLetter;
      for (var i = 0; i < this.dataSource.length; i++) {
        var metadata = this.dataSource[i].metadata;
        var firstLetter = metadata[option].charAt(0);
        if (previousFirstLetter !== firstLetter) {
          this.firstLetters.push(firstLetter);
          previousFirstLetter = firstLetter;
        }
      }
    } else {
      // Assuming we have all the letters from A to Z.
      this.firstLetters.length = 26;
    }

    var headerHeight = this.anchor.firstChild.offsetHeight;
    var itemHeight = this.anchor.lastChild.offsetHeight;
    var bottomHeight = parseInt(getComputedStyle(this.anchor.lastChild, null).
      getPropertyValue('margin-bottom'), 10);

    this.anchor.style.height = (
      headerHeight * this.firstLetters.length +
      itemHeight * count +
      bottomHeight
    ) + 'px';
  },

  playWithShuffleAll: function lv_playWithShuffleAll() {
    ModeManager.push(MODE_PLAYER, function() {
      PlayerView.clean();

      Database.count('metadata.title', null, function(count) {
        var info = {
          key: 'metadata.title',
          range: null,
          direction: 'next',
          option: 'title',
          count: count
        };

        PlayerView.setSourceType(TYPE_MIX);
        // Assign an empty array with correct length to the data source
        // so that the PlayerView knows we have a queue in playing and
        // the play icon in the title bar can be displayed correctly.
        PlayerView.dataSource = new Array(count);
        PlayerView.setDBInfo(info);
        PlayerView.setShuffle(true);
        PlayerView.play(PlayerView.shuffledList[0]);
      });
    });
  },

  playWithIndex: function lv_playWithIndex(index) {
    ModeManager.push(MODE_PLAYER, function() {
      PlayerView.clean();

      if (App.pendingPick) {
        PlayerView.setSourceType(TYPE_SINGLE);
      } else {
        PlayerView.setSourceType(TYPE_MIX);
      }

      // Because the ListView might still retrieving the records, and
      // we are assigning the dataSource to the PlayerView, since
      // setDBInfo will expand the dataSource length to the total
      // count we will be retrieved, we must cancel the enumeration
      // or the length will be expanded to a wrong number.
      this.cancelEnumeration();
      PlayerView.dataSource = this.dataSource;
      PlayerView.setDBInfo(this.info);

      if (PlayerView.shuffleOption) {
        // Shuffled list does not exist yet in all songs.
        // Here we need to create a new shuffled list
        // and start from the song which the user clicked.
        PlayerView.shuffleList(index);
        PlayerView.play(PlayerView.shuffledList[0]);
      } else {
        PlayerView.play(index);
      }
    }.bind(this));
  },

  activateSubListView: function lv_activateSubListView(target) {
    var option = target.dataset.option;

    if (option === 'create-playlist') {
        var playlistName = prompt(navigator.mozL10n.get('give-playlist-name'));
        this.addToPlaylist(playlistName, null);
        return;
    }

    var index = target.dataset.index;
    var data = this.dataSource[index];

    if (!data.metadata) {
      // we have a custom playlist...
      return this.activatePlaylist(data);
    }

    var keyRange = (target.dataset.keyRange != 'all') ?
      IDBKeyRange.only(target.dataset.keyRange) : null;
    var l10nId = data.metadata.l10nId;
    var direction =
      (l10nId === 'playlists-most-played' ||
       l10nId === 'playlists-recently-added' ||
       l10nId === 'playlists-highest-rated') ?
       'prev' : 'next';

    // SubListView needs to prepare the songs data before entering it,
    // So here we initialize the SubListView before push the view.
    ModeManager.waitForView(MODE_SUBLIST, () => {
      SubListView.activate(option, data, index, keyRange, direction, () => {
        ModeManager.push(MODE_SUBLIST);
      });
    });
  },

  getSongData: function lv_getSongData(index, callback) {
    var info = this.DBInfo;
    var songData = this.dataSource[index];

    if (songData) {
      callback(songData);
    } else {
      // Cancel the ongoing enumeration so that it will not
      // slow down the next enumeration if we start a new one.
      ListView.cancelEnumeration();

      var handle =
        musicdb.advancedEnumerate(
          info.key, info.range, info.direction, index, function(record) {
            musicdb.cancelEnumeration(handle);
            this.dataSource[index] = record;
            callback(record);
          }.bind(this)
        );
    }
  },

  addToPlaylist: function lv_addToPlaylist(playlistName, index, callback) {
    if (index !== null) {
      this.getSongData(index, function(songData) {
        musicdb.addToPlaylist(playlistName, songData, function() {
          this.showBanner(navigator.mozL10n.get('playlist-added'));
          if (callback) {
            callback(songData);
          }
        }.bind(this));
      }.bind(this));
    } else {
      musicdb.addToPlaylist(playlistName, null, function(playlist) {
        if (playlist) {
          this.showBanner(navigator.mozL10n.get('playlist-created'));
          this.update('playlist', playlist);
          App.showCorrectOverlay();
        } else {
          this.showBanner(navigator.mozL10n.get('playlist-already-exists'));
        }

        if (callback) {
          callback();
        }
      }.bind(this));
    }
  },

  addToPlaylistArray: function lv_addToPlaylistArray(playlistName, idx, songs, callback, songDatas) {
    if (!songDatas) {
      songDatas = [];
    }

    this.addToPlaylist(playlistName, songs[idx], function(songData) {
      songDatas.push(songData);

      if (++idx == songs.length) {
        if (callback) {
          callback(songDatas);
        }
        return;
      }

      this.addToPlaylistArray(playlistName, idx, songs, callback, songDatas);
    }.bind(this));
  },

  activatePlaylist: function lv_activatePlaylist(data) {
    SubListView.activatePlaylist(data, function() {
      this.currentPlaylist = data.name;
      ModeManager.push(MODE_SUBLIST);
    }.bind(this));
  },

  handleEvent: function lv_handleEvent(evt) {
    var target = evt.target;
    if (!target) {
      return;
    }

    switch (evt.type) {
      case 'click':
        if (target.id === 'views-list-search-close') {
          if (ModeManager.currentMode === MODE_SEARCH_FROM_LIST) {
            ModeManager.pop();
          }
          this.hideSearch();
          evt.preventDefault();
        } else {
          var option = target.dataset.option;
          // When an user select "Shuffle all"
          // We just play all songs with shuffle order
          // or change mode to subList view and list songs
          if (option === 'shuffleAll') {
            this.playWithShuffleAll();
          } else if (option === 'title') {
            this.playWithIndex(target.dataset.index);
          } else if (option) {
            this.activateSubListView(target);
          }
        }

        break;

      case 'focus':
        if (target.id === 'views-list-search-input') {
          if (ModeManager.currentMode !== MODE_SEARCH_FROM_LIST) {
            ModeManager.start(MODE_SEARCH_FROM_LIST, function() {
              // Let the search view gets the focus.
              SearchView.searchInput.focus();
            });
          }
        }

        break;

      case 'touchmove':
        // Start the rest batch updating after the first paint
        if (this.anchor.children.length === 0) {
          return;
        }

        if (this.moveTimer) {
          clearTimeout(this.moveTimer);
        }

        // If the move timer is not cancelled, it should be a suitable time
        // to update the ui because we don't want to render elements while
        // the list is scrolling.
        this.moveTimer = setTimeout(function() {
          this.judgeAndUpdate();
          this.moveTimer = null;
        }.bind(this), 50);
        break;

      case 'scroll':
        // Start the rest batch updating after the first paint
        if (this.anchor.children.length === 0) {
          return;
        }

        if (this.scrollTimer) {
          clearTimeout(this.scrollTimer);
        }

        // If the user try to scroll as possible as it can, after the scrolling
        // stops, we can see where the position is and try to render the rest
        // elements that should be displayed on the screen.
        this.scrollTimer = setTimeout(function() {
          this.judgeAndUpdate();
          this.scrollTimer = null;
        }.bind(this), 500);
        break;

      case 'contextmenu':
        var option = target.dataset.option;
        this.selectedSong = target.dataset.index;

        if (option === 'title') {
          document.getElementById('song-actions-overlay').classList.remove("hidden");

          if (!this.overlay_listeners_added) {
            this.addPlaylistOverlayListeners();
            this.overlay_listeners_added = true;
          }
        }
        break;

      default:
        return;
    }
  },
  showBanner: function lv_showBanner(msg) {
    this.banner.classList.add('visible');
    this.bannerChild.textContent = msg;

    setTimeout (function hideBanner() {
      this.banner.classList.remove('visible');
    }.bind(this), 3000);
  },
  addPlaylistOverlayListeners: function lv_addPlaylistOverlayListeners() {
    document.getElementById('playlist-add-btn').addEventListener('click', function() {
      var playlistOverlay = document.getElementById('playlist-overlay');
      var content = document.getElementById('playlist-overlay-content');
      playlistOverlay.classList.remove('hidden');

      //remove previous data
      content.innerHTML = '';

      musicdb.getAllPlaylists(function(playlists) {
        playlists.forEach(function(playlist) {
          this.addToPlaylistOverlay(content, playlist);
        }.bind(this));
      }.bind(this));
    }.bind(this));

    document.getElementById('do-add').addEventListener('click', function() {
      var selected = document.querySelector('input[name=addToPlaylist-radio]:checked');

      if (!selected) {
        return;
      }

      this.addToPlaylist(selected.value, this.selectedSong);
    }.bind(this));
  },
  addToPlaylistOverlay: function lv_addToPlaylistOverlay(playlistOverlay, playlist) {
    var div = document.createElement('div');
    div.className = 'addToPlaylist';

    var label = document.createElement('label');
    var radio = document.createElement('input');
    radio.setAttribute('name', 'addToPlaylist-radio');
    radio.setAttribute('type', 'radio');
    radio.setAttribute('value', playlist.name);
    var span = document.createElement('span');
    span.innerHTML = playlist.name;

    label.appendChild(radio);
    label.appendChild(span);

    div.appendChild(label);
    playlistOverlay.appendChild(div);
  }
};
