/* exported View */

window.View = (function() {
'use strict';

var debug = 1 ? (...args) => console.log('[View]', ...args) : () => {};

if (!window.parent.SERVICE_WORKERS) {
  window.fetch = function(url) {
    console.log('**** fetch() ****', url);

    var mappings = {
      '/api/albums/list': 'getAlbums',
      '/api/albums/info*': 'getAlbum',

      '/api/artists/list': 'getArtists',
      '/api/artists/info*': 'getArtist',

      '/api/artwork/original*': 'getSongArtwork',
      '/api/artwork/thumbnail*': 'getSongThumbnail',

      '/api/audio/play': 'play',
      '/api/audio/pause': 'pause',
      '/api/audio/seek/*': 'seek',
      '/api/audio/status': 'getPlaybackStatus',

      '/api/queue/current': 'currentSong',
      '/api/queue/previous': 'previousSong',
      '/api/queue/next': 'nextSong',
      '/api/queue/album*': 'queueAlbum',
      '/api/queue/artist*': 'queueArtist',
      '/api/queue/song*': 'queueSong',
      '/api/queue/repeat': 'getRepeatSetting',
      '/api/queue/repeat/*': 'setRepeatSetting',
      '/api/queue/shuffle': 'getShuffleSetting',
      '/api/queue/shuffle/*': 'setShuffleSetting',

      '/api/songs/list': 'getSongs',
      '/api/songs/info*': 'getSong',
      '/api/songs/share*': 'shareSong'
    };

    for (var key in mappings) {
      var mapping = mappings[key];
      var param = undefined;
      if (key.endsWith('*')) {
        key = key.substring(0, key.length - 1);
        param = decodeURIComponent(url.substring(key.length));
      }

      if ((key === url && param === undefined) ||
          (url.startsWith(key) && param !== undefined)) {
        return window.parent.client.method(mapping, param).then((result) => {
          return {
            blob: () => Promise.resolve(result),
            json: () => Promise.resolve(result)
          };
        });
      }
    }
  };
}

function View() {
  this.params = {};

  var parts = window.parent.location.href.split('?');
  parts.shift();

  var query = parts.join('?');
  query.split('&').forEach((param) => {
    var parts = param.split('=');
    this.params[parts[0]] = parts[1];
  });

  var title = typeof this.title === 'function' ? this.title() : this.title;
  if (title instanceof Promise) {
    title.then(title => window.parent.setHeaderTitle(title));
  }

  else {
    window.parent.setHeaderTitle(title);
  }

  window.addEventListener('click', (evt) => {
    var link = evt.target.closest('a');
    if (link) {
      debug('Received "click" event on link', link);
      evt.preventDefault();
      window.parent.navigateToURL(link.getAttribute('href'));
    }
  });

  window.addEventListener('viewdestroy', () => this.destroy());
}

View.prototype.destroy = function() {
  Object.getOwnPropertyNames(this).forEach(prop => this[prop] = null);
};

View.prototype.title = '';

View.prototype.render = function() {
  if (window.frameElement) {
    window.frameElement.dispatchEvent(new CustomEvent('rendered'));
  }

  debug('Rendered');
};

View.preserveListScrollPosition = function(list) {
  var lastScrollTop;
  window.addEventListener('viewhidden', () => {
    lastScrollTop = list._list.scrollTop;
  });

  window.addEventListener('viewvisible', () => {
    list._list.scrollInstantly(lastScrollTop);
  });
};

View.extend = function(subclass) {
  subclass.prototype = Object.create(View.prototype, {
    constructor: {
      value: subclass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  // subclass.__proto__ = View;

  return subclass;
};

return View;

})();
