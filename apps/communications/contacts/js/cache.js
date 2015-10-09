'use strict';

(function() {
  // Ideally we should store this value in the configuration file.
  // However, that means that we need to load two more script files and
  // read directly from the config.json file or from the cookie storing
  // the configuration data. This steals us ~150ms of startup time, so
  // we chose to hard code this value instead.
  const CACHE_ENABLED = true;
  const FIRST_CHUNK = 'firstChunk';

  const l10nStrings = {
    'title': {
      query: 'gaia-header h1#app-title[data-l10n-id="contacts"]',
      container: 'textContent'
    },
    'search': {
      query: 'input[data-l10n-id="search-contact"]',
      container: 'placeholder'
    }
  };

  var _observers = {};

  function addObserver(aMessage, aCallback) {
    if (typeof aCallback !== 'function') {
      return;
    }

    if (!_observers[aMessage]) {
      _observers[aMessage] = [];
    }
    _observers[aMessage].push(aCallback);
  }

  function notifyObservers(aMessage, aData) {
    var observers = _observers[aMessage];
    if (!observers) {
      return;
    }

    for (var callback in observers) {
      if (observers[callback]) {
        observers[callback](aData);
      }
    }
  }

  // So far we only cache the first chunk of contacts, but we may want to
  // extend the cache to a bigger or even the whole list in the future.
  var _caches = new Map();
  _caches.set(FIRST_CHUNK, {
    containerId: 'groups-list',
    active: false
  });

  var _cachedContacts;
  var _cachedFavorites;
  var _cachedHeaders;
  var _cacheEvictionTimer;

  function setCache(aCache) {
    if (!CACHE_ENABLED || !aCache.id ||
        !aCache.content || !aCache.lastOrderString ||
        !_caches.has(aCache.id)) {
      return;
    }

    var l10n = {};
    Object.keys(l10nStrings).forEach(key => {
      var string = l10nStrings[key];
      var selector = document.querySelector(string.query);
      if (!selector || !selector[string.container]) {
        return;
      }
      l10n[key] = selector[string.container];
    });

    localStorage.setItem(aCache.id, JSON.stringify({
      content: aCache.content,
      languageDirection: navigator.mozL10n.language.direction,
      languageCode: navigator.mozL10n.language.code,
      lastOrderString: aCache.lastOrderString,
      updated: Date.now(),
      // Because we lazy load l10n.js quite late, we need to cache the
      // localized strings to avoid showing the unlocalized text during
      // the start up process.
      l10n: l10n
    }));
  }

  function deleteCache(aId) {
    if (!CACHE_ENABLED) {
      return;
    }
    localStorage.removeItem(aId);
  }

  function getCachedContacts(aNodeList) {
    if (!CACHE_ENABLED || !aNodeList) {
      return;
    }

    if (!_cachedContacts) {
      _cachedContacts = new Map();
    }

    if (!_cachedFavorites) {
      _cachedFavorites = new Map();
    }

    for (var i = 0; i < aNodeList.length; i++) {
      var cacheEntry = aNodeList[i];
      if (cacheEntry.parentNode.id == 'contact-list-ice') {
        continue;
      }

      if (cacheEntry.parentNode.id == 'contacts-list-favorites') {
        _cachedFavorites.set(cacheEntry.dataset.uuid,
                             cacheEntry.innerHTML);
        continue;
      }

      _cachedContacts.set(cacheEntry.dataset.uuid,
                          cacheEntry.innerHTML);
    }
  }

  function appendNodesToContainer(aContainer, aNodeList) {
    if (!CACHE_ENABLED || !aNodeList.length) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (!_cachedHeaders) {
        _cachedHeaders = {};
      }
      var resolved = false;
      var fragment = document.createDocumentFragment();
      aNodeList.forEach((node) => {
        if (!node.elementName) {
          return;
        }
        var child = document.createElement(node.elementName);
        node.attributes && node.attributes.forEach((attribute) => {
          if (!attribute.name || !attribute.value) {
            return;
          }
          child.setAttribute(attribute.name, attribute.value);
        });
        if (node.innerHTML) {
          child.innerHTML = node.innerHTML;
        }
        fragment.appendChild(child);

        var headerName = child.id.split('section-group-')[1];
        _cachedHeaders[headerName] =
          fragment.querySelector('ol#contacts-list-' + headerName);

        if (!resolved) {
          resolve();
        }
      });
      getCachedContacts(fragment.querySelectorAll('li[data-cache=true]'));
      aContainer.appendChild(fragment);
    });
  }

  function removeCacheFromContainer(aContainer) {
    if (!CACHE_ENABLED || !_cachedContacts) {
      return;
    }
    for (var id of _cachedContacts.keys()) {
      var items = aContainer.querySelectorAll('li[data-uuid=\"' + id + '\"]');
      Array.prototype.forEach.call(items, (item) => {
        var ol = item.parentNode;
        ol.removeChild(item);
        if (ol.children.length < 1) {
          var header = _cachedHeaders[ol.dataset.group];
          if (header) {
            var groupTitle = header.parentNode.children[0];
            groupTitle.classList.add('hide');
          }
        }
      });
    }
  }

  function undoCache(aCacheId) {
    if (!CACHE_ENABLED || !_caches.has(aCacheId)) {
      return;
    }

    var _cache = _caches.get(aCacheId);

    if (!_cache.containerId) {
      return;
    }

    var container = document.getElementById(_cache.containerId);
    if (!container) {
      console.warning('Could not remove cached content from ' +
                      _cache.containerId);
      return;
    }

    removeCacheFromContainer(container);
  }

  var Cache = {
    get active() {
      return CACHE_ENABLED && _caches.get(FIRST_CHUNK).active;
    },

    get enabled() {
      return CACHE_ENABLED;
    },

    get contacts() {
      return (CACHE_ENABLED && _cachedContacts) ? _cachedContacts.keys()
                                                : null;
    },

    get favorites() {
      return (CACHE_ENABLED && _cachedFavorites) ? _cachedFavorites.keys()
                                                 : null;
    },

    get length() {
      return (CACHE_ENABLED && _cachedContacts) ?
        _cachedContacts.size + _cachedFavorites.size : 0;
    },

    get headers() {
      return (CACHE_ENABLED && _cachedHeaders) ? _cachedHeaders
                                               : {};
    },

    // We need to know the order string of the last contact in the cache
    // so we can insert externaly added contacts in the appropriate order.
    get lastOrderString() {
      return (CACHE_ENABLED && _caches.get(FIRST_CHUNK).lastOrderString);
    },

    get updated() {
      return (CACHE_ENABLED && _caches.get(FIRST_CHUNK).updated);
    },

    // For testing purposes only.
    get _rawContent() {
      return _caches.get(FIRST_CHUNK).content;
    },

    set firstChunk(aFirstChunk) {
      if (!CACHE_ENABLED || !aFirstChunk ||
          !aFirstChunk.cache || !aFirstChunk.lastOrderString) {
        return;
      }
      setCache({
        id: FIRST_CHUNK,
        content: aFirstChunk.cache,
        lastOrderString: aFirstChunk.lastOrderString
      });
    },

    set oneviction(aCallback) {
      if (!CACHE_ENABLED) {
        return;
      }
      addObserver('oneviction', aCallback);
    },

    hasContact: function(aUuid) {
      if (!CACHE_ENABLED) {
        return;
      }
      return _cachedContacts && _cachedContacts.has(aUuid);
    },

    hasFavorite: function(aUuid) {
      if (!CACHE_ENABLED) {
        return;
      }
      return _cachedFavorites && _cachedFavorites.has(aUuid);
    },

    getContact: function(aUuid) {
      if (!CACHE_ENABLED || !this.hasContact(aUuid)) {
        return;
      }
      // We should get each contact once while rendering the contacts list
      // to see if what we have in the cache is different to what we have in
      // the contacts source (most likely mozContacts). Removing the contact
      // entry from the map allow us to easily check if we have any contact in
      // the cache that was deleted from the original source and so it needs
      // to be removed from the view.
      var contact = _cachedContacts.get(aUuid);
      _cachedContacts.delete(aUuid);
      return contact;
    },

    getFavorite: function(aUuid) {
      if (!CACHE_ENABLED || !this.hasFavorite(aUuid)) {
        return;
      }
      var contact = _cachedFavorites.get(aUuid);
      _cachedFavorites.delete(aUuid);
      return contact;
    },

    removeContact: function(aUuid) {
      if (!CACHE_ENABLED ||
          !this.hasContact(aUuid) ||
          !this.hasFavorite(aUuid)) {
        return;
      }
      if (_cachedContacts.has(aUuid)) {
        _cachedContacts.delete(aUuid);
      }
      if (_cachedFavorites.has(aUuid)) {
        _cachedFavorites.delete(aUuid);
      }
    },

    _doEvict: function(aUndo) {
      _cacheEvictionTimer = null;
      if (aUndo) {
        undoCache(FIRST_CHUNK);
      }
      deleteCache(FIRST_CHUNK);
      this.cleanup();
      notifyObservers('oneviction');
    },

    evict: function(aUndo, aInstant) {
      if (!CACHE_ENABLED) {
        return;
      }

      // There are cases where we need to evict the cache
      // inmediately, like in web activities, where we can be closed
      // before doing the eviction.
      if (aInstant) {
        this._doEvict(aUndo);
        return;
      }

      // Evicting the cache means accessing localStorage.
      // Use the following logic to evict the cache in a moderate pattern.
      // 1. When a request to evict the cache is received, start a timer.
      // 2. If another request is received while the timer is
      //    running, reset it.
      // 3. Once the timer fires, evict the cache.

      if (_cacheEvictionTimer) {
        clearTimeout(_cacheEvictionTimer);
      }

      _cacheEvictionTimer = setTimeout(() => {
        this._doEvict(aUndo);
      }, 1000);
    },

    maybeEvict: function() {
      if (!CACHE_ENABLED || !this.active) {
        return;
      }
      if ((_caches.get(FIRST_CHUNK).languageDirection !=
           navigator.mozL10n.language.direction) ||
          (_caches.get(FIRST_CHUNK).languageCode !=
           navigator.mozL10n.language.code)) {
        // If the language direction or code changed, we need to evict and also
        // undo the applied cache.
        this.evict(true /* remove applied cache from DOM */);
      }
    },

    cleanup: function() {
      if (!CACHE_ENABLED) {
        return;
      }
      _caches.get(FIRST_CHUNK).active = false;
      _caches.get(FIRST_CHUNK).content = null;
      _cachedContacts = null;
      _cachedFavorites = null;
      _cachedHeaders = null;
    },

    apply: function(aCacheId) {

      if (!CACHE_ENABLED || !_caches.has(aCacheId)) {
        return Promise.reject();
      }

      var _cache = _caches.get(aCacheId);

      var cache = localStorage.getItem(aCacheId);
      if (!cache) {
        return Promise.reject();
      }

      try {
        cache = JSON.parse(cache);
        _cache.content = cache.content;
        _cache.languageDirection = cache.languageDirection;
        _cache.languageCode = cache.languageCode;
        _cache.lastOrderString = cache.lastOrderString;
        _cache.updated = new Date(cache.updated);
      } catch(e) {
        console.error(e);
        return Promise.reject();
      }

      if (!_cache.containerId) {
        return Promise.reject();
      }

      if (cache.l10n) {
        Object.keys(cache.l10n).forEach(key => {
          if (!l10nStrings[key] || cache.l10n[key] === 'undefined') {
            return;
          }
          var string = l10nStrings[key];
          var selector = document.querySelector(string.query);
          if (!selector) {
            return;
          }
          selector[string.container] = cache.l10n[key];
        });
      }

      if (cache.languageDirection) {
        var html = document.querySelector('html');
        html.setAttribute('dir', cache.languageDirection);
      }

      var container = document.getElementById(_cache.containerId);
      if (!container) {
        console.warning('Could not apply cached content to ' +
                        _cache.containerId);
        return Promise.reject();
      }

      return appendNodesToContainer(container, _cache.content).then(() => {
        _cache.content = null;
        _cache.active = true;
        _caches.set(aCacheId, _cache);
        return Promise.resolve();
      });
    }
  };

  window.Cache = Cache;
})();
