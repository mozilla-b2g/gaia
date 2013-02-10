Evme.Utils = new function Evme_Utils() {
    var self = this,
        userAgent = "", connection = null, cssPrefix = "", iconsFormat = null,
        newUser = false, isTouch = false,
        parsedQuery = parseQuery(),
        elContainer = null,
        
        CONTAINER_ID = "evmeContainer",
        COOKIE_NAME_CREDENTIALS = "credentials",
        
        OSMessages = this.OSMessages = {
            "APP_CLICK": "open-in-app",
            "APP_INSTALL": "add-bookmark",
            "IS_APP_INSTALLED": "is-app-installed",
            "OPEN_URL": "open-url",
            "SHOW_MENU": "show-menu",
            "HIDE_MENU": "hide-menu",
            "MENU_HEIGHT": "menu-height",
            "GET_ALL_APPS": "get-all-apps",
            "GET_APP_ICON": "get-app-icon",
            "GET_APP_NAME": "get-app-name"
        };
    
    this.isKeyboardVisible = false;

    this.EMPTY_IMAGE = "../../images/empty.gif";
    
    this.ICONS_FORMATS = {
        "Small": 10,
        "Large": 20
    };
    
    this.init = function init() {
        userAgent = navigator.userAgent;
        cssPrefix = getCSSPrefix();
        connection = Connection.get();
        isTouch = window.hasOwnProperty("ontouchstart");
        
        elContainer = document.getElementById(CONTAINER_ID);
    };
    
    this.log = function log(message) {
        var t = new Date(),
            h = t.getHours(),
            m = t.getMinutes(),
            s = t.getSeconds(),
            ms = t.getMilliseconds();
        
        h < 10 && (h = '0' + h);
        m < 10 && (m = '0' + m);
        s < 10 && (s = '0' + s);
        ms < 10 && (ms = '00' + ms) ||
        ms < 100 && (ms = '0' + ms);
        
        dump("[" + [h, m, s, ms].join(':') + " EVME]: " + message);
    };
    
    this.l10n = function l10n(module, key, args) {
        return navigator.mozL10n.get(Evme.Utils.l10nKey(module, key), args);
    };
    this.l10nAttr = function l10nAttr(module, key, args) {
        var attr = 'data-l10n-id="' + Evme.Utils.l10nKey(module, key) + '"';
        
        if (args) {
            try {
                attr += ' data-l10n-args="' + JSON.stringify(args).replace(/"/g, '&quot;') + '"';
            } catch(ex) {
                
            }
        }
        
        return attr;
    };
    this.l10nKey = function l10nKey(module, key) {
        return ('evme-' + module + '-' + key).toLowerCase();
    };
    this.l10nParseConfig = function l10nParseConfig(text) {
        if (typeof text === "string") {
            return text;
        }
        
        var firstLanguage = Object.keys(text)[0],
            currentLang = navigator.mozL10n.language.code || firstLanguage,
            translation = text[currentLang] || text[firstLanguage] || '';
        
        return translation;
    };
    
    this.shortcutIdToKey = function l10nShortcutKey(experienceId) {
        var map = Evme.__config.shortcutIdsToL10nKeys || {};
        return map[experienceId.toString()] || experienceId;
    };
    
    this.uuid = function generateUUID() {
        return Evme.uuid();
    };
    
    this.sendToOS = function sendToOS(type, data) {
        switch (type) {
            case OSMessages.APP_CLICK:
                EvmeManager.openApp(data);
                break;
            case OSMessages.APP_INSTALL:
                EvmeManager.addBookmark(data);
                break;
            case OSMessages.IS_APP_INSTALLED:
                return EvmeManager.isAppInstalled(data.url);
            case OSMessages.OPEN_URL:
                return EvmeManager.openUrl(data.url);
            case OSMessages.SHOW_MENU:
                return EvmeManager.menuShow();
            case OSMessages.HIDE_MENU:
                return EvmeManager.menuHide();
            case OSMessages.MENU_HEIGHT:
                return EvmeManager.getMenuHeight();
            case OSMessages.GET_ALL_APPS:
                return EvmeManager.getApps();
            case OSMessages.GET_APP_ICON:
                return EvmeManager.getAppIcon(data);
            case OSMessages.GET_APP_NAME:
                return EvmeManager.getAppName(data);
            case OSMessages.GET_ICON_SIZE:
                return EvmeManager.getIconSize();
        }
    };

    this.getID = function getID() {
        return CONTAINER_ID;
    };
    
    this.getContainer = function getContainer() {
        return elContainer;
    };
    
    this.cloneObject = function cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    };
    
    // remove installed apps from clouds apps
    this.dedupInstalledApps = function dedupInstalledApps(apps, installedApps) {
      var dedupCloudAppsBy = [];
      
      // first construct the data to filter by (an array of objects)
      // currently only the URL is relevant
      for (var i=0, appData; appData=installedApps[i++];) {
        dedupCloudAppsBy.push({
          'favUrl': appData.favUrl,
          'appUrl': appData.favUrl
        });
      }
      
      return self.dedup(apps, dedupCloudAppsBy);
    };
    
    // remove from arrayOrigin according to rulesToRemove
    // both arguments are arrays of objects
    this.dedup = function dedup(arrayOrigin, rulesToRemove) {
      for (var i=0,item; item=arrayOrigin[i++];) {
        for (var j=0,rule; rule=rulesToRemove[j++];) {
          for (var property in rule) {
            // if one of the conditions was met,
            // remove the item and continue to next item
            if (item[property] === rule[property]) {
              arrayOrigin.splice(i-1, 1);
              j = rulesToRemove.length;
              break;
            }
          }
        }
      }
      
      return arrayOrigin;
    };

    this.getRoundIcon = function getRoundIcon(imageSrc, callback) {
        var size = self.sendToOS(self.OSMessages.GET_ICON_SIZE) - 2,
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
    
    this.isNewUser = function isNewUser() {
        if (newUser === undefined) {
            newUser = !Evme.Storage.get("counter-ALLTIME");
        }
        return newUser;
    };
    
    this.formatImageData = function formatImageData(image) {
        if (!image || typeof image !== "object") {
            return image;
        }
        if (self.isBlob(image)) {
            return self.EMPTY_IMAGE;
        }
        if (!image.MIMEType || image.data.length < 10) {
            return null;
        }

        return "data:" + image.MIMEType + ";base64," + image.data;
    };

    this.getIconGroup = function getIconGroup() {
        return self.cloneObject(Evme.__config.iconsGroupSettings);
    };

    this.getIconsFormat = function getIconsFormat() {
        return iconsFormat || _getIconsFormat();
    };

    this.isBlob = function isBlob(arg) {
        return arg instanceof Blob;
    };

    this.blobToDataURI = function blobToDataURI(blob, cbSuccess, cbError) {
        if (!self.isBlob(blob)) {
            cbError && cbError();
            return;
        }

        var reader = new FileReader();
        reader.onload = function() {
            cbSuccess(reader.result);
        };
        reader.onerror = function() {
            cbError && cbError();
        };

        reader.readAsDataURL(blob);
    }

    this.setKeyboardVisibility = function setKeyboardVisibility(value){
    	if (self.isKeyboardVisible === value) return;
    	
        self.isKeyboardVisible = value;
        
        if (self.isKeyboardVisible) {
            Evme.$("#" + CONTAINER_ID).classList.add("keyboard-visible");
        } else {
            Evme.$("#" + CONTAINER_ID).classList.remove("keyboard-visible");
        }
    };

    this.connection = function _connection(){
        return connection;
    };

    this.isOnline = function isOnline(callback) {
       Connection.online(callback);
    };

    this.getUrlParam = function getUrlParam(key) {
        return parsedQuery[key]
    };

    this.cssPrefix = function _cssPrefix() {
        return cssPrefix;
    };

    this.convertIconsToAPIFormat = function convertIconsToAPIFormat(icons) {
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

    this.hasFixedPositioning = function hasFixedPositioning(){
        return false;
    };

    this.isVersionOrHigher = function isVersionOrHigher(v1, v2) {
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
    
    this.Apps = new function Apps() {
        var self = this,
            timeoutAppsToDrawLater = null;

        var TIMEOUT_BEFORE_DRAWING_REST_OF_APPS = 100;
        
        this.print = function print(options) {
            var apps = options.apps,
                numAppsOffset = options.numAppsOffset || 0,
                isMore = options.isMore,
                iconsFormat = options.iconsFormat,
                elList = options.elList,
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
                var appData = apps[i],
                    app = new Evme.App(appData, numAppsOffset+i, isMore, self),
                    id = appData.id,
                    icon = app.getIcon();
                
                icon = Evme.IconManager.parse(id, icon, iconsFormat);
                app.setIcon(icon);
                
                if (Evme.Utils.isKeyboardVisible && (isMore || i<Math.max(apps.length/2, 8))) {
                    docFrag.appendChild(app.draw());
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

                appsList[''+id] = app;

                if (appData.installed) {
                    hasInstalled = true;
                }
            }

            if (hasInstalled) {
                options.obj && options.obj.hasInstalled(true);
            }
            
            elList.appendChild(docFrag);

            if (doLater.length > 0) {
                timeoutAppsToDrawLater = window.setTimeout(function onTimeout(){
                    var docFrag = document.createDocumentFragment();
                    for (var i=0,app; app=doLater[i++];) {
                        docFrag.appendChild(app.draw());
                    }
                    elList.appendChild(docFrag);
                    
                    window.setTimeout(function onTimeout(){
                        Evme.$(".new", elList, function onItem(el) {
                            el.classList.remove("new");
                        });
                    }, 10);

                    onDone && onDone(appsList);
                }, TIMEOUT_BEFORE_DRAWING_REST_OF_APPS);
            } else {
                onDone && onDone(appsList);
            }

            if (docFrag.childNodes.length > 0) {
                window.setTimeout(function onTimeout(){
                    Evme.$(".new", elList, function onItem(el) {
                        el.classList.remove("new");
                    });
                }, 10);
            }

            return iconsResult;
        }
    };

    this.User = new function User() {
        this.creds = function creds() {
            var credsFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME_CREDENTIALS);
            return credsFromCookie;
        };
    };

    this.Cookies = new function Cookies() {
        this.set = function set(name, value, expMinutes, _domain) {
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

        this.get = function get(name) {
            var results = null;

            try {
                results = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            } catch(ex) {}

            return (results)? unescape(results[2]) : null;
        };

        this.remove = function remove(name) {
            Evme.Utils.Cookies.set(name, "", "Thu, 24-Jun-1999 12:34:56 GMT");
        };

        function norm(k, v) {
            return k && v ? "; "+k+"="+v : "";
        }
    };

    // check that cookies are enabled by setting and getting a temp cookie
    this.bCookiesEnabled = function bCookiesEnabled(){
        var key = "cookiesEnabled",
            value = "true";

        // set
        self.Cookies.set(key, value, 10);

        // get and check
        if (self.Cookies.get(key) === value){
            self.Cookies.remove(key);
            return true;
        }
    };

    // check that localStorage is enabled by setting and getting a temp value
    this.bLocalStorageEnabled = function bLocalStorageEnabled(){
        return Evme.Storage.enabled();
    };

    function _getIconsFormat() {
        return self.ICONS_FORMATS.Large;
    }

    function getCSSPrefix() {
        return (/webkit/i).test(navigator.appVersion) ? '-webkit-' :
                (/firefox/i).test(navigator.userAgent) ? '-moz-' :
                (/msie/i).test(navigator.userAgent) ? '-ms-' :
                'opera' in window ? '-o-' : '';
    }

    this.getCurrentSearchQuery = function getCurrentSearchQuery(){
        return Evme.Brain.Searcher.getDisplayedQuery();
    };
    
    var Connection = new function Connection(){
        var self = this,
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

        this.init = function init() {
            window.addEventListener("online", self.setOnline);
            window.addEventListener("offline", self.setOffline);
            
            self.set();
        };
        
        this.setOnline = function setOnline() {
            Evme.EventHandler.trigger("Connection", "online");
        };
        this.setOffline = function setOffline() {
            Evme.EventHandler.trigger("Connection", "offline");
        };
        
        this.online = function online(callback) {
            callback(window.location.href.match(/_offline=true/)? false : navigator.onLine);
        };
        
        this.get = function get(){
            return getCurrent();
        };
        
        this.set = function set(index){
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
        self.init();
    };
    this.Connection = Connection;

    this.init();
};

Evme.$ = function Evme_$(sSelector, elScope, iterationFunction) {
    var isById = sSelector.charAt(0) === '#',
        els = null;
    
    if (isById) {
        els = [document.getElementById(sSelector.replace('#', ''))];
    } else {
        els = (elScope || Evme.Utils.getContainer()).querySelectorAll(sSelector);
    }
    
    if (iterationFunction !== undefined) {
        for (var i=0, el=els[i]; el; el=els[++i]) {
            iterationFunction.call(el, el);
        }
    }
    
    return isById? els[0] : els;
};

Evme.$remove = function Evme_$remove(sSelector, scope) {
    if (typeof sSelector === "object") {
        if (sSelector && sSelector.parentNode) {
            sSelector.parentNode.removeChild(sSelector);
        }
    } else {
        Evme.$(sSelector, scope, function itemIteration(el) {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
};


Evme.$create = function Evme_$create(tagName, attributes, html) {
    var el = document.createElement(tagName);
    
    if (attributes) {
        for (var key in attributes) {
            el.setAttribute(key, attributes[key]);
        }
    }
    
    if (html) {
        el.innerHTML = html;
    }
    
    return el;
};
