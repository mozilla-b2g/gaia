Evme.Apps = new function() {
    var _name = "Apps", _this = this, $el = null, $list = null,
        appsArray = {}, appsDataArray = [], numberOfApps = 0,
        scroll = null, defaultIconToUse = 0,
        reportedScrollMove = false, shouldFadeBG = false,
        isSwiping = false,
    
        fadeBy = 0, showingFullScreen = false,
        timeoutAppsToDrawLater = null;
    
    var MORE_BUTTON_ID = "more-apps",
        APP_HEIGHT = "FROM CONFIG",
        DEFAULT_SCREEN_WIDTH = "FROM CONFIG",
        SCROLL_TO_BOTTOM = "CALCULATED",
        MAX_SCROLL_FADE = 200,
        FULLSCREEN_THRESHOLD = 0.8,
        MAX_APPS_CLASSES = 150,
        APPS_PER_ROW = 4,
        ICONS_STYLE_ID = "apps-icons",
        MIN_HEIGHT_FOR_MORE_BUTTON = "FROM CONFIG",
        DEFAULT_ICON_URL = "FROM CONFIG",
        TIMEOUT_BEFORE_REPORTING_APP_HOLD = 800,
        ftr = {};
        

    this.init = function(options) {
        !options && (options = {});
        
        for (var k in options.features) { ftr[k] = options.features[k] }
        
        APP_HEIGHT = options.appHeight;
        MIN_HEIGHT_FOR_MORE_BUTTON = options.minHeightForMoreButton;
        DEFAULT_SCREEN_WIDTH = options.defaultScreenWidth;
        
        $el = options.$el;
        $list = $el.find("ul");
        _this.More.init({
            "id": MORE_BUTTON_ID,
            "$button": options.$buttonMore,
            "text": options.texts.more,
            "textLoading": options.texts.moreLoading,
        });
        
        _this.Indicators.init({
            "$indicatorLoading": $("#apps-loading"),
            "$indicatorError": $("#apps-error")
        });
        
        DEFAULT_ICON_URL = options.design.defaultIconUrl[Evme.Utils.ICONS_FORMATS.Large];
        if (typeof DEFAULT_ICON_URL == "string") {
            DEFAULT_ICON_URL = [DEFAULT_ICON_URL];
        }
        
        $list.bind("touchend", function(){
            _this.timeoutHold && window.clearTimeout(_this.timeoutHold);
        });
        
        var hasFixedPositioning = Evme.Utils.hasFixedPositioning();
        
        if (hasFixedPositioning){
            var headerHeight = options.$header.height();            
            options.$header.css({
                "position": "fixed",
                "top": 0,
                "left": 0,
                "width": "100%",
                "zIndex": 100
            });
            $el.css({
                "top": 0,
                "paddingTop": headerHeight
            });
        } 
       
        scroll = new Scroll($el[0], {
            "hScroll": false,
            "checkDOMChanges": false,
            "onScrollStart": scrollStart,
            "onScrollMove": scrollMove,
            "onTouchEnd": scrollEnd
        }, hasFixedPositioning);
        
        _this.calcAppsPositions();
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.isSwiping = function() {
        return isSwiping;
    };
    
    this.getAppTapAndHoldTime = function() {
        return TIMEOUT_BEFORE_REPORTING_APP_HOLD;
    };
    
    this.load = function(options) {
        var apps = options.apps,
            offset = options.offset,
            iconsFormat = options.iconsFormat,
            onDone = options.onDone,
            isMore = offset > 0,
            hasMore = options.hasMore;
        
        if (options.clear) {
            _this.clear();
        }
        
        var missingIcons = drawApps(apps, isMore, iconsFormat, onDone);
        if (offset === 0) {
            _this.scrollToStart();
        }
        
        cbLoadComplete(apps, missingIcons);
        
        return missingIcons;
    };
    
    this.updateApps = function(options) {
        updateApps(options.apps, options.iconsFormat);
        
        return null;
    };

    this.clear = function() {
        window.clearTimeout(timeoutAppsToDrawLater);
        for (var id in appsArray) {
            appsArray[id].remove();
        }
        appsArray = {};
        appsDataArray = [];
        defaultIconToUse = 0;
        numberOfApps = 0;
        $list[0].innerHTML = "";
        _this.hasInstalled(false);
        _this.More.hide();
        _this.More.hideButton();
        _this.scrollToStart();
    };
    
    this.refreshScroll = function() {
        SCROLL_TO_BOTTOM = $el.height() - $list.height();
        
        scroll.refresh();
    };
    
    this.scrollToStart = function() {
        scroll.scrollTo(0, 0);
    };
    
    this.hasInstalled = function(isTrue) {
        if (typeof isTrue !== 'boolean') {
            return $el.hasClass("has-installed");
        }
        
        if (isTrue) {
            $el.addClass("has-installed");
        } else {
            $el.removeClass("has-installed");
        }
        
        return isTrue;
    };
    
    this.disableScroll = function() {
        scroll.disable();
    };    
    this.enableScroll = function() {
        scroll.enable();
    };
    
    this.setAppsClasses = function(iFrom, bAnimate) {
        (!iFrom || !bAnimate) && (iFrom = 0);
        
        var $apps = $list.children(),
            prefix = Evme.Utils.cssPrefix(),
            index = 0;
        
        for (var i=iFrom; i<$apps.length; i++) {
            if (bAnimate) {
                var trans = 200-((iFrom-i)*20) + "ms";
                $apps[i].style.cssText += "; " + prefix + "transition-duration: " + trans;
            }
            
            var cls = $apps[i].className;
            if ($apps[i].id.indexOf("app_") !== -1) {
                cls = cls.replace(/pos\d+/g, "");
                $apps[i].className = cls + " pos" + index;
                index++;
            }
        }
    };
    
    this.getAppsSignature = function(_apps) {
        !_apps && (_apps = appsDataArray);
        var key = "";
        for (var i=0; i<_apps.length; i++) {
            key += _apps[i].id + ",";
        }
        return key;
    };
    
    this.getElement = function() {
        return $el;
    };
    
    this.getList = function() {
        return $list;
    };

    this.getScrollPosition = function() {
        return scroll.y;
    };
    
    this.getDefaultIcon = function() {
        var defaultIcon = DEFAULT_ICON_URL[defaultIconToUse];
        
        defaultIconToUse++;
        if (defaultIconToUse >= DEFAULT_ICON_URL.length) {
            defaultIconToUse = DEFAULT_ICON_URL.length-1;
        }
        
        return defaultIcon;
    };
    
    this.removeApp = function(id) {
        if (appsArray[id]) {
            var index = getAppIndex(appsArray[id].getElement());
            
            appsArray[id].remove();
            delete appsArray[id];
            
            _this.setAppsClasses(index, true);
        }
    };
    
    this.calcAppsPositions = function() {
        var width = 320;
        
        var prefix = Evme.Utils.cssPrefix(),
            rules = "#evmeApps ul li { width: " + 100/APPS_PER_ROW + "%; }\n",
            $currStyle = $('<style type="text/css">' + rules + '</style>');
            
        $("head").append($currStyle);
        
        _this.refreshScroll();
    };
    
    this.hasSpaceForMoreButton = function(height){
        return height >= MIN_HEIGHT_FOR_MORE_BUTTON;
    };
    
    this.getAppsPerRow = function() {
        return APPS_PER_ROW;
    };
    
    this.getCurrentRowsCols = function(){
        var totalCols = numberOfApps < APPS_PER_ROW ? numberOfApps : APPS_PER_ROW;
        var totalRows = Math.ceil(numberOfApps/APPS_PER_ROW);
        return [totalCols, totalRows];
    };
    
    this.getApp = function(id) {
        return appsArray[id] || null;
    };
    
    this.getApps = function() {
        return appsArray;
    };
    
    this.getAppsAsArray = function() {
        return appsDataArray;
    };
    
    function getAppIndex($app) {
        var $apps = $list.children();
        for (var i=0; i<$apps.length; i++) {
            if ($apps[i] == $app[0]) {
                return i;
            }
        }
        
        return 0;
    }
    
    function scrollStart(e) {
        shouldFadeBG = (scroll.y === 0 && numberOfApps > 0);
        fadeBy = 0;
        reportedScrollMove = false;
    }
    
    function scrollMove(e) {
        var y = scroll.y;
        
        if (!reportedScrollMove && y == SCROLL_TO_BOTTOM) {
            reportedScrollMove = true;
            cbScrolledToEnd();
        } else if (shouldFadeBG) {
            var _fadeBy = scroll.distY/MAX_SCROLL_FADE;
            
            if (_fadeBy < fadeBy) {
                _fadeBy = 0;
                shouldFadeBG = false;
            }
            
            fadeBy = _fadeBy;
            Evme.BackgroundImage.fadeFullScreen(fadeBy);
        } else {
            Evme.BackgroundImage.fadeFullScreen(0);
        }
    }
    
    function scrollEnd(data) {
        if (shouldFadeBG && scroll.distY >= FULLSCREEN_THRESHOLD*MAX_SCROLL_FADE) {
            showingFullScreen = true;
            cbScrolledToTop();
            window.setTimeout(function(){
                showingFullScreen = false;
            }, 1000);
        } else {
            !showingFullScreen && Evme.BackgroundImage.cancelFullScreenFade();
        }
    }
    
    function drawApps(apps, isMore, iconsFormat, cb) {
        var numOfApps = 0; for (var i in appsArray){ numOfApps++; }
        
        numberOfApps += apps.length;
        for (var i=0; i<apps.length; i++) {
            appsDataArray.push(apps[i]);
        }
        
        var iconsResult = Evme.Utils.Apps.print({
            "obj": _this,
            "apps": apps,
            "numAppsOffset": numOfApps,
            "isMore": isMore,
            "iconsFormat": iconsFormat,
            "$list": $list,
            "onDone": function(appsList) {
                _this.setAppsClasses();
                
                _this.refreshScroll();
                
                for (var i=0; i<appsList.length; i++) {
                    appsArray[appsList[i].getId()] = appsList[i];
                }
                
                cb && cb();
            }
        });
        
        return iconsResult;
    }
    
    function updateApps(apps, iconsFormat) {
        window.clearTimeout(timeoutAppsToDrawLater);
        
        for (var i=0; i<apps.length; i++) {
            var appData = apps[i],
                app = appsArray[appData.id];
                
            if (app) {
                appData.icon = Evme.IconManager.parse(appData.id, appData.icon, iconsFormat);
                
                app.update(appData);
            }
        }   
        
        return true;
    }
    
    this.updateIcons = function(apps, iconsFormat) {
        var iconsResult = {
            "cached": [],
            "missing": []
        };
        
        for (var i=0; i<apps.length; i++) {
            var _app = apps[i];
            var id = _app.id;
            if (appsArray[id]) {
                _app.icon = Evme.IconManager.parse(id, _app.icon, iconsFormat);
                appsArray[id].update(_app);

                if (appsArray[id].missingIcon()) {
                    iconsResult["missing"].push(_app.icon);
                } else {
                    iconsResult["cached"].push(_app.icon);
                }
            }
        }

        return iconsResult;
    };
    
    function cbScrolledToTop() {
        Evme.EventHandler.trigger(_name, "scrollTop");
    }
    
    function cbScrolledToEnd() {
        Evme.EventHandler.trigger(_name, "scrollBottom");
    }
    
    function cbLoadComplete(data, missingIcons) {
        Evme.EventHandler.trigger(_name, "loadComplete", {
            "data": data,
            "icons": missingIcons
        });
    }

    this.More = new function() {
        var _name = "AppsMore", _this = this,
            id = "", $el = null, $button = null, loading = null,
            TEXT = "FROM CONFIG",
            TEXT_LOADING = "FROM CONFIG";

        this.init = function(options) {
            options = options || {};
            
            id = options.id;
            $button = options.$button;
            TEXT = options.text;
            TEXT_LOADING = options.textLoading;
            
            addLoadingIndicator();
        };
        
        this.show = function() {
            if (!$el) {
                visible = true;
                var $to = Evme.Apps.getList();
                
                $el = $('<li id="' + id + '" ><span></span>' + TEXT_LOADING + '</li>');
                $to.append($el);
                loading.spin($el.find("span")[0]);
                Evme.Apps.refreshScroll();
                _this.hideButton();
                Evme.EventHandler.trigger(_name, "show");
            }
        };

        this.hide = function() {
            if ($el) {
                loading.stop();
                $el.remove();
                $el = null;
                Evme.EventHandler.trigger(_name, "hide");
            }
        };
        
        this.showButton = function() {
            window.setTimeout(function(){
                $button = $('<li id="button-more">' + TEXT + '</li>');
                $button.click(cbButtonClick);
                Evme.Apps.getList().append($button);
                window.setTimeout(function(){
                    $button.addClass("visible");
                }, 0);
            }, 200);
        };
        
        this.hideButton = function() {
            $button && $button.remove();
        };
        
        function cbButtonClick() {
            Evme.EventHandler.trigger(_name, "buttonClick");
        }
        
        function addLoadingIndicator() {
            var opts = {
              "lines": 8,
              "length": 2,
              "width": 3,
              "radius": 3,
              "color": "#fff",
              "speed": 1,
              "trail": 60,
              "shadow": false
            };
            loading = new Spinner(opts);
        }
    };
    
    this.Indicators = new function() {
        var IDS = {};
        
        this.init = function(options) {
            IDS.loading = options.$indicatorLoading;
            IDS.error = options.$indicatorError;
            
            IDS.error.find("b").click(function(){
                Evme.EventHandler.trigger(_name, "errorRetryClick");
            });
        };
        
        function show($el) {
            var opts = {
              "lines": 8,
              "length": 2,
              "width": 3,
              "radius": 3,
              "color": "#fff",
              "speed": 1,
              "trail": 60,
              "shadow": false
            };
            loading = new Spinner(opts);
            loading.spin($el.find("div")[0]);
            
            $el.addClass("visible");
        }
        function hide($el) {
            $el.removeClass("visible");
        }
        
        this.loading = {
            "show": function() { show(IDS.loading); },
            "hide": function() { hide(IDS.loading); }
        };
        this.error = {
            "show": function() { show(IDS.error); },
            "hide": function() { hide(IDS.error); }
        };
    };
}

Evme.IconManager = new function() {
    var _name = "IconManager", _this = this,
        _prefix = "_icon", CACHE_VERSION = "2.6";
    
    this.clear = function() {
        var numIcons = 0;
        var icons = Evme.Storage.get();
        for (var k in icons) {
            if (k.indexOf(_prefix) == 0) {
                numIcons++;
                Evme.Storage.remove(k);
            }
        }
        return numIcons;
    };
    
    this.validateCacheVersion = function() {
        var currentVersion = Evme.Storage.get("iconsVersion");
        if (!currentVersion || currentVersion != CACHE_VERSION) {
            _this.clear();
            Evme.Storage.add("iconsVersion", CACHE_VERSION);
        }
    };
    
    this.parse = function(id, icon, iconsFormat) {
        if (icon == null) {
            // If icon from API is empty- it means it's in the user's cache
            return _this.get(id);
        } else {
            // Else add the icon to the user's cache and return it
            return _this.add(id, icon, iconsFormat);
        }
    };

    this.add = function(id, icon, iconsFormat) {
        icon.format = iconsFormat;
        icon.id = id;
        
        if (!icon.format || !icon.revision || !icon.id) {
            return icon;
        }
        
        var iconInCache = _this.get(id);
        
        if (!iconInCache || iconInCache.format < iconsFormat) {
            var sIcon = "";
            try {
                sIcon = JSON.stringify(icon);
                Evme.Storage.add(_prefix + id, sIcon);
            } catch(ex) {
                
            }
            
            return icon;
        }
        
        return iconInCache;
    };

    this.get = function(id) {
        if (id) {
            var icon = Evme.Storage.get(_prefix+id) || null;
            
            if (!icon) {
                return null;
            }
            
            // Icon in cache isn't a valid object (truncated or somthing perhaps?)
            try {
                icon = JSON.parse(icon);
            } catch(ex) {
                Evme.Storage.remove(_prefix+id);
                return null;
            }
            
            // Icon doesn't contain all the info (maybe it's from a previous version and failed removal)
            if (!icon.id || !icon.revision || !icon.format) {
                return null;
            }
            
            return icon;
        } else {
            var _icons = {};
            var icons = Evme.Storage.get();
            
            for (var k in icons) {
                if (k.indexOf(_prefix) == 0) {
                    _icons[k] = _this.get(k.replace(_prefix, ""));
                }
            }
            
            return _icons;
        }
    };
};

Evme.IconGroup = new function() {
    this.get = function(ids, callback) {
        var iconIcons = Evme.Utils.getIconGroup(),
            needToLoad = iconIcons.length,
            useShadows = true;
            
        var el = document.createElement("div");
            el.className = "apps-group";
        
        var html = '';
        for (var i=0; i<iconIcons.length; i++) {
            var app = ids[ids.length-1-i],
                icon = iconIcons[i],
                y = icon.y,
                x = icon.x,
                size = icon.size;
                
            if (typeof app != "object") {
                app = {
                    "id": app,
                };
            }
            
            if (!app.icon) {
                app.icon = Evme.IconManager.get(app.id);
            }
            
            app.icon = Evme.Utils.formatImageData(app.icon);
            
            var missingIcon = '';
            if (!app.icon) {
                missingIcon = 'iconToGet="' + app.id + '"';
            }
            
            html += '<span ' + missingIcon + ' style="' +
                        ' top: ' + y + 'px;' +
                        ' left: ' + x + 'px;' +
                        ' border-radius: ' + size/2 + 'px;' +
                        (app.icon? ' background-image: url(' + app.icon + ');' : '') +
                        ' width: ' + size + 'px;' +
                        ' height: ' + size + 'px;' +
                        (icon.rotate ? ' ' + Evme.Utils.cssPrefix() + 'transform: rotate(' + icon.rotate + 'deg);' : '') +
                        (((icon.shadowOffset || icon.shadowBlur) && useShadows)? ' ' + Evme.Utils.cssPrefix() + 'box-shadow: ' + (icon.shadowOffsetX || "0") + 'px ' + (icon.shadowOffset || "0") + 'px ' + (icon.shadowBlur || "0") + 'px 0 rgba(0, 0, 0, ' + icon.shadowOpacity + ');' : '') +
                        '"></span>';
        }
        
        el.innerHTML = html;
        
        return el;
    };
};

Evme.App = function(__cfg, __index, __isMore, parent) {
    var _name = "App", _this = this,
        cfg = {}, $el = null, index = __index, isMore = __isMore, hadID = true,
        timeTouchStart = 0, touchStartPos = null, firedHold = false, tapIgnored = false,
        DISTANCE_TO_IGNORE_AS_MOVE = 3;
        
    this.init = function(_cfg) {
        cfg = normalize(_cfg);
        
        // generate id if there was none
        if (!cfg.id) {
            hadID = false;
            cfg.id = Math.round(Math.random()*1221221) + 1;
        }
        
        // fill in default icon
        // if there's no icon and it's a bing result / official website app
        if (!cfg.icon && (!hadID || cfg.preferences.defaultIcon)){
            cfg.icon = Evme.Apps.getDefaultIcon();
        }
        
    };
    _this.init(__cfg);

    this.draw = function(_cfg) {
        if (_cfg) {
            _this.init(_cfg);
        }

        _this.remove();
        
        $el = $('<li class="new" id="app_' + cfg.id + '"></li>');
        _this.update();
        
        if (cfg.installed) {
            $el.addClass("installed");
        }
        
        if ("ontouchstart" in window) {
            $el.bind("touchstart", touchstart)
               .bind("touchmove", touchmove)
               .bind("touchend", touchend);
        } else {
            $el.bind("click", function(e) {
                firedHold = tapIgnored = false;
                touchend(e);
            });
        }
       
        return $el;
    };

    this.getHtml = function() {
        var icon = Evme.Utils.formatImageData(cfg.icon) || Evme.Apps.getDefaultIcon();

        return  '<div class="c" href="' + cfg.appUrl + '">' +
                    '<span class="thumb" style="background-image: url(\'' + icon + '\');"></span>' + 
                    '<b>' + cfg.name + '</b>' +
                '</div>';
    };
    
    this.goTo = function() {
        cbClick();
    };
    
    this.close = function() {
        $el.addClass("new");
        window.setTimeout(function(){
            _this.remove();
        }, 200);
        
        Evme.EventHandler.trigger(_name, "close", {
            "app": _this,
            "$el": $el,
            "data": cfg,
            "index": index
        });
    };

    this.update = function(_cfg) {
        if (_cfg) {
            _this.init(_cfg);
        }
        if ($el) {
            $el.html(_this.getHtml());
        }
    };

    this.getElement = function() {
        return $el;
    };
    
    this.getId = function() {
        return cfg.id;
    };
    
    this.getLink = function() {
        return cfg.appUrl;
    };
    
    this.getFavLink = function() {
        return cfg.favUrl != "@" && cfg.favUrl || cfg.appUrl;
    };
    
    this.getPref = function() {
        return cfg.preferences || "{}";
    };

    this.remove = function() {
        $el && $el.remove();
    };

    this.missingIcon = function() {
        return (!cfg.icon || cfg.icon.data == "1");
    };

    this.getIcon = function() {
        return cfg.icon;
    };
    
    this.getCfg = function() {
        return cfg;
    };
    
    this.setIcon = function(icon, bRedraw) {
        cfg.icon = icon;
        
        if (bRedraw && $el) {
            var iconUrl = Evme.Utils.formatImageData(cfg.icon) || Evme.Apps.getDefaultIcon();
            
            var sIcon = '<span class="thumb" style="background-image: url(\'' + iconUrl + '\');"></span>';
            $el.find(".c").append(sIcon);
            window.setTimeout(function() {
                if (!$el) {
                    return;
                }
                var $thumbs = $el.find(".thumb");
                if ($thumbs.length > 1) {
                    $($thumbs[0]).remove();
                }
            }, 100);
        }
    };
    
    this.getLink = function() {
        return cfg.appUrl;
    };
    
    function touchstart(e) {
        firedHold = tapIgnored = false;
        timeTouchStart = new Date().getTime();
        parent.timeoutHold = window.setTimeout(cbHold, Evme.Apps.getAppTapAndHoldTime());
        touchStartPos = getEventPoint(e);
    }
    
    function touchmove(e) {
        if (!touchStartPos) { return; }
        
        var point = getEventPoint(e),
            distance = [point[0] - touchStartPos[0], point[1] - touchStartPos[1]];
            
        if (Math.abs(distance[0]) > DISTANCE_TO_IGNORE_AS_MOVE ||
            Math.abs(distance[1]) > DISTANCE_TO_IGNORE_AS_MOVE) 
        {
            window.clearTimeout(parent.timeoutHold);
            tapIgnored = true;    
        }
    }
    
    function touchend(e) {
        if (firedHold || tapIgnored) {
            return;
        }
        
        window.clearTimeout(parent.timeoutHold);
        e.preventDefault();
        e.stopPropagation();
        
        cbClick(e);
    }
            
    function getEventPoint(e) {
        var touch = e.touches && e.touches[0] ? e.touches[0] : e,
            point = touch && [touch.pageX || touch.clientX, touch.pageY || touch.clientY];
        
        return point;
    }
    
    function normalize(cfg){
        var p = "preferences";
        if (cfg[p] && typeof cfg[p] === "string"){
            try{
                cfg[p] = JSON.parse(cfg[p]);    
            } catch(ex) {}
        }
        !cfg[p] && (cfg[p] = {});
        
        return cfg;
    }

    function cbClick(e) {
        Evme.EventHandler.trigger(_name, "click", {
            "app": _this,
            "appId": hadID ? cfg.id : 0,
            "$el": $el,
            "data": cfg,
            "index": index,
            "isMore": isMore,
            "e": e
        });
    }

    function cbHold() {
        firedHold = true;
        
        Evme.EventHandler.trigger(_name, "hold", {
            "app": _this,
            "appId": hadID ? cfg.id : 0,
            "$el": $el,
            "data": cfg,
            "index": index,
            "isMore": isMore
        });
    }
}
