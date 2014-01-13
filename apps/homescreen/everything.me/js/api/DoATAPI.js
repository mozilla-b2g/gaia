'use strict';

Evme.DoATAPI = new function Evme_DoATAPI() {
  var NAME = 'DoATAPI', self = this,
      requestRetry = null,
      cached = [],

      apiKey = '',
      deviceId = '',

      // number of retries before returning error
      NUMBER_OF_RETRIES = 3,

      // timeout before retrying a failed request
      RETRY_TIMEOUT = {'from': 1000, 'to': 3000},

      // timeout before declaring a request as failed
      // (if server isn't responding)
      MAX_REQUEST_TIME = 20000,

      // maximum number of calls to save in the user's cache
      MAX_ITEMS_IN_CACHE = 20,

      CACHE_EXPIRATION_IN_MINUTES = 24 * 60,
      STORAGE_KEY_CREDS = 'credentials',
      authCookieName = '',
      userLat,
      userLon,
      appVersion,
      manualCredentials = null,
      manualCampaignStats = null,
      requestingSession = false,
      permanentStats = null,

      requestsQueue = {},
      requestsToPerformOnOnline = {},
      sessionInitRequest = null,

      // here we will save the actual params to pass
      savedParamsToPass = {},
      // which param to pass from normal requests to stats and logs
      PARAM_TO_PASS_BETWEEN_REQUESTS = 'requestId',
      PARAM_TO_PASS_BETWEEN_REQUESTS_NAME = 'originatingRequestId',

      // client info- saved in cookie and sent to API
      clientInfo = {
        'lc': navigator.language,
        'tz': (new Date().getTimezoneOffset() / -60).toString(),
        'kb': ''
      },

      requestsToCache = {
        'Search.apps': true,
        'Search.bgimage': true,
        'Shortcuts.get': 2 * 24 * 60,
        'Shortcuts.suggestions': 2 * 24 * 60
      },
      requestsThatDontNeedConnection = {
        'Search.suggestions': true,
        'App.icons': true
      },
      paramsToCleanFromCacheKey =
                        ['cachedIcons', 'idx', 'feature', 'sid', 'credentials'],
      doesntNeedSession = {
        'Session.init': true
      },

      // parameters for getting native app suggestions
      paramsForNativeSuggestions = {
        'nativeSuggestions': true,
        'nativeIconFormat': 64, // same as GridManager.PREFERRED_ICON_SIZE
        'nativeIconAsUrl': true,
        '_opt': 'app.type'
      },

      /*
       * config of params to pass from requests to reports
       * "Search.apps": ["appClick", "returnFromApp"]
       */
      paramsToPassBetweenRequests = {
        'Search.apps': ['appClick', 'loadMore', 'addToHomeScreen']
      };

  this.ERROR_CODES = {
    'SUCCESS': 1,
    'AUTH': -9,
    'INVALID_PARAMS': -14,
    'TIMEOUT': -19
  };

  this.init = function init(options) {
    apiKey = options.apiKey;
    appVersion = options.appVersion || '';
    authCookieName = options.authCookieName;
    manualCampaignStats = options.manualCampaignStats;

    // temporarily generate a device id, so that requests going out before we
    // took it from the cache won't fail
    deviceId = generateDeviceId();
    getDeviceId(function deviceIdGot(value) {
      deviceId = value;
    });

    Evme.Storage.get(STORAGE_KEY_CREDS, function storageGot(value) {
      manualCredentials = value;
    });

    permanentStats = {
      screenHeight: window.screen.height,
      screenWidth: window.screen.width
    };

    var mozSettings = navigator.mozSettings;
    if (mozSettings) {
      // make sure our client info cookie is always
      // updated according to phone settings
      mozSettings.addObserver('language.current', function onLanguageChange(e) {
        self.setClientInfoLocale(e.settingValue);
      });
      mozSettings.addObserver('time.timezone', function onTimeZoneChange(e) {
        self.setClientInfoTimeZone();
      });
      mozSettings.addObserver('keyboard.current',
          function onKeyboardLayoutChange(e) {
          self.setKeyboardLanguage(e.settingValue);
        });

      // get device info
      var req = mozSettings.createLock().get('*');
      req.onsuccess = function onsuccess() {
        var res = req.result;
        permanentStats.osVersion = res['deviceinfo.os'] || '';
        permanentStats.deviceType = res['deviceinfo.product_model'] || '';
      };
    }

    var Conn = Evme.Utils.Connection;
    Conn.addEventListener(Conn.events.MOBILE_CONNECTION_CHANGE,
        function onConnChange(data) {
          permanentStats.carrierName = data && data.operator || '';
        });

    self.Session.init(options.callback);
  };

  this.search = function search(options, callback, noSession) {
    !options && (options = {});

    var params = {
      'query': options.query,
      'experienceId': options.experienceId || '',
      'typeHint': options.typeHint || '',
      'feature': options.feature || '',
      'cachedIcons': options.cachedIcons || '',
      'exact': !!options.exact,
      'spellcheck': !!options.spellcheck,
      'suggest': !!options.suggest,
      'first': options.first || 0,
      'limit': options.limit || 16,
      'idx': options.index || '',
      'iconFormat': options.iconFormat || 10,
      'prevQuery': (options.first === 0) ? options.prevQuery || '' : '',
      '_opt': 'app.type'
    };

    if (params.first) {
      Evme.EventHandler.trigger(NAME, 'loadmore', params);
    }

    if (params.exact) {
      for (var key in paramsForNativeSuggestions) {
      if (params[key] === undefined) {
        params[key] = paramsForNativeSuggestions[key];
      }
      }
    }

    return request({
      'methodNamespace': 'Search',
      'methodName': 'apps',
      'params': params,
      'callback': callback,
      'noSession': noSession
    }, options._NOCACHE || false);
  };

  // icons in cache, to be reported to server
  this.CachedIcons = new function CachedIcons() {
    var self = this,
    newIcons = [];

    this.add = function add(icon) {
    newIcons.push(icon);
    };

    this.clear = function clear() {
    newIcons = [];
    };

    this.yank = function yank() {
    var result = Evme.Utils.convertIconsToAPIFormat(newIcons);
    self.clear();
    return result;
    };
  };

  this.suggestions = function suggestions(options, callback) {
    !options && (options = {});

    var params = {
      'query': options.query
    };

    return request({
      'methodNamespace': 'Search',
      'methodName': 'suggestions',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
  };

  this.icons = function icons(options, callback) {
    !options && (options = {});

    var params = {
      'ids': options.ids,
      'iconFormat': options.iconFormat
    };

    return request({
      'methodNamespace': 'App',
      'methodName': 'icons',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
  };

  this.bgimage = function bgimage(options, callback) {
    !options && (options = {});

    var params = {
      'query': options.query,
      'experienceId': options.experienceId || '',
      'typeHint': options.typeHint || '',
      'feature': options.feature || '',
      'exact': !!options.exact,
      'width': Math.round(options.width || 320),
      'height': Math.round(options.height || 460),
      'idx': options.index || '',
      'prevQuery': options.prevQuery || ''
    };

    return request({
      'methodNamespace': 'Search',
      'methodName': 'bgimage',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
  };

  this.getDisambiguations = function getDisambiguations(options, callback) {
    !options && (options = {});

    var params = {
      'query': options.query
    };

    return request({
      'methodNamespace': 'Search',
      'methodName': 'disambiguate',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
  };

  this.Shortcuts = new function Shortcuts() {
    this.get = function get(options, callback) {
    !options && (options = {});

    var params = {
      'queries': options.queries || []
    };

    return request({
      'methodNamespace': 'Shortcuts',
      'methodName': 'get',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
    };

    this.suggest = function suggest(options, callback) {
    !options && (options = {});

    var params = {
      'existing': JSON.stringify(options.existing || [])
    };

    return request({
      'methodNamespace': 'Shortcuts',
      'methodName': 'suggestions',
      'params': params,
      'callback': callback
    });
    };
  };

  this.Logger = new function Logger() {
    var self = this,
      methodArr = ['error', 'warn', 'info'];

    methodArr.forEach(function oggerMethodIteration(method) {
      self[method] = function report(options, callback) {
        options = addGlobals(options);
        options = addSavedParams(options);

        return request({
          'methodNamespace': 'Logger',
          'methodName': method,
          'params': options,
          'callback': callback
        });
      };
    });
  };

  this.report = function report(options, callback) {
    options = addGlobals(options);
    options = addSavedParams(options);

    return request({
      'methodNamespace': 'Stats',
      'methodName': 'report',
      'params': options,
      'callback': callback
    }, options._NOCACHE || false);
  };

  this.appNativeInfo = function appNativeInfo(options, callback) {
    // string together ids like so:
    // apiurl/?guids=["guid1","guid2","guid3", ...]

    var guids = options.guids || [];

    for (var i = 0; i < guids.length; i++) {
      if (!guids[i]) {
      guids.splice(i, 1);
      i--;
      }
    }

    var params = {
      'guids': JSON.stringify(guids)
    };

    return request({
      'methodNamespace': 'App',
      'methodName': 'nativeInfo',
      'params': params,
      'callback': callback
    }, options._NOCACHE || false);
  };

  function addGlobals(options) {
    var globals = options['globals'] || {};

    globals.deviceId = deviceId;
    try {
      options['globals'] = JSON.stringify(globals);
    } catch (ex) {
      delete options['globals'];
    }

    return options;
  }

  // add the saved params from earlier responses to the event's data
  function addSavedParams(options) {
    var events = options.data;
    if (events) {
      try {
        events = JSON.parse(events);
      } catch (ex) {
        events = null;
      }

      if (events && typeof events === 'object') {
        for (var i = 0, e; e = events[i++];) {
          var savedValue = savedParamsToPass[e.userEvent];
          if (savedValue) {
            e[PARAM_TO_PASS_BETWEEN_REQUESTS_NAME] = savedValue;
          }
        }

        options.data = JSON.stringify(events);
      }
    }
    return options;
  }

  // takes a method's response, and saves data
  // according to paramsToPassBetweenRequests
  function saveParamFromRequest(method, response) {
    var events = paramsToPassBetweenRequests[method],
      paramValue = response && response[PARAM_TO_PASS_BETWEEN_REQUESTS];

    if (!paramValue || !events) {
      return;
    }

    // this will create a map of userEvents => requestId
    // to be added to the actual event request later
    for (var i = 0, ev; ev = events[i++];) {
      savedParamsToPass[ev] = paramValue;
    }
  }

  this.setLocation = function setLocation(lat, lon) {
    userLat = lat;
    userLon = lon;

    Evme.EventHandler.trigger(NAME, 'setLocation', {
      'lat': lat,
      'lon': lon
    });
  };

  this.hasLocation = function hasLocation() {
    return (userLat && userLon);
  };

  this.request =
    function publicRequest(methodNamespace, methodName, params, callback) {
      return request({
        'methodNamespace': methodNamespace,
        'methodName': methodName,
        'params': params,
        'callback': callback
      }, params._NOCACHE);
    };


  this.initSession = function initSession(options, callback) {
    !options && (options = {});

    if (!options.cachedIcons) {
      var icons = Evme.IconManager.getKeys();
      if (icons) {
        icons = Evme.Utils.convertIconsToAPIFormat(icons);
        options.cachedIcons = icons;
      }
    }

    var params = {
      'id': (self.Session.get() || {}).id,
      'deviceId': deviceId,
      'cachedIcons': options.cachedIcons,
      'stats': {
        'userAgent': navigator.userAgent,
        'referrer': document.referrer,
        'connectionType': Evme.Utils.connection().type || '',
        'locale': navigator.language || '',
        'GMT': (new Date().getTimezoneOffset() / -60).toString(),
        'sessionInitCause': options.cause,
        'sessionInitSrc': options.source,
        'cookiesEnabled': Evme.Utils.bCookiesEnabled() || false,
        'localStorageEnabled': Evme.Utils.bLocalStorageEnabled()
      }
    };

    if (requestingSession) {
      return;
    }

    requestingSession = true;

    return request({
      'methodNamespace': 'Session',
      'methodName': 'init',
      'params': params,
      'callback': function onSessionInitSuccess(data, url) {
        requestingSession = false;

        if (data && data.response) {
          self.Session.update(data.response.ttl);

          // in case the API says it wrote a cookie,
          // but it doesn't match the user's
          if (data.response.credentials &&
                          data.response.credentials != self.Session.creds()) {
            // send the creds with each request
            manualCredentials = data.response.credentials;

            // save them in local storage
            Evme.Storage.set(STORAGE_KEY_CREDS, manualCredentials);
          }

          Evme.EventHandler.trigger('DoATAPI', 'sessionInit');
        }

        callback && callback(data, url);
      }
    });
  };

  function reInitSession(initCause) {
    if (sessionInitRequest) {
      return;
    }

    sessionInitRequest = self.initSession({
      'cause': initCause,
      'source': 'DoATAPI.reInitSession'
    }, function onInitSession() {
      for (var key in requestsQueue) {
        request(requestsQueue[key], false, true);
      }

      requestsQueue = {};
      sessionInitRequest = null;
    });
  }

  // the "requestsQueue" will empty after the session has been init'ed
  // the "key" prevents from adding multiple requests of the same "type"
  // so if someone open 2 folders, only the latest request will go out
  function addRequestToSessionQueue(requestOptions) {
    var key = requestOptions.methodNamespace + '.' + requestOptions.methodName;
    requestsQueue[key] = requestOptions;
  }

  this.getSessionId = function getSessionId() {
    return self.Session.get().id;
  };

  this.Session = new function Session() {
    var self = this,
      _key = 'session', _session = null,
      DEFAULT_TTL = -1;

    this.INIT_CAUSE = {
      'EXPIRED': 'session expired',
      'NO_CREDS': 'missing credentails',
      'ABSENT': 'session absent',
      'NOT_IN_CACHE': 'new session',
      'AUTH_ERROR': 'API authentication error',
      'CACHE_ERROR': 'cache error'
    };

    this.init = function init(callback) {
      Evme.Storage.get(_key, function storageGot(sessionFromCache) {
        var createCause;

        try {
          if (sessionFromCache) {
            if (!self.expired(sessionFromCache)) {
              _session = sessionFromCache;
            } else {
              createCause = self.INIT_CAUSE.EXPIRED;
            }
          } else {
            createCause = self.INIT_CAUSE.NOT_IN_CACHE;
          }

          if (!_session) {
            self.create(null, null, createCause);
          }
          callback && callback();
        } catch (ex) {
          console.error('evme Session init error: ' + ex.message);
          callback && callback();
        }
      });
    };

    this.shouldInit = function shouldInit() {
      var should = { 'should': false };

      if (!_session) {
        should = {
          'should': true,
          'cause': self.INIT_CAUSE.ABSENT
        };
      } else if (_session.ttl == DEFAULT_TTL) {
        should = {
          'should': true,
          'cause': _session.createCause
        };
      } else if (self.expired(_session)) {
        should = {
          'should': true,
          'cause': self.INIT_CAUSE.EXPIRED
        };
      } else if (!self.creds()) {
        should = {
          'should': true,
          'cause': self.INIT_CAUSE.NO_CREDS
        };
      }

      return should;
    };

    this.get = function get() {
      if (!_session) {
        self.create(null, null, self.INIT_CAUSE.NOT_IN_CACHE);
      }
      return _session;
    };

    this.create = function create(id, ttl, cause) {
      _session = {
        'id': id || self.generateId(),
        'ttl': ttl || DEFAULT_TTL,
        'createCause': cause
      };

      save();
    };

    this.update = function update(ttl) {
      if (!ttl) {
        return;
      }

      _session['ttl'] = ttl;
      save();
    };

    this.generateId = function generateId() {
      return Evme.Utils.uuid();
    };

    this.creds = function creds() {
      return Evme.Utils.Cookies.get(authCookieName) ||
                                                  manualCredentials || null;
    };

    this.expired = function expired(sessionToTest) {
      !sessionToTest && (sessionToTest = _session);

      var timeNow = (new Date()).getTime();
      var expiration = sessionToTest.timeWritten + sessionToTest.ttl * 1000;

      return (timeNow >= expiration);
    };

    function save() {
      _session['timeWritten'] = (new Date()).getTime();

      Evme.Storage.set(_key, _session);
    }
  };

  function addRequestToPerformOnline(request) {
    requestsToPerformOnOnline[request.getKey()] = request;
  }

  this.cancelQueue = function cancelQueue() {
    for (var key in requestsToPerformOnOnline) {
      requestsToPerformOnOnline[key].abort();
    }

    requestsToPerformOnOnline = {};
  };

  this.backOnline = function backOnline() {
    for (var key in requestsToPerformOnOnline) {
      requestsToPerformOnOnline[key].request();
    }

    requestsToPerformOnOnline = {};
  };

  this.setClientInfoLocale = function setClientInfoLocale(newLocale) {
    clientInfo.lc = newLocale || navigator.language || '';
  };
  this.setClientInfoTimeZone = function setClientInfoTimeZone(newTimeZone) {
    clientInfo.tz = newTimeZone ||
                              (new Date().getTimezoneOffset() / -60).toString();
  };
  this.setKeyboardLanguage = function setKeyboardLanguage(newKeyboardLanguage) {
    clientInfo.kb = newKeyboardLanguage || '';
  };

  // go over the clientInfo object and construct a param from it
  // clientInfo=key=value,key=value,...
  this.getClientInfo = function getClientInfo() {
    var value = [];
    for (var key in clientInfo) {
      value.push(key + '=' + clientInfo[key]);
    }
    value = value.join(',');

    return value;
  };

  function request(options, ignoreCache, dontRetryIfNoSession) {
    var methodNamespace = options.methodNamespace,
      methodName = options.methodName,
      params = options.params || {},
      callback = options.callback,
      noSession = options.noSession,

      useCache = requestsToCache[methodNamespace + '.' + methodName],
      cacheKey = '',

      shouldInit = Evme.DoATAPI.Session.shouldInit(),

      _request;


    // init the session (and THEN make the request)
    // if the session expired/non-existent
    if (shouldInit.should &&
        !doesntNeedSession[methodNamespace + '.' + methodName]) {

        addRequestToSessionQueue(options);
        reInitSession(shouldInit.cause);

        Evme.EventHandler.trigger(NAME, 'cantSendRequest', {
          'method': methodNamespace + '/' + methodName,
          'queue': requestsToPerformOnOnline
        });

        return false;
    }

    // the following params will be added to the cache key
    if (userLat && userLon && typeof params['latlon'] == 'undefined') {
      params['latlon'] = userLat + ',' + userLon;
    }
    params['clientInfo'] = self.getClientInfo();

    if (useCache) {
      cacheKey = getCacheKey(methodNamespace, methodName, params);

      if (!ignoreCache) {
        Evme.Storage.get(cacheKey, function storageGot(responseFromCache) {
          if (responseFromCache) {
            saveParamFromRequest(methodNamespace +
                                          '.' + methodName, responseFromCache);

            callback && window.setTimeout(function() {
              responseFromCache && (responseFromCache._cache = true);
              callback(responseFromCache);
            }, 10);
          } else {
            actualRequest();
          }
        });

        // since we're taking the response from the cache,
        // we can't return a request now however, we don't know if there will
        // be a value in the cache or not so we return an object that,
        // if a request is created later on, could abort it
        return {
          abort: function abort() {
          _request && _request.abort();
          }
        };
      }
    }

    function actualRequest() {
      // the following params WILL NOT BE ADDED TO THE CACHE KEY
      params['apiKey'] = apiKey;
      params['v'] = appVersion;
      params['native'] = true;
      params['platform.os'] = 'firefox-os';

      // report server about new cached icons
      if (methodNamespace === 'Search' && methodName === 'apps') {
        params['cachedIcons'] = self.CachedIcons.yank();
      }

      if (manualCredentials) {
        params['credentials'] = manualCredentials;
      }
      if (manualCampaignStats) {
        for (var k in manualCampaignStats) {
          params[k] = manualCampaignStats[k];
        }
      }
      if (!noSession) {
        params['sid'] = (self.Session.get() || {}).id || '';
      }

      params.stats = Evme.Utils.aug(params.stats, permanentStats);
      /* ---------------- */

      _request = new Evme.Request();
      _request.init({
        'methodNamespace': methodNamespace,
        'methodName': methodName,
        'params': params,
        'originalOptions': options,
        'callback': callback,
        'requestTimeout': MAX_REQUEST_TIME,
        'retries': NUMBER_OF_RETRIES,
        'retryCheck': shouldRetry,
        'timeoutBetweenRetries': RETRY_TIMEOUT,
        'request': cbRequest,
        'error': cbError,
        'success': cbSuccess,
        'clientError': cbClientError,
        'onAbort': cbRequestAbort,
        'cacheKey': cacheKey,
        'cacheTTL': (typeof useCache == 'number') ?
                                        useCache : CACHE_EXPIRATION_IN_MINUTES
      });

      if (requestsThatDontNeedConnection[methodNamespace + '.' + methodName]) {
        _request.request();
      } else {
        Evme.Utils.isOnline(function isOnlineCallback(isOnline) {
          if (isOnline) {
            _request.request();
          } else {
            addRequestToPerformOnline(_request);

            Evme.EventHandler.trigger(NAME, 'cantSendRequest', {
              'method': methodNamespace + '/' + methodName,
              'request': _request,
              'queue': requestsToPerformOnOnline
            });
          }
        });
      }

      return _request;
    }

    return actualRequest();
  }

  function shouldRetry(data) {
    // If the parameters sent are incorrect, retrying won't help
    return data.errorCode !== self.ERROR_CODES.INVALID_PARAMS;
  }

  function getCacheKey(methodNamespace, methodName, params) {
    var sOptions = cacheCleanUpParams(params);
    return (methodNamespace + '.' + methodName + '.' + sOptions).toLowerCase();
  }

  this.insertToCache = function insertToCache(cacheKey, data, cacheTTL) {
    if (!data || !data.response) { return false; }

    // don't cache images that aren't ready (~)
    if (cacheKey.indexOf('search.bgimage') !== -1) {
      if (data.response && data.response.image.data == '~') {
        return false;
      }
    }

    // don't cache errors
    if (data.errorCode != self.ERROR_CODES.SUCCESS) {
      return false;
    }

    // this causes data to be a copy of the original.
    // without this, any changes to the data object will affect the original
    // object (that's sent to the API callbacks)
    try {
      data = Evme.Utils.cloneObject(data);
    } catch (ex) {
      return false;
    }

    // clear the icons from the Apps response (to save space)
    // NOTE we don't remove an icon without a revision- cause that's an
    // external icon and is not cached on the server
    if (cacheKey.indexOf('search.apps') !== -1 &&
        data.response.apps &&
        data.response.apps.length) {
      for (var i = 0, l = data.response.apps.length; i < l; i++) {
        if (data.response.apps[i].revision) {
          data.response.apps[i].icon = null;
        }
      }
    }

    // IndexDB stores in seconds and the cacheTTL is in minutes,
    // so we multiply by 60 to conver it to seconds
    Evme.Storage.set(cacheKey, data, cacheTTL * 60);

    Evme.Storage.get('itemsCached', function storageGot(itemsCached) {
      itemsCached = itemsCached || [];
      if (itemsCached.length == 1 && itemsCached[0] == '') {
        itemsCached = [];
      }

      itemsCached.push(cacheKey);

      if (itemsCached.length > MAX_ITEMS_IN_CACHE) {
        var itemToRemove = itemsCached[0];
        itemsCached.splice(0, 1);

        Evme.Storage.remove(itemToRemove);
      }

      Evme.Storage.set('itemsCached', itemsCached, null);
    });

    return true;
  };

  this.removeFromCache = function removeFromCache(cacheKey) {
    Evme.Storage.remove(cacheKey);
  };

  function cacheCleanUpParams(params) {
    var retParams = [];
    for (var param in params) {
      if (paramsToCleanFromCacheKey.indexOf(param) == -1) {
        retParams.push(param + ':' + params[param]);
      }
    }
    retParams.sort();
    return retParams.join(',');
  }

  function getDeviceId(callback) {
    Evme.Storage.get('deviceId', function storageGot(deviceId) {
      if (!deviceId) {
        deviceId = generateDeviceId();
        Evme.Storage.set('deviceId', deviceId);
      }

      callback(deviceId);
    });
  }

  this.getDeviceId = function getDeviceId() {
    return deviceId;
  };

  function generateDeviceId() {
    var queryString = {};
    (location.search || '').replace(/(?:[?&]|^)([^=]+)=([^&]*)/g,
      function regexmatch(ig, k, v) {queryString[k] = v;});
    return queryString['did'] || 'fxos-' + Evme.Utils.uuid();
  }

  function cbRequest(methodNamespace, method,
                                            params, retryNumber, completeURL) {
    Evme.EventHandler.trigger(NAME, 'request', {
    'method': methodNamespace + '/' + method,
    'params': params,
    'retryNumber': retryNumber,
    'url': completeURL
    });
  }

  function cbRequestAbort(methodNamespace, method, params, retryNumber) {
    if (sessionInitRequest) {
      sessionInitRequest.abort();
      requestingSession = false;
      sessionInitRequest = null;
    }

    Evme.EventHandler.trigger(NAME, 'abort', {
      'method': methodNamespace + '/' + method,
      'params': params,
      'retryNumber': retryNumber
    });
  }

  function cbSuccess(methodNamespace, method, url, params, retryNumber,
                                                      data, requestDuration) {
    saveParamFromRequest(methodNamespace + '.' + method, data);

    Evme.EventHandler.trigger(NAME, 'success', {
      'method': methodNamespace + '/' + method,
      'params': params,
      'retryNumber': retryNumber,
      'url': url,
      'response': data,
      'requestDuration': requestDuration
    });
  }

  function cbClientError(methodNamespace, method, url, params, data, ex) {
    Evme.EventHandler.trigger(NAME, 'clientError', {
      'method': methodNamespace + '/' + method,
      'params': params,
      'url': url,
      'response': data,
      'exception': ex
    });
  }

  function cbError(methodNamespace, method, url, params, retryNumber, data,
                                                    callback, originalOptions) {
    Evme.EventHandler.trigger(NAME, 'error', {
    'method': methodNamespace + '/' + method,
    'params': params,
    'retryNumber': retryNumber,
    'url': url,
    'response': data,
    'callback': callback
    });

    // if it's an authentication error
    // return false so the request won't automatically retry
    // and do a sessionInit, and retry at the end of it
    if ((data &&
      data.errorCode == Evme.DoATAPI.ERROR_CODES.AUTH && !manualCredentials) ||
      (methodNamespace == 'Session' && method == 'init')) {
        Evme.Utils.log('Got authentication error from API,' +
                              ' add request to queue and re-init the session');
        addRequestToSessionQueue(originalOptions);
        reInitSession(Evme.DoATAPI.Session.INIT_CAUSE.AUTH_ERROR);
        return false;
    }

    return true;
  }
}

Evme.Request = function Evme_Request() {
  var self = this,
      methodNamespace = '',
      methodName = '',
      params = {},
      originalOptions = {},

      callback = null,

      retries = 0,
      retryNumber = 0,
      cbShouldRetry = null,
      requestRetry = null,
      timeoutBetweenRetries = 0,

      httpRequest = null,
      aborted = false,
      cacheKey = '',
      cacheTTL = 0,

      requestTimeout = null,
      maxRequestTime = 0,

      requestSentTime = 0,
      cbRequest = null,
      cbError = null,
      cbSuccess = null,
      cbClientError = null,
      cbAbort = null;


  this.init = function init(options) {
    methodNamespace = options.methodNamespace;
    methodName = options.methodName;
    params = options.params;
    originalOptions = options.originalOptions;
    callback = options.callback;
    maxRequestTime = options.requestTimeout;
    retries = options.retries;
    timeoutBetweenRetries = options.timeoutBetweenRetries;

    cbRequest = options.request;
    cbError = options.error;
    cbClientError = options.clientError;
    cbSuccess = options.success;
    cbShouldRetry = options.retryCheck;
    cbAbort = options.onAbort;

    cacheKey = options.cacheKey;
    cacheTTL = options.cacheTTL;

    if (!params['stats']) {
      params['stats'] = {};
    }

    return self;
  };

  this.getKey = function getKey() {
    return methodNamespace + '.' + methodName;
  };

  this.request = function request() {
    if (aborted) return false;

    requestSentTime = (new Date()).getTime();

    // stats params to add to all API calls
    params.stats.retryNum = retryNumber;
    params.stats.firstSession = Evme.Utils.isNewUser();

    httpRequest = Evme.api[methodNamespace][methodName](params, apiCallback);

    cbRequest(methodNamespace, methodName, params,
                                              retryNumber, httpRequest.url);
    httpRequest = httpRequest.request;

    requestTimeout = window.setTimeout(requestTimeoutCallback, maxRequestTime);

    return httpRequest;
  };

  this.abort = function abort() {
    if (aborted) {
      return;
    }

    aborted = true;
    clearTimeouts();

    if (httpRequest) {
      httpRequest.onreadystatechange = null;
      httpRequest.abort();
    }

    cbAbort(methodNamespace, methodName, params, retryNumber);
  };

  function clearTimeouts() {
    window.clearTimeout(requestRetry);
    window.clearTimeout(requestTimeout);
  }

  function apiCallback(data, url) {
    var isError = (data.errorCode != Evme.DoATAPI.ERROR_CODES.SUCCESS);

    clearTimeouts();

    if (isError && retryNumber < retries) {
      var bDontRetry = cbError(methodNamespace, methodName, url, params,
                                  retryNumber, data, callback, originalOptions);

      if (bDontRetry && cbShouldRetry(data)) {
        retry();
      }
    } else {
      if (!isError) {
        var requestDuration = (new Date().getTime()) - requestSentTime;
        cbSuccess(methodNamespace, methodName, url, params,
                                            retryNumber, data, requestDuration);
      }

      if (cacheKey) {
        Evme.DoATAPI.insertToCache(cacheKey, data, cacheTTL);
      }

      try {
        callback && callback(data, methodNamespace, methodName, url);
      } catch (ex) {
        cbClientError && cbClientError(methodNamespace, methodName,
                                                        url, params, data, ex);
      }
    }
  }

  function requestTimeoutCallback() {
    if (aborted || !httpRequest) {
      return;
    }

    httpRequest.onreadystatechange = null;
    httpRequest.abort();

    var data = {
      'errorCode': -100,
      'errorString': 'Request timed out on the Client Side (took more than ' +
                                                        maxRequestTime + 'ms)',
      'processingTime': maxRequestTime
    };

    cbError(methodNamespace, methodName, '', params, retryNumber, data,
                                                    callback, originalOptions);

    if (retryNumber < retries) {
      retry();
    }

  }

  function retry(data, url) {
    var isSessionInit = data && data.response && data.response.credentials;

    window.clearTimeout(requestRetry);

    var retryTimeout =
      Math.round(Math.random() *
        (timeoutBetweenRetries.to - timeoutBetweenRetries.from)) +
        timeoutBetweenRetries.from;

    // if retrying a session init error - don't wait once it's ready
    if (isSessionInit) {
      retryTimeout = 0;
    }

    requestRetry = window.setTimeout(function retryTimeout() {
      retryNumber++;
      self.request();
    }, retryTimeout);
  }
};
