Evme.Shortcuts = new function() {
    var _name = "Shortcuts", _this = this, scroll = null, itemsDesign = "FROM CONFIG", setDesign = false,
        $el = null, $list = null, $loading = null, loadedResponse = null,
        shortcuts = [], visible = false, isSwiping = false, swiped = false, customizing = false, enabled = true,
        categoryPageData = {};
    
    this.init = function(options) {
        !options && (options = {});
        
        $el = options.$el;
        $list = $el.find("#shortcuts-items");
        $loading = options.$loading;
        itemsDesign = options.design;
        
        scroll = new Scroll($el.find("#shortcuts-list")[0], {
            "hScroll": false,
            "checkDOMChanges": false,
            "onBeforeScrollMove": function(e){ swiped = true; $el.addClass("swiping"); },
            "onBeforeScrollEnd": function(){ swiped = false; $el.removeClass("swiping"); }
        });
        
        $el.bind("click", onListClick);
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.load = function(data) {
        loadedResponse = JSON.parse(JSON.stringify(data));
        
        var _shortcuts = data.shortcuts.splice(0),
            icons = data.icons;
            
        for (var id in icons) {
            Evme.IconManager.add(id, icons[id], Evme.Utils.getIconsFormat());
        }
        
        for (var i=0; i<_shortcuts.length; i++) {
            var appIds = _shortcuts[i].appIds,
                apps = [];
            
            for (var j=0; j<appIds.length; j++) {
                apps.push({
                    "id": appIds[j],
                    "icon": icons[appIds[j]]
                });
            }
            
            _shortcuts[i].appIds = apps;
        }
        
        setShortcutsDesign();
        
        _this.clear();
        _this.draw(_shortcuts);
        cbLoaded();
    };
    
    this.getLoadedResponse = function() {
        return loadedResponse;
    };
    
    this.add = function(_shortcuts) {
        if (!(_shortcuts instanceof Array)) {
            _shortcuts = [_shortcuts];
        }
        
        var $last = $list.find(".shortcut.add"),
            added = [];
            
        for (var i=0; i<_shortcuts.length; i++) {
            var shortcut = new Evme.Shortcut();
            var $el = shortcut.init(_shortcuts[i], i);
            
            if ($el) {
                $el.addClass("remove");
                added.push(shortcut);
                shortcuts.push(shortcut);
                
                $last.before($el);
                
                window.setTimeout(function(){
                    $el.removeClass("remove");
                }, 0);
            }
        }
        
        if (added && added.length > 0) {
            _this.refreshScroll();
            window.setTimeout(function(){
                scroll.scrollToElement(added[added.length-1].getElement()[0]);
            }, 100);
        }
        
        return added;
    };
    
    this.scrollToBottom = function(callback) {
        var max = $list.parent().height(),
            height = $list.height();
            
        if (height > max) {
            window.setTimeout(function(){
                scroll.scrollTo(0, max - height, 400);
                window.setTimeout(function(){
                    callback && callback();
                }, 300);
            }, 100);
        } else {
            callback && callback();
        }
    };
    
    this.isSwiping = function() {
        return isSwiping;
    };

    this.draw = function(_shortcuts, icons) {
        for (var i=0; i<_shortcuts.length; i++) {
            var shortcut = new Evme.Shortcut(),
                $el = shortcut.init(_shortcuts[i], i);
            
            if ($el) {
                shortcuts.push(shortcut);
                $list.append($el);
            }
        }
        
        _this.refreshScroll();
    };
    
    this.get = function() {
        return shortcuts;
    };
    
    this.getQueries = function() {
        var list = [];
        for (var i=0; i<shortcuts.length; i++) {
            list.push(shortcuts[i].getQuery());
        }
        return list;
    };
    
    this.orderByElements = function() {
        var _shortcuts = [],
            $items = $list.children(".shortcut");
        
        for (var i=0; i<$items.length; i++) {
            var query = $items[i].getAttribute("query");
            for (var j=0; j<shortcuts.length; j++) {
                if (shortcuts[j].getQuery() == query) {
                    _shortcuts.push(shortcuts[j]);
                    break;
                }
            }
        }
        
        shortcuts = _shortcuts;
    };
    
    this.remove = function(shortcut) {
        var id = shortcut.getId();
        
        for (var i=0; i<shortcuts.length; i++) {
            if (shortcuts[i].getId() == id) {
                shortcuts.splice(i, 1);
                return true;
            }
        }
        
        return false;
    };
    
    this.refreshScroll = function() {
        scroll && scroll.refresh();
    };
    this.enableScroll = function() {
        scroll && scroll.enable();
    };
    this.disableScroll = function() {
        scroll && scroll.disable();
    };
    this.scrollTo = function(x, y, duration) {
        scroll && scroll.scrollTo(x, y, duration);
    };
    this.scrollY = function() {
        return scroll.y;
    };
    
    this.customizing = function() {
        return customizing;
    };
    this.customize = function() {
        customizing = true;
    };
    this.doneCustomize = function() {
        customizing = false;
    };

    this.clear = function() {
        for (var i=0; i<shortcuts.length; i++) {
            shortcuts[i].remove(null, true);
        }
        shortcuts = [];
        $list.empty();
    };
    
    function toggle(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (visible) {
            _this.hide(true);
        } else {
            _this.show(true);
        }
    }

    this.show = function(bReport) {
        visible = true;
        window.setTimeout(_this.refreshScroll, 100);
        cbShow(bReport);
    };

    this.hide = function(bReport) {
        visible = false;
        cbHide(bReport);
    };
    
    this.getElement = function() {
        return $list;
    };
    
    this.swiped = function() {
        return swiped;
    };
    
    this.enable = function() {
        enabled = true;
    };
    this.disable = function() {
        enabled = false;
    };
    this.enabled = function() {
        return enabled;
    };
    
    function setShortcutsDesign() {
        if (setDesign) return;
        
        var style = "#" + Evme.Utils.getID() + " .shortcut { width: " + 100/itemsDesign.itemsPerRow + "%; } \n";
        
        var $style = $('<style type="text/css">' + style + '</style>');
        
        $("#" + Evme.Utils.getID()).append($style);
        setDesign = true;
    }
    
    function onListClick(e) {
        if (e.originalTarget.id == 'shortcuts-list') {
            Evme.EventHandler.trigger(_name, "listClick", {
            });
        }
    }
    
    function cbShow(bReport) {
        Evme.EventHandler.trigger(_name, "show", {
            "shortcuts": shortcuts,
            "report": (bReport === true)
        });
    }
    
    function cbHide(bReport) {
        Evme.EventHandler.trigger(_name, "hide", {
            "shortcuts": shortcuts,
            "report": (bReport === true)
        });
    }
    
    function cbLoaded() {
        Evme.EventHandler.trigger(_name, "load", {
            "shortcuts": shortcuts
        });
    }
}

Evme.Shortcut = function() {
    var _name = "Shortcut", _this = this, cfg = null, id = "id"+Math.round(Math.random()*10000),
        $el = null, $thumb = null,  index = -1, query = "", image = "", imageLoadingRetry = 0,
        timeoutHold = null, removed = false,
        posStart = [0, 0], timeStart = 0, fingerMoved = true;
        
    var THRESHOLD = 5,
        TIME_BEFORE_CONTEXT = 600;
    
    this.init = function(_cfg, _index) {
        cfg = _cfg;
        index = _index;
        query = cfg.query;
        
        if (!cfg.query) {
            return null;
        }
        
        $el = $('<li class="shortcut">' + 
                    '<span class="thumb"></span>' +
                    '<b>' + cfg.query + '</b>' +
                    '<span class="remove"></span>' +
                '</li>');
        $el.attr("query", query);
        $thumb = $el.find(".thumb");
        
        _this.setImage(cfg.appIds);
        if ("ontouchstart" in window) {
            $el.bind("touchstart", onTouchStart);
            $el.bind("touchmove", onTouchMove);
            $el.bind("touchend", onTouchEnd);
        } else {
            $el.bind("click", function(e){
                fingerMoved = false;
                onTouchEnd(e);
            });
        }
        $el.find(".remove").bind("click", function(e) {
            _this.remove(e);
            onRemove(e);
        });
        
        return $el;
    };
    
    this.setImage = function(shortcutIcons) {
        if ($thumb && shortcutIcons && shortcutIcons.length > 0) {
            var $iconGroup = Evme.IconGroup.get(shortcutIcons);
            $thumb.append($iconGroup);
        }
    };
    
    this.remove = function(e) {
        if (removed) return;
        
        removed = true;
        $el && $el.addClass("remove");
        
        window.setTimeout(function(){
            $el && $el.remove();
        }, 300);
    };
    
    this.getData = function() { return cfg; };
    this.getElement = function() { return $el; };
    this.getThumb = function() { return $thumb; };
    this.getId = function() { return id; };
    this.getQuery = function() { return query; };
    this.isCustom = function() { return cfg.isCustom; };
    
    function onRemove(e) {
        Evme.EventHandler.trigger(_name, "remove", {
            "shortcut": _this,
            "data": cfg,
            "index": index,
            "e": e
        });
    }
    
    function onTouchStart(e) {
        e = (e.touches || [e])[0];
        
        fingerMoved = false;
        
        posStart = [e.pageX, e.pageY];
        timeStart = Date.now();
        
        window.clearTimeout(timeoutHold);
        timeoutHold = window.setTimeout(fireLongTap, TIME_BEFORE_CONTEXT);
    }
    
    function onTouchMove(e) {
        e = (e.changedTouches || [e])[0];
        
        var p = [e.pageX, e.pageY];
        if (Math.abs(p[0] - posStart[0]) > THRESHOLD || Math.abs(p[1] - posStart[1]) > THRESHOLD) {
            fingerMoved = true;
            window.clearTimeout(timeoutHold);
        }
    }
    
    function onTouchEnd(e) {
        window.clearTimeout(timeoutHold);
        if (fingerMoved) return;
        fingerMoved = false;
        
        Evme.EventHandler.trigger(_name, "click", {
            "shortcut": _this,
            "data": cfg,
            "query": cfg.query,
            "$el": $el,
            "index": index,
            "e": e
        });
    }
    
    function fireLongTap(e) {
        window.clearTimeout(timeoutHold);
        if (fingerMoved) return;
        fingerMoved = false;
        
        Evme.EventHandler.trigger(_name, "hold", {
            "shortcut": _this,
            "data": cfg,
            "$el": $el,
            "index": index,
            "e": e
        });
    }
};