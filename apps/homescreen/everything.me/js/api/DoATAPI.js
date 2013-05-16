Evme.DoATAPI = new function Evme_DoATAPI() {
    var NAME = "DoATAPI", self = this,
        requestRetry = null,
        cached = [],
        
        apiKey = '',
        deviceId = '',
        NUMBER_OF_RETRIES = 3,                          // number of retries before returning error
        RETRY_TIMEOUT = {"from": 1000, "to": 3000},     // timeout before retrying a failed request
        MAX_REQUEST_TIME = 10000,                       // timeout before declaring a request as failed (if server isn't responding)
        MAX_ITEMS_IN_CACHE = 20,                        // maximum number of calls to save in the user's cache
        CACHE_EXPIRATION_IN_MINUTES = 30,
        STORAGE_KEY_CREDS = "credentials",
        authCookieName = '',
        userLat,
        userLon,
        appVersion,
        manualCredentials = null,
        manualCampaignStats = null,
        requestingSession = false,
        
        requestsQueue = {},
        requestsToPerformOnOnline = [],
        sessionInitRequest = null,
        
        // here we will save the actual params to pass
        savedParamsToPass = {},
        // which param to pass from normal requests to stats and logs
        PARAM_TO_PASS_BETWEEN_REQUESTS = "requestId",
        PARAM_TO_PASS_BETWEEN_REQUESTS_NAME = "originatingRequestId",
        
        // client info- saved in cookie and sent to API
        clientInfo = {
            'lc': navigator.language,
            'tz': (new Date().getTimezoneOffset()/-60).toString(),
            'kb': ''
        },
        
        requestsToCache = {
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
        },
        
        /*
         * config of params to pass from requests to reports
         * "Search.apps": ["appClick", "returnFromApp"]
         */
        paramsToPassBetweenRequests = {
            "Search.apps": ["appClick", "loadMore", "addToHomeScreen"]
        };
      
    this.ERROR_CODES = {
        "SUCCESS": 1,
        "AUTH": -9,
        "INVALID_PARAMS": -14,
        "TIMEOUT": -19
    };
    
    this.init = function init(options){
        apiKey = options.apiKey;
        appVersion = options.appVersion || "";
        authCookieName = options.authCookieName;
        manualCampaignStats = options.manualCampaignStats;
        
        deviceId = getDeviceId();
        manualCredentials = Evme.Storage.get(STORAGE_KEY_CREDS);
        
        // make sure our client info cookie is always updated according to phone ettings
        if (navigator.mozSettings) {
            navigator.mozSettings.addObserver('language.current', function onLanguageChange(e) {
                self.setClientInfoLocale(e.settingValue);
            });
            navigator.mozSettings.addObserver('time.timezone', function onTimeZoneChange(e) {
                self.setClientInfoTimeZone();
            });
            navigator.mozSettings.addObserver('keyboard.current', function onKeyboardLayoutChange(e) {
                self.setKeyboardLanguage(e.settingValue);
            });
        }
        
        self.Session.init();
    };
    
    this.search = function search(options, callback, noSession) {
        !options && (options = {});
        
        var params = {
            "query": options.query,
            "experienceId": options.experienceId,
            "typeHint": options.typeHint,
            "feature": options.feature,
            "cachedIcons": options.cachedIcons,
            "exact": options.exact,
            "spellcheck": options.spellcheck,
            "suggest": options.suggest,
            "first": options.first,
            "limit": options.limit,
            "idx": options.index,
            "iconFormat": options.iconFormat,
            "prevQuery": (options.first === 0)? options.prevQuery || "" : ""
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "apps",
            "params": params,
            "callback": callback,
            "noSession": noSession
        }, options._NOCACHE);
    };
    
    this.User = new function User() {
        this.apps = function apps(options, callback) {
            !options && (options = {});
            
            var params = {
                "cachedIcons": options.cachedIcons,
                "first": options.first,
                "limit": options.limit,
                "iconFormat": options.iconFormat
            };
            
            return request({
                "methodNamespace": "User",
                "methodName": "apps",
                "params": params,
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
    
    this.suggestions = function suggestions(options, callback) {
        !options && (options = {});
    
        var params = {
            "query": options.query
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "suggestions",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    };
    
    this.icons = function icons(options, callback) {
        !options && (options = {});
        
        var params = {
            "ids": options.ids,
            "iconFormat": options.iconFormat
        };
        
        return request({
            "methodNamespace": "App",
            "methodName": "icons",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    };
    
    this.bgimage = function bgimage(options, callback) {
        !options && (options = {});

        var params = {
            "query": options.query,
            "experienceId": options.experienceId,
            "typeHint": options.typeHint,
            "feature": options.feature,
            "exact": options.exact,
            "width": options.width,
            "height": options.height,
            "idx": options.index,
            "prevQuery": options.prevQuery || ""
        };

        return request({
            "methodNamespace": "Search",
            "methodName": "bgimage",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    };
    
    this.getDisambiguations = function getDisambiguations(options, callback) {
        !options && (options = {});

        var params = {
            "query": options.query
        };

        return request({
            "methodNamespace": "Search",
            "methodName": "disambiguate",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    };
    
    this.Shortcuts = new function Shortcuts() {
        var self = this,
            STORAGE_KEY_SHORTCUTS = "localShortcuts",
            STORAGE_KEY_ICONS = "localShortcutsIcons",
            queriesToAppIds = {};
        
        this.get = function get(options, callback) {
            var shortcuts = Evme.Storage.get(STORAGE_KEY_SHORTCUTS),
                icons = Evme.Storage.get(STORAGE_KEY_ICONS);
            
            if (!shortcuts) {
                shortcuts = Evme.__config["_" + STORAGE_KEY_SHORTCUTS];
                icons = Evme.__config["_" + STORAGE_KEY_ICONS];
            }
            
            saveAppIds(shortcuts);
            
            callback && callback(createResponse(shortcuts, icons));
        };
        
        this.set = function set(options, callback) {
            !options && (options = {});
            
            var shortcuts = options.shortcuts || [],
                icons = options.icons || {};
                
            for (var i=0,shortcut; shortcut=shortcuts[i++];) {
                if (typeof shortcut === "string") {
                    shortcut = {
                        "query": shortcut
                    };
                }
                
                shortcut.appIds = getAppIds(shortcut);
                
                shortcuts[i-1] = shortcut;
            }
            
            Evme.Storage.set(STORAGE_KEY_SHORTCUTS, shortcuts);
            Evme.Storage.set(STORAGE_KEY_ICONS, icons);
            
            callback && callback();
        };
        
        this.add = function add(options, callback) {
            var shortcuts = (Array.isArray(options.shortcuts))? options.shortcuts : [options.shortcuts],
                icons = options.icons;

            self.get(null, function onGetSuccess(data) {
                var currentShortcuts = data.response.shortcuts || [],
                    currentIcons = data.response.icons || {};
                
                for (var i=0,shortcut; shortcut=shortcuts[i++];) {
                    if (contains(currentShortcuts, shortcut) === false) {
                        currentShortcuts.push(shortcut);
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
        
        // this method gets icons or shortcuts and updates the single items in the DB
        // options.icons should be a map of appId : icon
        // options.shortcuts should be a map of experienceId/query : appIds
        this.update = function update(options, callback) {
          var icons = options.icons || {},
              shortcuts = options.shortcuts || {};
          
          self.get(null, function onGetSuccess(data) {
              var currentShortcuts = data.response.shortcuts || [],
                  currentIcons = data.response.icons || {};
              
              for (var appId in icons) {
                currentIcons[appId] = icons[appId];
              }
              
              for (var i=0,shortcut,newShortcutData; i<currentShortcuts.length; i++) {
                shortcut = currentShortcuts[i];
                newShortcutData = shortcuts[shortcut.query] || shortcuts[shortcut.experienceId];
                
                if (newShortcutData) {
                  currentShortcuts[i].appIds = newShortcutData;
                  saveAppIds(currentShortcuts[i]);
                }
              }
              
              self.set({
                  "shortcuts": currentShortcuts,
                  "icons": currentIcons
              }, callback);
          });
        };
        
        this.remove = function remove(shortcutToRemove) {
            self.get({}, function onGetSuccess(data){
                var shortcuts = data.response.shortcuts,
                    icons = data.response.icons,
                    allAppIds = {},
                    shortcutIndex = contains(shortcuts, shortcutToRemove);
                    
                if (shortcutIndex === false) {
                    return;
                }
                    
                for (var i=0,shortcut; shortcut=shortcuts[i++];) {
                    var needToRemoveIcons = false;
                    
                    if (i-1 === shortcutIndex) {
                        shortcuts.splice(i-1, 1);
                        needToRemoveIcons = true;
                    }
                    
                    for (var j=0,app,appId; app=shortcut.appIds[j++];) {
                        appId = app.id || app;
                        
                        if (!allAppIds[appId]) {
                            allAppIds[appId] = {
                                "num": 0,
                                "needToRemove": needToRemoveIcons
                            };
                        }
                        allAppIds[appId].num++;
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
        
        this.suggest = function suggest(options, callback) {
            !options && (options = {});
            
            var params = {
                "existing": JSON.stringify(options.existing || [])
            };
            
            return request({
                "methodNamespace": "Shortcuts",
                "methodName": "suggestions",
                "params": params,
                "callback": function onRequestSuccess(data) {
                    saveAppIds(data.response.shortcuts);
                    callback && callback(data);
                }
            }, options._NOCACHE);
        };
        
        // check if a list of shortcuts contain the given shortcut
        // not a simple indexOf since a shortcut is either a query or an experienceId
        function contains(shortcuts, shortcut) {
            for (var i=0,shortcutToCheck; shortcutToCheck=shortcuts[i++];) {
                var experienceId1 = shortcutToCheck.experienceId,
                    experienceId2 = shortcut.experienceId,
                    query1 = shortcutToCheck.query,
                    query2 = shortcut.query;
                    
                if ((experienceId1 && experienceId2 && experienceId1 === experienceId2) ||
                    (query1 && query2 && query1 === query2)) {
                    return i-1;
                }
            }
            
            return false;
        }
        
        function saveAppIds(shortcuts) {
            if (!shortcuts) {
              return;
            }
            
            if (!Array.isArray(shortcuts)) {
              shortcuts = [shortcuts];
            }
            
            for (var i=0,shortcut,value; shortcut=shortcuts[i++];) {
                value = (shortcut.experienceId || shortcut.query).toString().toLowerCase();
                queriesToAppIds[value] = shortcut.appIds;
            }
        }
        
        function getAppIds(shortcut) {
            var value = (shortcut.experienceId || shortcut.query).toString().toLowerCase();
            return queriesToAppIds[value] || [];
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
    
    this.trending = function trending(options, callback) {
        !options && (options = {});
        
        var params = {
            "first": options.first,
            "limit": options.limit,
            "returnImage": options.returnImage,
            "iconFormat": options.iconFormat,
            "quality": options.quality,
            "queries": options.queries
        };
        
        return request({
            "methodNamespace": "Search",
            "methodName": "trending",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    }
    
    this.Logger = new function Logger(){
        var self = this,
            methodArr = ["error", "warn", "info"];
        
        methodArr.forEach(function oggerMethodIteration(method){
            self[method] = function report(options, callback){
                options = addGlobals(options);
                options = addSavedParams(options);
                
                return request({
                    "methodNamespace": "Logger",
                    "methodName": method,
                    "params": options,
                    "callback": callback
                });
            }
        });
    };
    
    this.report = function report(options, callback) {
        options = addGlobals(options);
        options = addSavedParams(options);
        
        return request({
            "methodNamespace": "Stats",
            "methodName": "report",
            "params": options,
            "callback": callback
        }, options._NOCACHE);
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
    
    // add the saved params from earlier responses to the event's data
    function addSavedParams(options) {
        var events = options.data;
        if (events) {
            try {
                events = JSON.parse(events);
            } catch(ex) {
                events = null;
            }
            
            if (events && typeof events === "object") {
                for (var i=0,e; e=events[i++];) {
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
    
    // takes a method's response, and saves data according to paramsToPassBetweenRequests
    function saveParamFromRequest(method, response) {
        var events = paramsToPassBetweenRequests[method],
            paramValue = response && response[PARAM_TO_PASS_BETWEEN_REQUESTS];
            
        if (!paramValue || !events) {
            return;
        }
        
        // this will create a map of userEvents => requestId
        // to be added to the actual event request later
        for (var i=0,ev; ev=events[i++];) {
            savedParamsToPass[ev] = paramValue;
        }
    }
    
    this.searchLocations = function searchLocations(options, callback) {
        !options && (options = {});
        
        var params = {
            "query": options.query,
            "latlon": undefined
        };
        
        return request({
            "methodNamespace": "Location",
            "methodName": "search",
            "params": params,
            "callback": callback
        }, options._NOCACHE);
    };
    
    this.setLocation = function setLocation(lat, lon) {
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
    
    this.request = function publicRequest(methodNamespace, methodName, params, callback) {
        return request({
            "methodNamespace": methodNamespace,
            "methodName": methodName,
            "params": params,
            "callback": callback
        }, params._NOCACHE);
    };
    
    
    this.initSession = function initSession(options, callback) {
        !options && (options = {});
        
        var params = {
            "id": self.Session.get().id,
            "deviceId": deviceId,
            "cachedIcons": options.cachedIcons,
            "stats": {
                "userAgent": navigator.userAgent,
                "referrer": document.referrer,
                "connectionType": Evme.Utils.connection().type || "",
                "locale": navigator.language || "",
                "GMT": (new Date().getTimezoneOffset()/-60).toString(),
                "sessionInitCause": options.cause,
                "sessionInitSrc": options.source,
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
            "params": params,
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
        var self = this,
            _key = "session", _session = null,
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
            return Evme.Utils.uuid();
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
    
    this.setClientInfoLocale = function setClientInfoLocale(newLocale) {
        clientInfo.lc = newLocale || navigator.language || '';
    };
    this.setClientInfoTimeZone = function setClientInfoTimeZone(newTimeZone) {
        clientInfo.tz = newTimeZone || (new Date().getTimezoneOffset()/-60).toString();
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
            
            useCache = requestsToCache[methodNamespace+"."+methodName],
            cacheKey = '',
            
            shouldInit = Evme.DoATAPI.Session.shouldInit();
        
        if (requestsToPerformOnOnline.length != 0 && shouldInit.should && !doesntNeedSession[methodNamespace+"." + methodName] && !manualCredentials && !dontRetryIfNoSession) {
            requestsQueue[JSON.stringify(options)] = options;
            reInitSession(shouldInit.cause);
            return false;
        }
        
        // the following params will be added to the cache key
        if (userLat && userLon && typeof params["latlon"] == "undefined") {
            params["latlon"] = userLat + "," + userLon;
        }
        params["clientInfo"] = self.getClientInfo();
        
        if (useCache) {
            cacheKey = getCacheKey(methodNamespace, methodName, params);
            
            if (!ignoreCache) {
                var fromCache = getFromCache(cacheKey);
                if (fromCache) {
                    saveParamFromRequest(methodNamespace + '.' + methodName, fromCache);
                    callback && window.setTimeout(function() {
                        callback(fromCache);
                    }, 10);
                    return true;
                }
            }
        }
        
        // the following params WILL NOT BE ADDED TO THE CACHE KEY
        params["apiKey"] = apiKey;
        params["v"] = appVersion;
        params["native"] = true;

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
            "onAbort": cbRequestAbort,
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
                        "method": methodNamespace + '/' + methodName,
                        "request": _request,
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
        return queryString['did'] || 'fxos-' + Evme.Utils.uuid();
    }

    function cbRequest(methodNamespace, method, params, retryNumber) {
        Evme.EventHandler.trigger(NAME, "request", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber
        });
    }
    
    function cbRequestAbort(methodNamespace, method, params, retryNumber) {
        Evme.EventHandler.trigger(NAME, "abort", {
            "method": methodNamespace + "/" + method,
            "params": params,
            "retryNumber": retryNumber
        });
    }
    
    function cbSuccess(methodNamespace, method, url, params, retryNumber, data, requestDuration) {
        saveParamFromRequest(methodNamespace + '.' + method, data);
        
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
        
        httpRequest = null,
        aborted = false,
        cacheKey = "",
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
        
        httpRequest = Evme.api[methodNamespace][methodName](params, apiCallback);
        
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
        if (!httpRequest) {
            return;
        }
        
        httpRequest.abort();
        
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