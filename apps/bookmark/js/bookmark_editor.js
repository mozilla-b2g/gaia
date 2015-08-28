'use strict';

/* global UrlHelper, BookmarksDatabase, GaiaPinCard */
/* exported BookmarkEditor */

var BookmarkEditor = {
  APP_ICON_SIZE: 60,

  init: function bookmarkEditor_show(options) {
    this.data = options.data;
    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;
    var mode = 'add';
    BookmarksDatabase.get(this.data.url).then((function got(bookmark) {
      // We'll use this in bug 1197865
      if (bookmark) {
        this.data = bookmark;
        mode = 'put';
      }
      this._init(mode);
    }).bind(this), this._init.bind(this, mode));
  },

  _init: function bookmarkEditor_init(mode) {
    this.mode = document.body.dataset.mode = mode;
    this.pinURL = document.getElementById('pin-page-url');
    this.pinCardContainer = document.getElementById('pin-card-container');
    this.header = document.querySelector('gaia-header');
    this.header.addEventListener('action', this.close.bind(this));
    this.pinButton = document.querySelector('button[data-action="pin"]');
    this.pinButton.addEventListener('click', this.save.bind(this));

    this.pinURL.textContent = this.data.url;

    this._renderPinCard();

    // We're appending new elements to DOM so to make sure headers are
    // properly resized and centered, we emmit a lazyload event.
    // This will be removed when the gaia-header web component lands.
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: document.body
    }));
  },

  _renderPinCard: function renderIcon() {
    this.card = new GaiaPinCard();
    this.card.title = this.data.title;
    if (this.data.icon) {
      this.card.icon = 'url(' + URL.createObjectURL(this.data.icon) + ')';
    }

    this.pinCardContainer.innerHTML = '';

    var screenshot = this.data.screenshot || null;
    var screenshotURL = screenshot ? URL.createObjectURL(screenshot) : null;
    this.card.background = {
      src: screenshotURL,
      themeColor: this.data.theme
    };
    this.pinCardContainer.appendChild(this.card);
  },

  close: function bookmarkEditor_close() {
    this.oncancelled();
  },

  _getPlacesStore: function() {
    return new Promise(resolve => {
      if (this.dataStore) {
        return resolve(this.dataStore);
      }
      navigator.getDataStores('places').then(stores => {
        this.dataStore = stores[0];
        return resolve(this.dataStore);
      });
    });
  },

  save: function bookmarkEditor_save(evt) {
    // Only allow urls to be bookmarked.
    // This is defensive check - callers should filter out non-URLs.
    var url = this.data.url.trim();
    var data = this.data;
    if (UrlHelper.isNotURL(url)) {
      this.oncancelled();
      return;
    }

    this._getPlacesStore().then(store => {
      store.get(url)
      .then(place => {
        place.pinned = true;
        place.pinTime = Date.now();
        place.title = data.title;
        place.themeColor = data.theme;
        place.screenshot = data.screenshot;
        store.put(place, url).then(() => {
          console.log('Pinned successufully');
          this.onsaved(true);
        })
        .catch(error => {
          this.close();
          console.log('Error pinning', error);
        });
      });
    });
  }
};
