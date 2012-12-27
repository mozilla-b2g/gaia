Evme.DoATAPI = new function Evme_DoATAPI() {
    var NAME = "DoATAPI", self = this,
        requestRetry = null,
        cached = [],
        
        apiKey = '',
        deviceId = getDeviceId(),
        NUMBER_OF_RETRIES = 3,                          // number of retries before returning error
        RETRY_TIMEOUT = {"from": 1000, "to": 3000},     // timeout before retrying a failed request
        MAX_REQUEST_TIME = 10000,                       // timeout before declaring a request as failed (if server isn't responding)
        MAX_ITEMS_IN_CACHE = 20,                        // maximum number of calls to save in the user's cache
        CACHE_EXPIRATION_IN_MINUTES = 30,
        STORAGE_KEY_CREDS = "credentials",
        authCookieName = '',
        userLat = undefined,
        userLon = undefined,
        appVersion = undefined,
        manualCredentials = null,
        manualCampaignStats = null,
        requestingSession = false,
        
        requestsQueue = {},
        requestsToPerformOnOnline = [],
        sessionInitRequest = null;
        
    var requestsToCache = {
            "Search.apps": true,
            "Search.bgimage": true,
            "Shortcuts.get": 60*24*2,
            "Search.trending": true
        },
        requestsThatDontNeedConnection = {
            "Search.suggestions": true,
            "App.icons": true
        },
        paramsToCleanFromCacheKey = ["cachedIcons", "idx", "feature", "sid", "credentials"],
        doesntNeedSession = {
            "Session.init": true,
            "Search.trending": true
        };
      
    this.ERROR_CODES = {
        "SUCCESS": 1,
        "AUTH": -9,
        "INVALID_PARAMS": -14,
        "TIMEOUT": -19
    };
    
    this.init = function init(options){
        apiKey = options.apiKey,
        appVersion = options.appVersion || "";
        authCookieName = options.authCookieName;
        manualCampaignStats = options.manualCampaignStats;
        
        manualCredentials = Evme.Storage.get(STORAGE_KEY_CREDS);
        
        setClientInfoCookie();
        
        self.Session.init();
    };
    
    this.search = function search(_options, callback, noSession) {
        !_options && (_options = {});
        
        var options = {
            "query": _options.query,
            "typeHint": _options.typeHint,
            "feature": _options.feature,
            "cachedIcons": _options.cachedIcons,
            "exact": _options.exact,
            "spellcheck": _options.spellcheck,
            "suggest": _options.suggest,
            "first": _options.first,
            "limit": _options.limit,
            "idx": _options.index,
            "iconFormat": _options.iconFormat,
            "prevQuery": (_options.first == 0)? _options.prevQuery || "" : ""
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "apps",
            "params": options,
            "callback": callback,
            "noSession": noSession
        }, _options._NOCACHE);
    };
    
    this.User = new function User() {
        this.apps = function apps(_options, callback) {
            !_options && (_options = {});
            
            var options = {
                "cachedIcons": _options.cachedIcons,
                "first": _options.first,
                "limit": _options.limit,
                "iconFormat": _options.iconFormat,
            };
            
            return request({
                "methodNamespace": "User",
                "methodName": "apps",
                "params": options,
                "callback": callback
            });
        };
        
        this.clearApps = function clearApps(callback) {
            return request({
                "methodNamespace": "User",
                "methodName": "clearApps",
                "params": {},
                "callback": callback
            });
        };
    };
    
    this.suggestions = function suggestions(_options, callback) {
        !_options && (_options = {});
    
        var options = {
            "query": _options.query
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "suggestions",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    this.icons = function icons(_options, callback) {
        !_options && (_options = {});
        
        var options = {
            "ids": _options.ids,
            "iconFormat": _options.iconFormat
        };
        
        return request({
            "methodNamespace": "App",
            "methodName": "icons",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    this.bgimage = function bgimage(_options, callback) {
        !_options && (_options = {});

        var options = {
            "query": _options.query,
            "typeHint": _options.typeHint,
            "feature": _options.feature,
            "exact": _options.exact,
            "width": _options.width,
            "height": _options.height,
            "idx": _options.index,
            "prevQuery": _options.prevQuery || ""
        };

        return request({
            "methodNamespace": "Search",
            "methodName": "bgimage",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    this.getDisambiguations = function getDisambiguations(_options, callback) {
        !_options && (_options = {});

        var options = {
            "query": _options.query
        };

        return request({
            "methodNamespace": "Search",
            "methodName": "disambiguate",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    this.Shortcuts = new function Shortcuts() {
        var self = this,
            STORAGE_KEY_SHORTCUTS = "localShortcuts",
            STORAGE_KEY_ICONS = "localShortcutsIcons",
            queriesToAppIds = {};
        
        this.get = function get(_options, callback) {
            var shortcuts = Evme.Storage.get(STORAGE_KEY_SHORTCUTS),
                icons = Evme.Storage.get(STORAGE_KEY_ICONS);
                
            if (!shortcuts) {
                shortcuts = Evme.__config["_" + STORAGE_KEY_SHORTCUTS];
                icons = Evme.__config["_" + STORAGE_KEY_ICONS];
            }
            
            saveAppIds(shortcuts);
            
            callback && callback(createResponse(shortcuts, icons));
        };
        
        this.set = function set(_options, callback) {
            !_options && (_options = {});
            
            var shortcuts = _options.shortcuts || [],
                icons = _options.icons || {};
            
            for (var i=0; i<shortcuts.length; i++) {
                if (typeof shortcuts[i] == "string") {
                    var query = shortcuts[i];
                    shortcuts[i] = {
                        "query": query,
                        "appIds": queriesToAppIds[query.toLowerCase()] || []
                    };
                }
            }
            
            Evme.Storage.set(STORAGE_KEY_SHORTCUTS, shortcuts);
            Evme.Storage.set(STORAGE_KEY_ICONS, icons);
            
            callback && callback();
        };
        
        this.add = function add(_options, callback) {
            var shortcuts = (Array.isArray(_options.shortcuts))? _options.shortcuts : [_options.shortcuts],
                icons = _options.icons;

            self.get(null, function onGetSuccess(data) {
                var currentShortcuts = data.response.shortcuts,
                    currentIcons = data.response.icons;
                
                for (var i=0; i<shortcuts.length; i++) {
                    if (currentShortcuts.indexOf(shortcuts[i]) == -1) {
                        currentShortcuts.push(shortcuts[i]);
                    }
                }
                    
                for (var appId in icons) {
                    currentIcons[appId] = icons[appId];
                }
                
                self.set({
                    "shortcuts": currentShortcuts,
                    "icons": currentIcons
                }, callback);
            });
            
        }
        
        this.remove = function remove(shortcutToRemove) {
            shortcutToRemove = shortcutToRemove.toLowerCase();
            
            self.get({}, function onGetSuccess(data){
                var shortcuts = data.response.shortcuts,
                    icons = data.response.icons,
                    allAppIds = {};
                    
                for (var i=0,shortcut=shortcuts[i]; shortcut; shortcut=shortcuts[++i]) {
                    var needToRemoveIcons = false;
                    
                    if (shortcut.query.toLowerCase() === shortcutToRemove) {
                        shortcuts.splice(i, 1);
                        needToRemoveIcons = true;
                    }
                    
                    for (var j=0; j<shortcut.appIds.length; j++) {
                        if (!allAppIds[shortcut.appIds[j].id]) {
                            allAppIds[shortcut.appIds[j].id] = {
                                "num": 0,
                                "needToRemove": needToRemoveIcons
                            };
                        }
                        allAppIds[shortcut.appIds[j].id].num++;
                    }   
                }
                
                // after the shortcut itself was removed,
                // we check if its icons are associated with other shortcuts
                for (var appId in allAppIds) {
                    if (allAppIds[appId].needToRemove && allAppIds[appId].num < 2) {
                        delete icons[appId];
                    }
                }
                
                self.set({
                    "shortcuts": shortcuts,
                    "icons": icons
                });
            });
        };
        
        this.suggest = function suggest(_options, callback) {
            !_options && (_options = {});
            
            var options = {
                "existing": JSON.stringify(_options.existing || [])
            };
            
            return request({
                "methodNamespace": "Shortcuts",
                "methodName": "suggestions",
                "params": options,
                "callback": function onRequestSuccess(data) {
                    saveAppIds(data.response.shortcuts);
                    callback && callback(data);
                }
            }, _options._NOCACHE);
        };
        
        function saveAppIds(shortcuts) {
            for (var i=0; i<shortcuts.length; i++) {
                queriesToAppIds[shortcuts[i].query.toLowerCase()] = shortcuts[i].appIds;
            }
        }
        
        function createResponse(shortcuts, icons) {
            return {
                "response": {
                    "shortcuts": Evme.Utils.cloneObject(shortcuts),
                    "icons": icons
                }
            };
        }
    };
    
    this.trending = function trending(_options, callback) {
        !_options && (_options = {});
        
        var options = {
            "first": _options.first,
            "limit": _options.limit,
            "returnImage": _options.returnImage,
            "iconFormat": _options.iconFormat,
            "quality": _options.quality,
            "queries": _options.queries
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "trending",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    }
    
    this.Logger = new function Logger(){
        var self = this,
            methodArr = ["error", "warn", "info"];
        
        methodArr.forEach(function oggerMethodIteration(method){
            self[method] = function report(options, callback){
                options = addGlobals(options);
                
                return request({
                    "methodNamespace": "Logger",
                    "methodName": method,
                    "params": options,
                    "callback": callback
                });
            }
        });
    };
    
    this.report = function report(_options, callback) {
        _options = addGlobals(_options);
        
        return request({
            "methodNamespace": "Stats",
            "methodName": "report",
            "params": _options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    function addGlobals(options) {
        var globals = options["globals"] || {};
        
        globals.deviceId = deviceId;
        try {
            options["globals"] = JSON.stringify(globals);
        } catch(ex) {
            delete options["globals"];
        }
        
        return options;
    }
    
    this.searchLocations = function searchLocations(_options, callback) {
        !_options && (_options = {});
        
        var options = {
            "query": _options.query,
            "latlon": undefined
        };
        
        return request({
            "methodNamespace": "Location",
            "methodName": "search",
            "params": options,
            "callback": callback
        }, _options._NOCACHE);
    };
    
    this.setLocation = function setLocation(lat, lon, callback) {
        userLat = lat;
        userLon = lon;
        
        Evme.EventHandler.trigger(NAME, "setLocation", {
            "lat": lat,
            "lon": lon
        });
    };
    
    this.hasLocation = function hasLocation() {
        return (userLat && userLon);
    };
    
    this.request = function request(methodNamespace, methodName, params, callback) {
        return request({
            "methodNamespace": methodNamespace,
            "methodName": methodName,
            "params": params,
            "callback": callback
        }, params._NOCACHE);
    };
    
    
    this.initSession = function initSession(_options, callback) {
        !_options && (_options = {});
        
        var options = {
            "id": self.Session.get().id,
            "deviceId": deviceId,
            "cachedIcons": _options.cachedIcons,
            "stats": {
                "userAgent": navigator.userAgent,
                "referrer": document.referrer,
                "connectionType": Evme.Utils.connection().type || "",
                "locale": navigator.language || "",
                "GMT": (new Date().getTimezoneOffset()/-60).toString(),
                "sessionInitCause": _options.cause,
                "sessionInitSrc": _options.source,
                "cookiesEnabled": Evme.Utils.bCookiesEnabled() || false,
                "localStorageEnabled": Evme.Utils.bLocalStorageEnabled()
            }
        };
        
        if (requestingSession) {
            return;
        }
        
        requestingSession = true;
        
        return request({
            "methodNamespace": "Session",
            "methodName": "init",
            "params": options,
            "callback": function onSessionInitSuccess(data, url) {
                requestingSession = false;
                
                if (data && data.response) {
                    self.Session.update(data.response.ttl);
                    
                    // in case the API says it wrote a cookie, but it doesn't match the user's
                    if (data.response.credentials && data.response.credentials != self.Session.creds()) {
                        // send the creds with each request
                        manualCredentials = data.response.credentials;
                        
                        // save them in local storage
                        Evme.Storage.set(STORAGE_KEY_CREDS, manualCredentials);
                    }
                    
                    Evme.EventHandler.trigger("DoATAPI", "sessionInit");
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
            "cause": initCause,
            "source": "DoATAPI.reInitSession"
        }, function onInitSession(){
            for (var key in requestsQueue) {
                request(requestsQueue[key], false, true);
            }
            
            requestsQueue = {};
            sessionInitRequest = null;
        });
    }
    
    this.getSessionId = function getSessionId() {
        return self.Session.get().id;
    };
    
    this.Session = new function Session() {
        var self = this, _key = "session", _session = null;
        var SESSION_PREFIX = "id",
            DEFAULT_TTL = -1;
            
        this.INIT_CAUSE = {
            "EXPIRED": "session expired",
            "NO_CREDS": "missing credentails",
            "ABSENT": "session absent",
            "NOT_IN_CACHE": "new session",
            "AUTH_ERROR": "API authentication error",
            "CACHE_ERROR": "cache error"
        };
        
        this.init = function init() {
            var sessionFromCache = Evme.Storage.get(_key),
                createCause;
                
            if (sessionFromCache) {
                try {
                    sessionFromCache = JSON.parse(sessionFromCache);
                    
                    if (!self.expired(sessionFromCache)) {
                        _session = sessionFromCache;
                    } else {
                        createCause = self.INIT_CAUSE.EXPIRED;
                    }
                } catch(ex) {
                    createCause = self.INIT_CAUSE.CACHE_ERROR;
                }
            } else {
                createCause = self.INIT_CAUSE.NOT_IN_CACHE;
            }
            
            if (!_session) {
                self.create(null, null, createCause);
            }
        };
        
        this.shouldInit = function shouldInit() {
            if (!_session) {
                return {
                    "should": true,
                    "cause": self.INIT_CAUSE.ABSENT
                };
            }
            if (_session.ttl == DEFAULT_TTL) {
                return {
                    "should": true,
                    "cause": _session.createCause
                };
            }
            if (!self.creds()) {
                return {
                    "should": true,
                    "cause": self.INIT_CAUSE.NO_CREDS
                };
            }
            
            return { "should": false };
        };
        
        this.get = function get() {
            return _session;
        };
        
        this.create = function create(id, ttl, cause) {
            _session = {
                "id": id || self.generateId(),
                "ttl": ttl || DEFAULT_TTL,
                "createCause": cause
            };
            
            save();
        };
        
        this.update = function update(ttl) {
            if (!ttl) {
                return;
            }
            
            _session["ttl"] = ttl;
            save();
        };
        
        this.generateId = function generateId() {
            return SESSION_PREFIX + Math.round(Math.random()*1234567890);
        };
        
        this.creds = function creds() {
            return Evme.Utils.Cookies.get(authCookieName) || manualCredentials || null;
        };
        
        this.expired = function expired(sessionToTest) {
            !sessionToTest && (sessionToTest = _session);
            
            var timeNow = (new Date()).getTime();
            var expiration = sessionToTest.timeWritten + sessionToTest.ttl*1000;
            
            return (timeNow >= expiration);
        };
        
        function save() {
            _session["timeWritten"] = (new Date()).getTime();
            
            Evme.Storage.add(_key, JSON.stringify(_session));
        }
    };
    
    this.cancelQueue = function cancelQueue() {
        for (var i=0; i<requestsToPerformOnOnline.length; i++) {
            requestsToPerformOnOnline[i].abort();
        }
        
        requestsToPerformOnOnline = [];
    };
    
    this.backOnline = function backOnline() {
        if (requestsToPerformOnOnline.length == 0) return;
        
        for (var i=0; i<requestsToPerformOnOnline.length; i++) {
            requestsToPerformOnOnline[i].request();
        }
        
        requestsToPerformOnOnline = [];
    };
    
    // set locale and timezone cookies
    function setClientInfoCookie() {
        var locale = navigator.language || "",
            timezone = (new Date().getTimezoneOffset()/-60).toString();
            
        var val = [
            "lc="+encodeURIComponent(locale),
            "tz="+encodeURIComponent(timezone)
        ];
        
        // to backend's request
        val = val.join(",");
 
        Evme.Utils.Cookies.set("clientInfo", val, null, ".everything.me");  
    }
    
    function request(options, ignoreCache, dontRetryIfNoSession) {
        var methodNamespace = options.methodNamespace,
            methodName = options.methodName,
            params = options.params || {},
            callback = options.callback,
            noSession = options.noSession;
        
        var useCache = requestsToCache[methodNamespace+"."+methodName];
        
        var shouldInit = Evme.DoATAPI.Session.shouldInit();
        if (requestsToPerformOnOnline.length != 0 && shouldInit.should && !doesntNeedSession[methodNamespace+"." + methodName] && !manualCredentials && !dontRetryIfNoSession) {
            requestsQueue[JSON.stringify(options)] = options;
            reInitSession(shouldInit.cause);
            return false;
        }
        
        // add the lat,lon to the cache key (DUH)
        if (userLat && userLon && typeof params["latlon"] == "undefined") {
            params["latlon"] = userLat + "," + userLon;
        }
        
        ignoreCache = true;
        
        var cacheKey = "";
        if (useCache) {
            cacheKey = getCacheKey(methodNamespace, methodName, params);
            
            if (!ignoreCache) {
                var fromCache = getFromCache(cacheKey);
                if (fromCache) {
                    callback && callback(fromCache);
                    return false;
                }
            }
        }
        
        // the following params WILL NOT BE ADDED TO THE CACHE KEY
        params["apiKey"] = apiKey;
        params["v"] = appVersion;
        if (manualCredentials) {
            params["credentials"] = manualCredentials;
        }
        if (manualCampaignStats) {
            for (var k in manualCampaignStats){
                params[k] = manualCampaignStats[k];
            }
        }
        if (!noSession) {
            params["sid"] = self.Session.get().id;
        }
        if (!params.stats) {
            params.stats = {};
        }
        /* ---------------- */
       
        var _request = new Evme.Request();
        _request.init({
            "methodNamespace": methodNamespace,
            "methodName": methodName,
            "params": params,
            "callback": callback,
            "requestTimeout": MAX_REQUEST_TIME,
            "retries": NUMBER_OF_RETRIES,
            "retryCheck": shouldRetry,
            "timeoutBetweenRetries": RETRY_TIMEOUT,
            "request": cbRequest,
            "error": cbError,
            "success": cbSuccess,
            "clientError": cbClientError,
            "cacheKey": cacheKey,
            "cacheTTL": (typeof useCache == "number")? useCache : CACHE_EXPIRATION_IN_MINUTES
        });
        
        if (requestsThatDontNeedConnection[methodNamespace+"."+methodName]) {
            _request.request();
        } else {
            Evme.Utils.isOnline(function isOnlineCallback(isOnline){
                if (isOnline) {
                    _request.request();
                } else {
                    requestsToPerformOnOnline.push(_request);
                    
                    Evme.EventHandler.trigger(NAME, "cantSendRequest", {
                        "request": request,
                        "queue": requestsToPerformOnOnline
                    });
                }
            });
        }
        
        return _request;
    }
    
    function shouldRetry(data) {
        // If the parameters sent are incorrect, retrying won't help
        return data.errorCode !== self.ERROR_CODES.INVALID_PARAMS;
    }
    
    function getCacheKey(methodNamespace, methodName, params) {
        var sOptions = cacheCleanUpParams(params);
        return (methodNamespace + "." + methodName + "." + sOptions).toLowerCase();
    }
    
    function getFromCache(cacheKey) {
        var cached = Evme.Storage.get(cacheKey);
        if (cached) {
            try {
                cached = JSON.parse(cached);
            } catch(ex) {
                cached = null;
            }
        }
        
        return cached;
    }
    
    this.insertToCache = function insertToCache(cacheKey, data, cacheTTL) {
        if (!data || !data.response) { return false; }
        
        // don't cache images that aren't ready (~)
        if (cacheKey.indexOf("search.bgimage") !== -1) {
            if (data.response && data.response.image.data == "~") {
                return false;
            }
        }
        
        // don't cache errors
        if (data.errorCode != self.ERROR_CODES.SUCCESS) {
            return false;
        }
        
        // this causes data to be a copy of the original.
        // without this, any changes to the data object will affect the original object (that's sent to the API callbacks)
        try {
            data = Evme.Utils.cloneObject(data);
        } catch(ex) {
            return false;
        }
        
        // clear the icons from the Apps response (to save space)
        // NOTE we don't remove an icon without a revision- cause that's an external icon and is not cached on the server
        if (cacheKey.indexOf("search.apps") !== -1 && data.response.apps && data.response.apps.length) {
            for (var i=0, l=data.response.apps.length; i<l; i++) {
                if (data.response.apps[i].revision) {
                    data.response.apps[i].icon = null;
                }
            }
        }
        
        Evme.Storage.add(cacheKey, JSON.stringify(data), cacheTTL*60);
        
        var itemsCached = itemsCached? (Evme.Storage.get(itemsCached) || "").split("]][[") : [];
        if (itemsCached.length == 1 && itemsCached[0] == "") {
            itemsCached = [];
        }
        
        itemsCached.push(cacheKey);
        if (itemsCached.length > MAX_ITEMS_IN_CACHE) {
            var itemToRemove = itemsCached[0];
            itemsCached.splice(0, 1);
            Evme.Storage.remove(itemToRemove);
        }
        
        Evme.Storage.add("itemsCached", itemsCached.join("]][["));
        
        return true;
    };
    
    this.removeFromCache = function removeFromCache(cacheKey) {
        Evme.Storage.remove(cacheKey);
    };
    
    function cacheCleanUpParams(params) {
        var retParams = [];
        for (var param in params) {
            if (paramsToCleanFromCacheKey.indexOf(param) == -1) {
                retParams.push(param + ":" + params[param]);
            };
        }
        retParams.sort();
        return retParams.join(",");
    }
    
    function getDeviceId() {
        var _deviceId = Evme.Storage.get("deviceId");
        
        if (!_deviceId) {
            _deviceId = generateDeviceId();
            Evme.Storage.add("deviceId", _deviceId);
        }
        
        return _deviceId;
    }
    
    this.getDeviceId = function getDeviceId(){
        return deviceId;
    };
    
    function generateDeviceId() {
        var queryString = {};
        (location.search || '').replace(/(?:[?&]|^)([^=]+)=([^&]*)/g, function regexmatch(ig, k, v) {queryString[k] = v;})
        return queryString["did"] || "web_" + (new Date()).getTime() + "" + Math.round(Math.random()*1234567890);
    }

    function cbRequest(methodNamespace, method, params, retryNumber) {
        Evme.EventHandler.trigger(NAME, "request", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber
        });
    }
    
    function cbSuccess(methodNamespace, method, url, params, retryNumber, data, requestDuration) {
        Evme.EventHandler.trigger(NAME, "success", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber,
            "url": url,
            "response": data,
            "requestDuration": requestDuration
        });
    }
    
    function cbClientError(methodNamespace, method, url, params, data, ex) {
        Evme.EventHandler.trigger(NAME, "clientError", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "url": url,
            "response": data,
            "exception": ex
        });
    }
    
    function cbError(methodNamespace, method, url, params, retryNumber, data, callback, retryCallback) {
        Evme.EventHandler.trigger(NAME, "error", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber,
            "url": url,
            "response": data,
            "callback": callback
        });
        
        // if it's an authentication error
        // return false so the request won't automatically retry
        // and do a sessionInit, and retry at the end of it
        if ((data && data.errorCode == Evme.DoATAPI.ERROR_CODES.AUTH && !manualCredentials) || (methodNamespace == "Session" && method == "init")) {
            self.initSession({
                "cause": Evme.DoATAPI.Session.INIT_CAUSE.AUTH_ERROR,
                "source": "DoATAPI.cbError"
            }, retryCallback);
            return false;
        }
        
        return true;
    }
};

Evme.Request = function Evme_Request() {
    var self = this,
        
        methodNamespace = "",
        methodName = "",
        params = {},
        
        callback = null,
        
        retries = 0,
        retryNumber = 0,
        cbShouldRetry = null,
        requestRetry = null,
        timeoutBetweenRetries = 0,
        
        request = null,
        aborted = false,
        cacheKey = "",
        cacheTTL = 0,
        
        requestTimeout = null,
        maxRequestTime = 0,
        
        requestSentTime = 0,
        cbRequest = null,
        cbError = null,
        cbSuccess = null,
        cbClientError = null;
        
        
    this.init = function init(options) {
        methodNamespace = options.methodNamespace;
        methodName = options.methodName;
        params = options.params;
        callback = options.callback;
        maxRequestTime = options.requestTimeout;
        retries = options.retries;
        timeoutBetweenRetries = options.timeoutBetweenRetries;
        
        cbRequest = options.request;
        cbError = options.error;
        cbClientError = options.clientError;
        cbSuccess = options.success;
        cbShouldRetry = options.retryCheck;
        
        cacheKey = options.cacheKey;
        cacheTTL = options.cacheTTL;
        
        return self;
    };
    
    this.request = function request() {
        if (aborted) return false;
        
        requestSentTime = (new Date()).getTime();
        
        cbRequest(methodNamespace, methodName, params, retryNumber);
        
        // stats params to add to all API calls
        (!params["stats"]) && (params["stats"] = {});
        params.stats.retryNum = retryNumber;
        params.stats.firstSession = Evme.Utils.isNewUser();
        
        params.stats = JSON.stringify(params.stats);
        
        request = Evme.api[methodNamespace][methodName](params, apiCallback);
        
        requestTimeout = window.setTimeout(requestTimeoutCallback, maxRequestTime);
        
        return request;
    };
    
    this.abort = function abort() {
        aborted = true;
        clearTimeouts();
        request && request.abort();
    };
    
    function clearTimeouts() {
        window.clearTimeout(requestRetry);
        window.clearTimeout(requestTimeout);
    }
    
    function apiCallback(data, url) {
        var isError = (data.errorCode != Evme.DoATAPI.ERROR_CODES.SUCCESS);
        
        clearTimeouts();
        
        if (isError && retryNumber < retries) {
            var bDontRetry = cbError(methodNamespace, methodName, url, params, retryNumber, data, callback, retry);
            
            if (bDontRetry && cbShouldRetry(data)) {
                retry();
            }
        } else {
            if (!isError) {
                var requestDuration = (new Date().getTime()) - requestSentTime;
                cbSuccess(methodNamespace, methodName, url, params, retryNumber, data, requestDuration);
            }
            
            if (cacheKey) {
                Evme.DoATAPI.insertToCache(cacheKey, data, cacheTTL);
            }
            
            try {
                callback && callback(data, methodNamespace, methodName, url);
            } catch(ex) {
                cbClientError && cbClientError(methodNamespace, methodName, url, params, data, ex);
            }
        }
    }
    
    function requestTimeoutCallback() {
        if (!request) {
            return;
        }
        
        request.abort();
        
        var data = {
            "errorCode": -100,
            "errorString": "Request timed out on the Client Side (took more than " + maxRequestTime + "ms)",
            "processingTime": maxRequestTime
        };
        
        cbError(methodNamespace, methodName, "", params, retryNumber, data, callback);
        
        if (retryNumber >= 0) {
            retry();
        }
        
    }
    
    function retry(){
        window.clearTimeout(requestRetry);
        
        var retryTimeout = Math.round(Math.random()*(timeoutBetweenRetries.to - timeoutBetweenRetries.from)) + timeoutBetweenRetries.from;
        
        requestRetry = window.setTimeout(function retryTimeout(){
            retryNumber++;
            self.request();
        }, retryTimeout);
    }
};