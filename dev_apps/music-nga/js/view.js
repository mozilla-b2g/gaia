/* exported View */

window.View = (function() {
'use strict';

var debug = 1 ? (...args) => console.log('[View]', ...args) : () => {};

if (!window.parent.SERVICE_WORKERS) (function() {
  window.ROUTES = {
    '/api/activities/share/:filePath': 'share',

    '/api/albums/list': 'getAlbums',
    '/api/albums/info/:filePath': 'getAlbum',

    '/api/artists/list': 'getArtists',
    '/api/artists/info/:filePath': 'getArtist',

    '/api/artwork/original/:filePath': 'getSongArtwork',
    '/api/artwork/thumbnail/:filePath': 'getSongThumbnail',

    '/api/audio/play': 'play',
    '/api/audio/pause': 'pause',
    '/api/audio/seek/:time': 'seek',
    '/api/audio/status': 'getPlaybackStatus',

    '/api/database/status': 'getDatabaseStatus',

    '/api/playlists/list': 'getPlaylists',
    '/api/playlists/info/:id': 'getPlaylist',

    '/api/queue/current': 'currentSong',
    '/api/queue/previous': 'previousSong',
    '/api/queue/next': 'nextSong',
    '/api/queue/album/:filePath': 'queueAlbum',
    '/api/queue/artist/:filePath': 'queueArtist',
    '/api/queue/playlist/:id/shuffle': 'queuePlaylist',
    '/api/queue/playlist/:id/song/:filePath': 'queuePlaylist',
    '/api/queue/song/:filePath': 'queueSong',
    '/api/queue/repeat': 'getRepeatSetting',
    '/api/queue/repeat/:repeat': 'setRepeatSetting',
    '/api/queue/shuffle': 'getShuffleSetting',
    '/api/queue/shuffle/:shuffle': 'setShuffleSetting',

    '/api/songs/list': 'getSongs',
    '/api/songs/count': 'getSongCount',
    '/api/songs/info/:filePath': 'getSong',
    '/api/songs/rating/:rating/:filePath': 'setSongRating'
  };

  for (var path in window.ROUTES) {
    var method = window.ROUTES[path];
    window.ROUTES[path] = parseSimplePath(path);
    window.ROUTES[path].method = method;
  }
})();

function View() {
  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });

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

View.prototype.fetch = function(url) {
  if (window.parent.SERVICE_WORKERS) {
    return window.fetch(url);
  }

  url = decodeURIComponent(url);

  for (var path in window.ROUTES) {
    var route = window.ROUTES[path];
    var match = url.match(route.regexp);

    if (match) {
      return new Promise((resolve) => {
        setTimeout(() => {
          var args = [route.method].concat(match.splice(1));
          this.client.method.apply(this.client, args).then((result) => {
            resolve({
              blob: () => Promise.resolve(result),
              json: () => Promise.resolve(result)
            });
          });
        });
      });
    }
  }

  return Promise.reject();
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

/**
 * Route parser from components/serviceworkerware/dist/sww.js
 */
function parseSimplePath(path) {
  // Check for named placeholder crowding
  if (/\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+/g.test(path)) {
    throw new Error('Invalid usage of named placeholders');
  }

  // Check for mixed placeholder crowdings
  var mixedPlaceHolders =
    /(\*\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\*)/g;
  if (mixedPlaceHolders.test(path.replace(/\\\*/g,''))) {
    throw new Error('Invalid usage of named placeholders');
  }

  // Try parsing the string and converting special characters into regex
  try {
    // Parsing anonymous placeholders with simple backslash-escapes
    path = path.replace(/(.|^)[*]+/g, function(m,escape) {
      return escape==='\\' ? '\\*' : (escape+'(?:.*?)');
    });

    // Parsing named placeholders with backslash-escapes
    var tags = [];
    path = path.replace(/(.|^)\:([a-zA-Z0-9]+)/g, function (m, escape, tag) {
      if (escape === '\\') { return ':' + tag; }
      tags.push(tag);
      return escape + '(.+?)';
    });

    return { regexp: RegExp(path + '$'), tags: tags };
  }

  // Failed to parse final path as a RegExp
  catch (ex) {
    throw new Error('Invalid path specified');
  }

/**
 * Returns a debug function.
 *
 * @example
 *
 * var debug = View.debug('ModuleName').log;
 * debug('foo'); //=> console.log('[ModuleName] - foo')
 *
 * var debug = View.debug('ModuleName').mark;
 * debug('foo'); //=> performance.mark('[ModuleName] - foo')
 *
 * var debug = View.debug('ModuleName');
 * debug('foo'); //=> noop
 *
 * @param  {String} name
 * @return {Function}
 */
View.debug = function(name) {
  var noop = () => {};
  noop.log = (arg1, ...args) => console.log(`[${name}] - "${arg1}"`, ...args);
  noop.mark = arg => parent.performance.mark(`[${name}] - ${arg}`);
  return noop;
}

return View;

})();
