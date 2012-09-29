Evme.DoATAPI = new function() {
    var _name = "DoATAPI", _this = this,
        requestRetry = null,
        cached = [];
    var deviceId = getDeviceId(),
        NUMBER_OF_RETRIES = 3,                          // number of retries before returning error
        RETRY_TIMEOUT = {"from": 1000, "to": 3000},     // timeout before retrying a failed request
        MAX_REQUEST_TIME = 10000,                       // timeout before declaring a request as failed (if server isn't responding)
        MAX_ITEMS_IN_CACHE = 20,                        // maximum number of calls to save in the user's cache
        CACHE_EXPIRATION_IN_MINUTES = 30,
        STORAGE_KEY_CREDS = "credentials",
        userLat = undefined,
        userLon = undefined,
        appVersion = undefined,
        testStats = undefined,
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
    
    this.init = function(options){
        apiKey = options.apiKey,
        appVersion = options.appVersion || "";
        authCookieName = options.authCookieName;
        manualCampaignStats = options.manualCampaignStats;
        
        manualCredentials = Evme.Storage.get(STORAGE_KEY_CREDS);
        
        setClientInfoCookie();
        
        _this.Session.init();
    };
      
    this.ERROR_CODES = {
        "SUCCESS": 1,
        "AUTH": -9,
        "INVALID_PARAMS": -14,
        "TIMEOUT": -19
    };
    
    this.search = function(_options, callback, noSession) {
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
    
    this.User = new function() {
        this.apps = function(_options, callback) {
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
        
        this.clearApps = function(callback) {
            return request({
                "methodNamespace": "User",
                "methodName": "clearApps",
                "params": {},
                "callback": callback
            });
        };
    };
    
    this.suggestions = function(_options, callback) {
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
    
    this.icons = function(_options, callback) {
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
    
    this.bgimage = function(_options, callback) {
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
    
    this.getDisambiguations = function(_options, callback) {
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
    
    this.Shortcuts = new function() {
        var _this = this,
            width = 110, height = 90, SHORTCUT_CACHE_VERSION = "1",
            cacheKeyGet = "";
        
        this.size = function() {
            return {
                "width": width,
                "height": height
            };
        };
        
        this.get = function(_options, callback) {
            !_options && (_options = {});
            
            var options = {
                "width": width,
                "height": height,
                "iconFormat": _options.iconFormat,
                "queries": _options.queries,
                "cacheVersion": SHORTCUT_CACHE_VERSION
            };
            
            !cacheKeyGet && (cacheKeyGet = getCacheKey("Shortcuts", "get", options));
            
            return request({
                "methodNamespace": "Shortcuts",
                "methodName": "get",
                "params": options,
                "callback": callback
            }, _options._NOCACHE);
        };
        
        this.set = function(_options, callback) {
            !_options && (_options = {});
        
            var options = {
                "shortcuts": _options.shortcuts || []
            };
            
            _this.cleanCache();
            
            return request({
                "methodNamespace": "Shortcuts",
                "methodName": "set",
                "params": options,
                "callback": callback
            }, _options._NOCACHE);
        };
        
        this.suggest = function(_options, callback) {
            !_options && (_options = {});
            
            var options = {
                "width": width,
                "height": height
            };
            
            return request({
                "methodNamespace": "Shortcuts",
                "methodName": "suggestions",
                "params": options,
                "callback": callback
            }, _options._NOCACHE);
        };
        
        this.image = function(_options, callback) {
            !_options && (_options = {});
            
            var options = {
                "query": _options.query,
                "feature": "csht",
                "exact": true,
                "width": width,
                "height": height
            };
            
            return request({
                "methodNamespace": "Search",
                "methodName": "bgimage",
                "params": options,
                "callback": callback
            }, _options._NOCACHE);
        }
        
        this.cleanCache = function() {
            Evme.DoATAPI.removeFromCache(cacheKeyGet);
        };
    }
    
    this.trending = function(_options, callback) {
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
    
    this.Logger = new function(){
        var _this = this,
            methodArr = ["error", "warn", "info"];
        
        methodArr.forEach(function(method){
            _this[method] = function(options, callback){
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
    
    this.report = function(_options, callback) {
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
    
    this.searchLocations = function(_options, callback) {
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
    
    this.setLocation = function(lat, lon, callback) {
        userLat = lat;
        userLon = lon;
        
        Evme.EventHandler.trigger(_name, "setLocation", {
            "lat": lat,
            "lon": lon
        });
    };
    
    this.hasLocation = function() {
        return (userLat && userLon);
    };
    
    _this.request = function(methodNamespace, methodName, params, callback) {
        return request({
            "methodNamespace": methodNamespace,
            "methodName": methodName,
            "params": params,
            "callback": callback
        }, params._NOCACHE);
    };
    
    
    this.initSession = function(_options, callback) {
        !_options && (_options = {});
        
        var options = {
            "id": _this.Session.get().id,
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
            "callback": function(data, url) {
                requestingSession = false;
                
                if (data && data.response) {
                    _this.Session.update(data.response.ttl);
                    
                    // in case the API says it wrote a cookie, but it doesn't match the user's
                    if (data.response.credentials && data.response.credentials != _this.Session.creds()) {
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
        
        sessionInitRequest = _this.initSession({
            "cause": initCause,
            "source": "DoATAPI.reInitSession"
        }, function(){
            for (var key in requestsQueue) {
                request(requestsQueue[key], false, true);
            }
            
            requestsQueue = {};
            sessionInitRequest = null;
        });
    }
    
    this.getSessionId = function() {
        return _this.Session.get().id;
    };
    
    this.Session = new function() {
        var _this = this, _key = "session", _session = null;
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
        
        this.init = function() {
            var sessionFromCache = Evme.Storage.get(_key),
                createCause;
                
            if (sessionFromCache) {
                try {
                    sessionFromCache = JSON.parse(sessionFromCache);
                    
                    if (!_this.expired(sessionFromCache)) {
                        _session = sessionFromCache;
                    } else {
                        createCause = _this.INIT_CAUSE.EXPIRED;
                    }
                } catch(ex) {
                    createCause = _this.INIT_CAUSE.CACHE_ERROR;
                }
            } else {
                createCause = _this.INIT_CAUSE.NOT_IN_CACHE;
            }
            
            if (!_session) {
                _this.create(null, null, createCause);
            }
        };
        
        this.shouldInit = function() {
            if (!_session) {
                return {
                    "should": true,
                    "cause": _this.INIT_CAUSE.ABSENT
                };
            }
            if (_session.ttl == DEFAULT_TTL) {
                return {
                    "should": true,
                    "cause": _session.createCause
                };
            }
            if (!_this.creds()) {
                return {
                    "should": true,
                    "cause": _this.INIT_CAUSE.NO_CREDS
                };
            }
            
            return { "should": false };
        };
        
        this.get = function() {
            return _session;
        };
        
        this.create = function(id, ttl, cause) {
            _session = {
                "id": id || _this.generateId(),
                "ttl": ttl || DEFAULT_TTL,
                "createCause": cause
            };
            
            save();
        };
        
        this.update = function(ttl) {
            if (!ttl) {
                return;
            }
            
            _session["ttl"] = ttl;
            save();
        };
        
        this.generateId = function() {
            return SESSION_PREFIX + Math.round(Math.random()*1234567890);
        };
        
        this.creds = function() {
            return Evme.Utils.Cookies.get(authCookieName) || manualCredentials || null;
        };
        
        this.expired = function(sessionToTest) {
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
    
    this.cancelQueue = function() {
        for (var i=0; i<requestsToPerformOnOnline.length; i++) {
            requestsToPerformOnOnline[i].abort();
        }
        
        requestsToPerformOnOnline = [];
    };
    
    this.backOnline = function() {
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
            return;
        }
        
        // add the lat,lon to the cache key (DUH)
        if (userLat && userLon && typeof params["latlon"] == "undefined") {
            params["latlon"] = userLat + "," + userLon;
        }
        
        var cacheKey = "";
        if (useCache) {
            cacheKey = getCacheKey(methodNamespace, methodName, params);
            
            if (!ignoreCache) {
                var fromCache = getFromCache(cacheKey);
                if (fromCache) {
                    callback && callback(fromCache);
                    return;
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
            params["sid"] = _this.Session.get().id;
        }
        if (!params.stats) {
            params.stats = {};
        }
        var tests = getTestsReporting();
        if (tests) {
            for (var test in tests) {
                params.stats["test_" + test] = tests[test];
            }
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
            Evme.Utils.isOnline(function(isOnline){
                if (isOnline) {
                    _request.request();
                } else {
                    requestsToPerformOnOnline.push(_request);
                    
                    Evme.EventHandler.trigger(_name, "cantSendRequest", {
                        "request": request,
                        "queue": requestsToPerformOnOnline
                    });
                }
            });
        }
        
        return _request;
    }
    
    function getTestsReporting() {
        if (testStats != undefined) {
            return testStats;
        }
        
        var tests = (typeof Tests !== "undefined")? Tests.getAll() : [];
        
        testStats = {};
        for (var i=0; i<tests.length; i++) {
            testStats[tests[i].testName] = tests[i].testGroup;
        }
        
        return testStats;
    }
    
    function shouldRetry(data) {
        // If the parameters sent are incorrect, retrying won't help
        return data.errorCode !== _this.ERROR_CODES.INVALID_PARAMS;
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
    
    this.insertToCache = function(cacheKey, data, cacheTTL) {
        if (!data || !data.response) { return false; }
        
        // don't cache images that aren't ready (~)
        if (cacheKey.indexOf("search.bgimage") !== -1) {
            if (data.response && data.response.image.data == "~") {
                return false;
            }
        }
        
        // don't cache errors
        if (data.errorCode != _this.ERROR_CODES.SUCCESS) {
            return false;
        }
        
        // this causes data to be a copy of the original.
        // without this, any changes to the data object will affect the original object (that's sent to the API callbacks)
        try {
            data = JSON.parse(JSON.stringify(data));
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
    
    this.removeFromCache = function(cacheKey) {
        Evme.Storage.remove(cacheKey);
    };
    
    function updateCacheItems() {
        
    }
    
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
    
    this.getDeviceId = function(){
        return deviceId;
    };
    
    function generateDeviceId() {
        var queryString = {};
        (location.search || '').replace(/(?:[?&]|^)([^=]+)=([^&]*)/g, function(ig, k, v) {queryString[k] = v;})
        return queryString["did"] || "web_" + (new Date()).getTime() + "" + Math.round(Math.random()*1234567890);
    }

    function cbRequest(methodNamespace, method, params, retryNumber) {
        Evme.EventHandler.trigger(_name, "request", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber
        });
    }
    
    function cbSuccess(methodNamespace, method, url, params, retryNumber, data, requestDuration) {
        Evme.EventHandler.trigger(_name, "success", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber,
            "url": url,
            "response": data,
            "requestDuration": requestDuration
        });
    }
    
    function cbClientError(methodNamespace, method, url, params, data, ex) {
        Evme.EventHandler.trigger(_name, "clientError", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "url": url,
            "response": data,
            "exception": ex
        });
    }
    
    function cbError(methodNamespace, method, url, params, retryNumber, data, callback, retryCallback) {
        Evme.EventHandler.trigger(_name, "error", {
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
            _this.initSession({
                "cause": Evme.DoATAPI.Session.INIT_CAUSE.AUTH_ERROR,
                "source": "DoATAPI.cbError"
            }, retryCallback);
            return false;
        }
        
        return true;
    }
};

Evme.Request = function() {
    var _this = this,
        
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
        
        
    this.init = function(options) {
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
        
        return this;
    };
    
    this.request = function() {
        if (aborted) return;
        
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
    
    this.abort = function() {
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
        
        requestRetry = window.setTimeout(function(){
            retryNumber++;
            _this.request();
        }, retryTimeout);
    }
};