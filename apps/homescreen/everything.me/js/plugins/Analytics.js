/*
 * Analytics class
 */
Evme.Analytics = new function Evme_Analytics() {
    var self = this, ga, idle, providers = [], immediateProviders = [], queueArr = [], maxQueueCount, getCurrentAppsRowsCols, STORAGE_QUERY = "analyticsLastSearchQuery",
        // Google Analytics load props
        GAScriptLoadStatus, GAScriptLoadSubscribers = [];
    
    // default values.
    // overridden by ../config/config.php
    var options = {
        "enabled": false,
        "maxQueueCount": 6,
        "dispatchDelay": 2000,
        "idleDelay": 4000,
        "localStorageTTL": 600000, // 10 min
        "SEARCH_SOURCES": {},
        "PAGEVIEW_SOURCES": {}
    };
    
    this.providers = providers;
    
    /**** PUBLIC METHODS ****/
    
    this.init = function init(_options) {
        // override defaults
        for (i in _options){ options[i] = _options[i]; }
        if (_options.config){
            for (i in _options.config){ options[i] = _options.config[i]; }
        }
        
        // if enabled
        if (options.enabled){
            // we send data according to the settings flag (Submit performance data)
            SettingsListener.observe('debug.performance_data.shared', false, onSettingChange);
        
            getCurrentAppsRowsCols = options.getCurrentAppsRowsCols;
            getCurrentSearchQuery = options.getCurrentSearchQuery;
            getCurrentSearchSource = options.getCurrentSearchSource;
            options.Brain.App.appRedirectBridge = function appRedirectBridge(appUrl, data){
                setTimeout(function onTimeout(){
                    Brain.App.appRedirectExecute(appUrl, data);
                }, 1500);
            };
            
            // Idle
            idle = new Evme.Idle();
            idle.init({
                "callback": dispatch,
                "delay": options.idleDelay
            });
            
            var requestsPerEventCount = 0;

            // register providers
            for (name in options.providers){
                var object = options.namespace[name],
                    params = options.providers[name];
                
                if (object && params.enabled && !(params.disableOnLowConnection && options.connectionLow)){
                    registerProvider(object, params);
                    
                    requestsPerEventCount+= "requestsPerEventCount" in params ? params.requestsPerEventCount : 1;
                }
            }
        
            // set maxQueueCount
            maxQueueCount = getMaxQueueCount(requestsPerEventCount);
        
            // restore queueArr from localStorage
            restoreQueue();
            
            // DO NOT USE UNLOAD cause the browser will refresh itself when clicking back to app
            // onunload store queueArr using localStorage
            //window.addEventListener("unload", storeQueue, false);
        }      
    };
    
    /**** PRIVATE METHODS ****/
   
   function onSettingChange(value) {
        if (value) {
            Evme.EventHandler.bind(catchCallback);
        } else {
            Evme.EventHandler.unbind(catchCallback);
        }
    }

    // event handler execution
    function catchCallback(_class, _event, _data) {
        try {
            self[_class] && self[_class][_event] && self[_class][_event](_data || {});
        } catch(ex){
        }
    }
    
    function registerProvider(object, params){
        var provider = new object(self.Sandbox);
        provider.init(params);
        providers.push(provider);
        
        if (provider.immediateDispatch){
            immediateProviders.push(provider);
        }
    }
    
    function getProviderByName(name){
        for (var i=0,len=providers.length; i<len; i++){
            if (name == providers[i].name){
                return providers[i];
            }
        }
    }
    
    function queue(params, immediateDispatch){
        idle.reset();
        processItem(params);
        queueArr.push(params);

        if (immediateDispatch) {
            idle.flush();
        }

        immediateProviders.forEach(function itemIterator(provider){
            provider.dispatch([params]);
        });
    }
    
    function processItem(params){
        !params.data && (params.data = {});
        params.data.sid = options.DoATAPI.getSessionId();
        
        if (!params.data.elapsed && options.sessionObj.timeWritten){
            params.data.elapsed = getElapsedTime(options.sessionObj.timeWritten);
        };
    }
    
    function dispatch(){
        // leave if not idle or there are no items to dispatch
        if (!idle.isIdle || !queueArr.length) {
            return false;
        }
        
        var dispatchedItems = queueArr.splice(0, maxQueueCount);
        
        providers.forEach(function itemIterator(provider){
            !provider.immediateDispatch && provider.dispatch(dispatchedItems);
        });
        queueArr.length && setTimeout(dispatch, options.dispatchDelay)
    }
    
    /* 
     * devide maxQueueCount by number of providers
     * 
       example:
        maxQueueCount = 4, numProviders = 2
        when dispatching, you want no more than 4 http requests transmitted
        which means 2 requests/provider  
     */ 
    function getMaxQueueCount(requestsPerEventCount){
        return options.maxQueueCount;
        // return Math.floor(options.maxQueueCount/requestsPerEventCount);
    }
    
    // Store queueArr in localStorage
    function storeQueue() {
        var str = "", firstFlag = true;
        queueArr.forEach(function itemIterator(item){
            if (!firstFlag){
                str+= "|";
            }
            else{
                firstFlag = false;
            }
            str+= JSON.stringify(item);
        });
        Evme.Storage.add("analyticsQueue", str);
        Evme.Storage.add("analyticsQueueTimestamp", new Date().getTime());
    }
    
    // Restore queueArr from localStorage
    function restoreQueue(){
        // leave if queue already populated or localStorage is empty
        if (queueArr.length || !Evme.Storage.get("analyticsQueue") || Evme.Storage.get("analyticsQueue") == "null"){ return false; }
        
        // determine time elapsed since queue storage
        var elapsed = new Date().getTime() - parseInt(Evme.Storage.get("analyticsQueueTimestamp"), 10);
        
        // if elapsed time hadn't exceeded ttl
        if (elapsed < options.localStorageTTL){
            // restore queue
            var tempArr = (Evme.Storage.get("analyticsQueue") || "").split("|");
            tempArr.forEach(function itemIterator(item){
                queueArr.push(JSON.parse(item));
            });
        }
        
        Evme.Storage.add("analyticsQueue", null);
        Evme.Storage.add("analyticsQueueTimestamp", null);
    }
    
    function loadGAScript(){
        var src = options.googleAnalyticsFile || ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = false;
            ga.src = src;
            ga.onload = onGAScriptLoad;
        var head = document.getElementsByTagName('head')[0]; head.appendChild(ga);
    }
    
    function onGAScriptLoad(){
        if (!options.googleAnalyticsAccount){ return false; }
        
        // create tracker
        var tracker = window._gat._createTracker(options.googleAnalyticsAccount);
        tracker._setDomainName("everything.me");
        setGACustomVars(tracker);
        
        GAScriptLoadStatus = "loaded";
        GAScriptLoadSubscribers.forEach(function itemIterator(cb){
            cb(tracker, options.googleAnalyticsAccount);
        });
    }
    
    function setGACustomVars(tracker){
        var n = Evme.Utils.getUrlParam("n"),
            c = Evme.Utils.getUrlParam("c");
            
        if (n && c) {
            tracker['_setCustomVar'](1, "CampaignTracking", n + ":" + c, 1);
        }
        
        tracker['_setCustomVar'](2, "Native", "false", 1);
        
        var orientation = (Evme.Utils.getOrientation() || {"name": "N/A"}).name || "N/A";
        tracker['_setCustomVar'](4, "Orientation", orientation, 1);
    }
    
    function getElapsedTime(start_ts){
        // calculate difference in ms e.g 2561 
        var d = new Date().getTime() - start_ts;
        // change to seconds with 2 digits after decimal point e.g 2.56
        return parseInt(d / 10, 10) / 100;
    }
    
    function getPageName(pageName) {
        return pageName == "homepage" ? "home" : pageName == "feed" ? "about" : pageName;
    }
    
    function getSearchSource(str) {
        var key = "SUGGESTION";
        switch (str.toLowerCase()) {
            case "history": key = "HISTORY"; break;
            case "refine": key = "REFINE"; break;
            case "didyoumean": key = "SPELLING"; break;
        }
        return options.SEARCH_SOURCES[key];
    }
    
    /**** SANDBOX METHODS ****/
    
    this.Sandbox = new function Sandbox(){
        
        // get DoAT API session Id
        this.getSessionId = function getSessionId(){
            return options.DoATAPI.getSessionId();
        };
        
        // Google Analytics script loader
        this.onGAScriptLoad = function onGAScriptLoad(cb){
            // if not loaded yet
            if (GAScriptLoadStatus !== "loaded"){
                // load it
                if (GAScriptLoadStatus !== "loading"){
                    loadGAScript();
                    GAScriptLoadStatus = "loading"
                }
                
                // add to queue 
                GAScriptLoadSubscribers.push(cb);
            }
            // if already loaded
            else{
                // execute callback
                cb(window._gat, options.googleAnalyticsAccount);
            }
        }
        
        this.DoATAPI = new function DoATAPI(){
            this.report = function report(params){
                options.DoATAPI.report(params);
            };
        };
        
        this.Logger = new function Logger(){
            this.warn = function warn(params){
                options.DoATAPI.Logger.warn(params);
            };
            
            this.error = function error(params){
                options.DoATAPI.Logger.error(params);
            };
            
            this.info = function info(params){
                options.DoATAPI.Logger.info(params);
            };
        };
        
        this.isNewSearchQuery = function isNewSearchQuery(newQuery){
            var lastSearchQuery = Evme.Storage.get(STORAGE_QUERY),
                newQuery = newQuery.toLowerCase();
            if (newQuery !== lastSearchQuery){
                Evme.Storage.set(STORAGE_QUERY, newQuery);
                return true;
            }
            return false;
        };
    };
    
    /**** EVENTS ****/
   
    this.DoATAPI = new function DoATAPI(){
        var LOGGER_WARN_SLOW_API_RESPONSE_TIME = 2000,
            LOGGER_WARN_SLOW_API_RESPONSE_TEXT = "Slow API response",
            blacklistMethods = ["logger/", "stats/", "search/trending", "search/bgimage"];
        
        this.success = function success(data){
            // Supress report for blacklist methods
            for (var i=0, len=blacklistMethods.length; i<len; i++){
                var method = blacklistMethods[i];
                if (data.method.toLowerCase().indexOf(method) === 0) { return false; }
            }

            // If it's too long
            if (data.requestDuration >= LOGGER_WARN_SLOW_API_RESPONSE_TIME){
                // construct params
                var params = {
                    "class": "Logger",
                    "event": "warn",
                    "data": {
                        "text": LOGGER_WARN_SLOW_API_RESPONSE_TEXT,
                        "responseTime": data.requestDuration,
                        "method": data.method,
                        "url": data.url,
                        "connectionType": Evme.Utils.connection().name || "",
                        "processingTime": data.response.processingTime || ""
                    }
                };
                
                queue(params);
            }
        };
        
        this.sessionInitOnPageLoad = function sessionInitOnPageLoad(data){
            data.elapsed = getElapsedTime(options.pageRenderStartTs);
            queue({
                "class": "DoATAPI",
                "event": "sessionInitOnPageLoad",
                "data": data
            });
        };
    };
    
    this.Analytics = new function Analytics(){
        this.gaEvent = function gaEvent(data){
            var GAEvents = getProviderByName("GAEvents");
            
            GAEvents && GAEvents.dispatch([{
                "class": "event",
                "event": "override",
                "data": {
                    "category": data.args[0],
                    "action": data.args[1],
                    "label": data.args[2],
                    "value": data.args[3]
                }
            }]);
        };
    };
   
    this.Core = new function Core(){
        var ROWS = 1, COLS = 0, redirectData;
           
        this.redirectedToApp = function redirectedToApp(data) {
            var total = getCurrentAppsRowsCols(),
                colIndex = data.index%(total[COLS]),
                rowIndex = Math.floor(data.index/(total[COLS]));
            
            var queueData = {
                "url": data.appUrl,
                "more": data.isMore ? 1 : 0,
                "appName": data.name,
                "appId": data.id,
                "appType": data.appType,
                "appIdName": data.id+":"+data.name,
                "keyboardVisible": data.keyboardVisible,
                "query": data.query,
                "source": data.source,
                "rowIndex": data.rowIndex,
                "colIndex": data.colIndex,
                "totalRows": data.totalRows,
                "totalCols": data.totalCols
            };

            queue({
                "class": "Core",
                "event": "redirectedToApp",
                "data": queueData
            }, true); // immediate dispatch
            
            if (queueData.source === options.SEARCH_SOURCES.EMPTY_SEARCHBOX) {
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "page": "FirstHelper",
                        "feature": "appClick"
                    }
                });
            } else  if (queueData.keyboardVisible){
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": queueData.query,
                        "page": "",
                        "feature": "appClick"
                    }
                }, true);
            }

            redirectData = {
                "blurTime":new Date().getTime(),
                "query": queueData.query,
                "source": queueData.source,
                "url": queueData.url,
                "appName": queueData.appName,
                "appId": queueData.appId
            };
        };
        
        this.returnedFromApp = function returnedFromApp() {

            if (redirectData){
                // end timer
                var focusTime = new Date().getTime(),
                    elapsedTime = focusTime - redirectData["blurTime"];
                    elapsedTime = parseInt(elapsedTime/1000, 10); // convert to seconds
                
                queue({
                    "class": "Core",
                    "event": "returnedFromApp",
                    "data": {
                        "elapsedTime": elapsedTime,
                        "appName": redirectData["appName"],
                        "appId": redirectData["appId"],
                        "query": redirectData["query"],
                        "source": redirectData["source"],
                        "url": redirectData["url"]
                    }
                });
                
                redirectData = undefined;
            }            
        };
        
        this.error = function error(data){
            data.text = "Client error";
            data.ua = navigator.userAgent;
            data.platform = Evme.Utils.platform();
            
            queue({
                "class": "Core",
                "event": "error",
                "data": data
            });
        };
        
        this.initError = function initError(data){
            queue({
                "class": "Core",
                "event": "initError",
                "data": data
            });
        };
        
        this.initLoadFile = function initLoadFile(data){
            queue({
                "class": "Core",
                "event": "initLoadFile",
                "data": data
            });
        };

        this.searchOnPageLoad = function searchOnPageLoad(data){
            if (data.query){
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "feature": "pageLoad",
                        "source": options.PAGEVIEW_SOURCES.URL
                    }
                });
            }
        };
    
        this.firstPageLoad = function firstPageLoad(data){
            data.page = getPageName(data.page);
            
            queue({
                "class": "Url",
                "event": "goTo",
                "data": data
            });
        };
        
        this.requestInvite = function requestInvite(data) {
            queue({
                "class": "Core",
                "event": "requestInvite",
                "data": data
            });
        };
    };
   
    this.Searchbar = new function Searchbar() {
        this.returnPressed = function returnPressed(data) {
            data.query = data.value;
            queue({
                "class": "Searchbar",
                "event": "returnPressed",
                "data": data
            });
            
            queue({
                "class": "Results",
                "event": "search",
                "data": {
                    "query": data.value,
                    "page": "",
                    "feature": "rtrn"
                }
            });
        };
        
        this.idle = function idle(data){
            if (data.query.length > 2){
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "page": "",
                        "feature": "idle"
                    }
                });
            }
        };
    };
    
    this.Shortcuts = new function Shortcuts() {
        this.show = function show(data) {
            if (!data.report) {
                return;
            }
            
            queue({
                "class": "Shortcuts",
                "event": "show",
                "data": data
            });
        };
        
        this.hide = function hide(data) {
            if (!data.report) {
                return;
            }
            
            queue({
                "class": "Shortcuts",
                "event": "hide",
                "data": data
            });
        };
        
        this.categoryPageShow = function categoryPageShow(data) {
            queue({
                "class": "Shortcuts",
                "event": "categoryPageShow",
                "data": data
            });
        };
    };
        
    this.Shortcut = new function Shortcut() {
        this.click = function click(data) {
            queue({
                "class": "Shortcut",
                "event": "click",
                "data": data
            });
        };
        
        this.search = function search(data) {
            queue({
                "class": "Results",
                "event": "search",
                "data": {
                    "query": data.query,
                    "type": data.type || "",
                    "page": "Shortcut",
                    "feature": data.source
                }
            });
        };
    };
    
    this.BackgroundImage = new function BackgroundImage() {
        this.showFullScreen = function showFullScreen(data) {
            queue({
                "class": "BackgroundImage",
                "event": "showFullScreen",
                "data": data
            });
        };
    };
    
    this.Helper = new function Helper() {        
        this.click = function click(data) {
            data.visible = data.visible ? 1 : 0;
            data.query = data.value !== "." ? data.value : "";
            
            if (data.query){
                var classname = data.source || "suggestions";
                data.source = getSearchSource(classname);
                
                queue({
                    "class": classname,
                    "event": "click",
                    "data": data
                });
                
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "page": "",
                        "feature": data.source
                    }
                });
            }
        };
        
        this.showAppsFromFirstSuggestion = function showAppsFromFirstSuggestion(data) {
            queue({
                "class": "Helper",
                "event": "searchFromFirstSuggestion",
                "data": data
            });  
            
            queue({
                "class": "Results",
                "event": "search",
                "data": {
                    "query": data.query,
                    "page": "FirstHelper",
                    "feature": "appClick"
                }
            });
        };
        
        this.showAppsFromDefault = function showAppsFromDefault(data) {
            if (options.Brain.Searchbar.emptySource) {
                
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "feature": options.SEARCH_SOURCES.EMPTY_SEARCHBOX,
                        "source": options.Brain.Searchbar.emptySource
                    }
                });
                options.Brain.Searchbar.emptySource = undefined;
            }
        };
    };
    
    
    this.Tips = new function Tips() {
        this.show = function show(data) {
            queue({
                "class": "Tips",
                "event": "show",
                "data": data
            });
        };
        this.hide = function hide(data) {
            queue({
                "class": "Tips",
                "event": "hide",
                "data": data
            });
        };
        this.click = function click(data) {
            queue({
                "class": "Tips",
                "event": "click",
                "data": data
            });
        };
    };

    this.App = new function App() {
        this.addToHomeScreen = function addToHomeScreen(data) {
            queue({
                "class": "App",
                "event": "addToHomeScreen",
                "data": data
            });
        };
    };
    
    this.AppsMore = new function AppsMore() {        
        this.show = function show(data) {
            queue({
                "class": "AppsMore",
                "event": "show",
                "data": data
            });
            
            if (Evme.Utils.isKeyboardVisible){
                data.query = Evme.Utils.getCurrentSearchQuery();
                queue({
                    "class": "Results",
                    "event": "search",
                    "data": {
                        "query": data.query,
                        "page": "",
                        "feature": "more"
                    }
                });
            }
        };
    };
    
    this.Prompt = new function Prompt() {
        this.show = function show(data) {
            if (!data.text || typeof data.text != "string") {
                data.text = "N/A";
            }
            
            queue({
                "class": "Prompt",
                "event": "show",
                "data": data
            });
        };
        
        this.click = function click(data) {
            if (!data.text || typeof data.text != "string") {
                data.text = "N/A";
            }
            
            queue({
                "class": "Prompt",
                "event": "click",
                "data": data
            });
        };
        
        this.dismiss = function dismiss(data) {
            if (!data.text || typeof data.text != "string") {
                data.text = "N/A";
            }
            
            queue({
                "class": "Prompt",
                "event": "dismiss",
                "data": data
            });
        };
    };
    
    this.ShortcutsCustomize = new function ShortcutsCustomize() {
        this.show = function show(data) {
            queue({
                "class": "ShortcutsCustomize",
                "event": "show",
                "data": data
            });
        };
        
        this.done = function done(data) {
            queue({
                "class": "ShortcutsCustomize",
                "event": "done",
                "data": data
            });
        };
    };
}