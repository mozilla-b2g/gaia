Evme.Utils = new function() {
    var _this = this, userAgent = "", connection, cssPrefix = "", iconsFormat = null,
        isKeyboardVisible = false, _title = "Everything", isNewUser,
        _parseQuery = parseQuery(), isTouch = false;

    this.ICONS_FORMATS = {
        "Small": 10,
        "Large": 20
    };
    var CONTAINER_ID = "evmeContainer",
        COOKIE_NAME_CREDENTIALS = "credentials",
        DYNAMIC_TITLE = false;

    var FFOSMessages = this.FFOSMessages = {
        "APP_CLICK": "open-in-app",
        "APP_INSTALL": "add-bookmark",
        "IS_APP_INSTALLED": "is-app-installed",
        "OPEN_URL": "open-url",
        "SHOW_MENU": "show-menu",
        "HIDE_MENU": "hide-menu",
        "MENU_HEIGHT": "menu-height",
        "GET_ALL_APPS": "get-all-apps",
        "GET_APP_ICON": "get-app-icon",
        "GET_APP_NAME": "get-app-name",
        "GET_ICON_SIZE": "get-icon-size"
    };

    this.log = function(message) {
        dump("(" + (new Date().getTime()) + ") DOAT: " + message);
    };

    this.sendToFFOS = function(type, data) {
        switch (type) {
            case FFOSMessages.APP_CLICK:
                EvmeManager.openApp(data);
                break;
            case FFOSMessages.APP_INSTALL:
                EvmeManager.addBookmark(data);
                break;
            case FFOSMessages.IS_APP_INSTALLED:
                return EvmeManager.isAppInstalled(data.url);
                break;
            case FFOSMessages.OPEN_URL:
                return EvmeManager.openUrl(data.url);
                break;
            case FFOSMessages.SHOW_MENU:
                return EvmeManager.menuShow();
                break;
            case FFOSMessages.HIDE_MENU:
                return EvmeManager.menuHide();
                break;
            case FFOSMessages.MENU_HEIGHT:
                return EvmeManager.getMenuHeight();
                break;
            case FFOSMessages.GET_ALL_APPS:
                return EvmeManager.getApps();
                break;
            case FFOSMessages.GET_APP_ICON:
                return EvmeManager.getAppIcon(data);
                break;
            case FFOSMessages.GET_APP_NAME:
                return EvmeManager.getAppName(data);
                break;
            case FFOSMessages.GET_ICON_SIZE:
                return EvmeManager.getIconSize();
                break;
        }
    };

    this.getID = function() {
        return CONTAINER_ID;
    };

    this.getRoundIcon = function(imageSrc, callback) {
        var size = Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.GET_ICON_SIZE) - 2,
            radius = size/2,
            img = new Image();
        
        img.onload = function() {
            var canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d");
                
            canvas.width = size;
            canvas.height = size;
            
            ctx.beginPath();
            ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
            ctx.clip();
            
            ctx.drawImage(img, 0, 0, size, size);
            
            callback(canvas.toDataURL());
        };
        img.src = imageSrc;
    };

    this.getKeyboardHeight = function() {
        return 210;
    };

    this.init = function() {
        userAgent = navigator.userAgent;
        cssPrefix = _getCSSPrefix();
        connection = Connection.get();
        isTouch = "ontouchstart" in window;
    };

    this.isNewUser = function() {
        if (isNewUser === undefined) {
            isNewUser = !Evme.Storage.get("counter-ALLTIME");
        }
        return isNewUser;
    };

    this.updateObject = function(configData, groupConfig) {
        if (!groupConfig) return;

        for (var key in groupConfig) {
            eval('configData["' + key.replace(/=>/g, '"]["') + '"] = groupConfig[key]');
        }

        return configData;
    };

    this.formatImageData = function(image) {
        if (!image || typeof image !== "object") {
            return image;
        }
        if (!image.MIMEType || image.data.length < 10) {
            return null;
        }

        return "data:" + image.MIMEType + ";base64," + image.data;
    };

    this.getIconGroup = function() {
        return JSON.parse(JSON.stringify(Evme.__config.iconsGroupSettings));
    }

    this.getIconsFormat = function() {
        return iconsFormat || _getIconsFormat();
    };

    this.isKeyboardVisible = function(){
        return isKeyboardVisible;
    };

    this.setKeyboardVisibility = function(value){
        isKeyboardVisible = value;
        if (isKeyboardVisible) {
            $("#" + CONTAINER_ID).addClass("keyboard-visible");
        } else {
            $("#" + CONTAINER_ID).removeClass("keyboard-visible");
        }
    };

    this.connection = function(){
        return connection;
    };

    this.isOnline = function(callback) {
        Connection.online(callback);
    };

    this.getUrlParam = function(key) {
        return _parseQuery[key]
    };

    this.cssPrefix = function() {
        return cssPrefix;
    };

    this.convertIconsToAPIFormat = function(icons) {
        var aIcons = [];
        if (icons instanceof Array) {
            for (var i=0; i<icons.length; i++) {
                aIcons.push(f(icons[i]));
            }
        } else {
            for (var i in icons) {
                aIcons.push(f(icons[i]));
            }
        }
        aIcons = aIcons.join(",");
        return aIcons;

        function f(icon) {
            return (icon && icon.id && icon.revision && icon.format)? icon.id + ":" + icon.revision + ":" + icon.format : "";
        }
    }

    this.hasFixedPositioning = function(){
        return false;
    };

    this.isVersionOrHigher = function(v1, v2) {
        if (!v2){ v2 = v1; v1 = Evme.Utils.getOS().version; };
        if (!v1){ return undefined; }

        var v1parts = v1.split('.');
        var v2parts = v2.split('.');

        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return true;
            }

            if (v1parts[i] == v2parts[i]) {
                continue;
            } else if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
                return true;
            } else {
                return false;
            }
        }

        if (v1parts.length != v2parts.length) {
            return false;
        }

        return true;
    };

    this.Apps = new function() {
        var _this = this,
            timeoutAppsToDrawLater = null;

        var TIMEOUT_BEFORE_DRAWING_REST_OF_APPS = 100;

        this.print = function(options) {
            var apps = options.apps,
                numAppsOffset = options.numAppsOffset || 0,
                isMore = options.isMore,
                iconsFormat = options.iconsFormat,
                $list = options.$list,
                onDone = options.onDone,
                hasInstalled = false,

                appsList = {},
                iconsResult = {
                    "cached": [],
                    "missing": []
                },
                doLater = [];

            window.clearTimeout(timeoutAppsToDrawLater);

            var docFrag = document.createDocumentFragment();
            for (var i=0; i<apps.length; i++) {
                var app = new Evme.App(apps[i], numAppsOffset+i, isMore, _this);
                var id = apps[i].id;
                var icon = app.getIcon();

                icon = Evme.IconManager.parse(id, icon, iconsFormat);
                app.setIcon(icon);

                if (Evme.Utils.isKeyboardVisible() && (isMore || i<Math.max(apps.length/2, 8))) {
                    var $app = app.draw();
                    docFrag.appendChild($app[0]);
                } else {
                    doLater.push(app);
                }

                if (app.missingIcon()) {
                    if (!icon) {
                        icon = id;
                    }
                    iconsResult["missing"].push(icon);
                } else {
                    iconsResult["cached"].push(icon);
                }

                appsList[id] = appsList;

                if (apps[i].installed) {
                    hasInstalled = true;
                }
            }

            if (hasInstalled) {
                options.obj && options.obj.hasInstalled(true);
            }

            $list[0].appendChild(docFrag);

            if (doLater.length > 0) {
                timeoutAppsToDrawLater = window.setTimeout(function(){
                    var docFrag = document.createDocumentFragment();
                    for (var i=0; i<doLater.length; i++) {
                        var $app = doLater[i].draw();
                        docFrag.appendChild($app[0]);
                    }
                    $list[0].appendChild(docFrag);

                    window.setTimeout(function(){
                        $list.find(".new").removeClass("new");
                    }, 10);

                    onDone && onDone(appsList);
                }, TIMEOUT_BEFORE_DRAWING_REST_OF_APPS);
            } else {
                onDone && onDone(appsList);
            }

            if (docFrag.childNodes.length > 0) {
                window.setTimeout(function(){
                    $list.find(".new").removeClass("new");
                }, 10);
            }

            return iconsResult;
        }
    };

    this.User = new function() {
        this.creds = function() {
            var credsFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME_CREDENTIALS);
            return credsFromCookie;
        };
    };

    this.Cookies = new function() {
        this.set = function(name, value, expMinutes, _domain) {
            var expiration = "",
                path = norm("path","/"),
                domain = norm("domain", _domain);

            if (expMinutes) {
                expiration = new Date();
                expiration.setMinutes(expiration.getMinutes() + expMinutes);
                expiration = expiration.toGMTString();
            }
            expiration = norm("expires", expiration);

            var s = name + "=" + escape(value) + expiration + path + domain;

            try {
                document.cookie = s;
            } catch(ex) {}

            return s;
        };

        this.get = function(name) {
            var results = null;

            try {
                results = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            } catch(ex) {}

            return (results)? unescape(results[2]) : null;
        };

        this.remove = function(name) {
            Evme.Utils.Cookies.set(name, "", "Thu, 24-Jun-1999 12:34:56 GMT");
        };

        function norm(k, v) {
            return k && v ? "; "+k+"="+v : "";
        }
    };

    // check that cookies are enabled by setting and getting a temp cookie
    this.bCookiesEnabled = function(){
        var key = "cookiesEnabled",
            value = "true";

        // set
        _this.Cookies.set(key, value, 10);

        // get and check
        if (_this.Cookies.get(key) === value){
            _this.Cookies.remove(key);
            return true;
        }
    };

    // check that localStorage is enabled by setting and getting a temp value
    this.bLocalStorageEnabled = function(){
        return Evme.Storage.enabled();
    };

    function _getIconsFormat() {
        return _this.ICONS_FORMATS.Large;
    }

    function _getCSSPrefix() {
        return (/webkit/i).test(navigator.appVersion) ? '-webkit-' :
                (/firefox/i).test(navigator.userAgent) ? '-moz-' :
                (/msie/i).test(navigator.userAgent) ? '-ms-' :
                'opera' in window ? '-o-' : '';
    }

    this.getCurrentSearchQuery = function(){
        return Evme.Brain.Searcher.getDisplayedQuery();
    };

    var Connection = new function(){
        var _this = this,
            currentIndex,
            consts = {
                SPEED_UNKNOWN: 100,
                SPEED_HIGH: 30,
                SPEED_MED: 20,
                SPEED_LOW: 10
            },
            types = [
                {
                    "name": undefined,
                    "speed": consts.SPEED_UNKNOWN
                },
                {
                    "name": "etherenet",
                    "speed": consts.SPEED_HIGH
                },
                {
                    "name": "wifi",
                    "speed": consts.SPEED_HIGH
                },
                {
                    "name": "2g",
                    "speed": consts.SPEED_LOW
                },
                {
                    "name": "3g",
                    "speed": consts.SPEED_MED
                }
            ];

        this.init = function() {
            window.addEventListener("online", _this.setOnline);
            window.addEventListener("offline", _this.setOffline);

            _this.set();
        };

        this.setOnline = function() {
            Evme.EventHandler.trigger("Connection", "online");
        };
        this.setOffline = function() {
            Evme.EventHandler.trigger("Connection", "offline");
        };

        this.online = function(callback) {
            callback(window.location.href.match(/_offline=true/)? false : navigator.onLine);
        };

        this.get = function(){
            return getCurrent();
        };

        this.set = function(index){
             currentIndex = index || (navigator.connection && navigator.connection.type) || 0;
             return getCurrent();
        };

        function getCurrent(){
            return aug({}, consts, types[currentIndex]);
        }

        function aug(){
            var main = arguments[0];
            for (var i=1, len=arguments.length; i<len; i++){
                for (var k in arguments[i]){ main[k] = arguments[i][k] }
            };
            return main;
        }

        // init
        _this.init();
    };
    this.Connection = Connection;

    this.init();
};

/* page visibility api polyfill */
(function(global, d){
    var DEFAULT_SPEC_EVENT = "visibilitychange",
        DEFAULT_SPEC_PROP = "hidden",
        prefixes = ["o", "ms", "moz", "webkit"],
        vendorProp, vendorEvent;

    if (typeof d[DEFAULT_SPEC_PROP] !== "undefined") {
        return;
    } else {
        var i = prefixes.length;
        while(i--) {
            var prefix = prefixes[i],
                propName = prefix + "Hidden";

            if (propName in d) {
                vendorProp = propName;
                vendorEvent = prefix + "visibilitychange";
                break;
            }
        }
    }

    if (vendorEvent) {
        d.addEventListener(vendorEvent, function(){
            setHidden(d[vendorProp]);
        }, false);
    } else {
        var evShow = ("onpageshow" in global)? "pageshow" : "focus",
            evHide = ("onpagehide" in global)? "pagehide" : "blur";

        global.addEventListener(evShow, function(){
            setHidden(false);
        }, false);
        global.addEventListener(evHide, function(){
            setHidden(true);
        }, false);
    }

    function setHidden(hidden) {
        d[DEFAULT_SPEC_PROP] = hidden;
        fireVisibilityEvent();
    }
    function fireVisibilityEvent() {
        var e = d.createEvent("Events");
        e.initEvent(DEFAULT_SPEC_EVENT, true, false);
        d.dispatchEvent(e);
    }
})(this, document);