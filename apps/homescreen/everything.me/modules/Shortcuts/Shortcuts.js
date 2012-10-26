Evme.Shortcuts = new function() {
    var _name = "Shortcuts", _this = this, scroll = null, scrollPage = null, itemsDesign = "FROM CONFIG", setDesign = false,
        $el = null, $list = null, $header = null, $loading = null,
        shortcuts = [], visible = false, isSwiping = false, swiped = false, customizing = false, enabled = true,
        defaultShortcuts = null, categoryPageData = {};
    
    var KEY_USER_SHORTCUTS = "userShortcuts";
    
    this.init = function(options) {
        !options && (options = {});
        
        $el = options.$el;
        $list = $el.find("#shortcuts-items");
        $loading = options.$loading;
        itemsDesign = options.design;
        
        defaultShortcuts = Evme.Storage.get(KEY_USER_SHORTCUTS) || options.defaultShortcuts;
        
        $header = $("#shortcuts-header");
        
        $("#header-category .back").bind("touchstart", _this.showCategories);
        $("#category-page-button").bind("click", clickContinueButton);
        
        scroll = new Scroll($el.find("#shortcuts-list")[0], {
            "hScroll": false,
            "checkDOMChanges": false,
            "onBeforeScrollMove": function(e){ swiped = true; },
            "onBeforeScrollEnd": function(){ swiped = false; }
        });
        scrollPage = new Scroll($("#page-category")[0], {
            "hScroll": false,
            "checkDOMChanges": false,
            "onBeforeScrollStart": function() {}
        });
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.loadDefault = function() {
        _this.load(defaultShortcuts);
    };

    this.load = function(data, cbLoadSuccess, cbLoadError) {
        if (!data || !("shortcuts" in data)){
            cbLoadError && cbLoadError(data);
        } else {
            Evme.Storage.set(KEY_USER_SHORTCUTS, data);
            
            var shortcuts = data.shortcuts,
                icons = data.icons;
                
            for (var id in icons) {
                Evme.IconManager.add(id, icons[id], Evme.Utils.getIconsFormat());
            }
            
            for (var i=0; i<shortcuts.length; i++) {
                var appIds = shortcuts[i].appIds,
                    apps = [];
                
                for (var j=0; j<appIds.length; j++) {
                    apps.push({
                        "id": appIds[j],
                        "icon": icons[appIds[j]]
                    });
                }
                
                shortcuts[i].appIds = apps;
            }
            
            setShortcutsDesign();
            
            _this.clear();
            _this.draw(shortcuts);
            cbLoadSuccess && cbLoadSuccess(_this.get());
            cbLoaded();
        }
    };
    
    this.add = function(_shortcuts) {
        if (!(_shortcuts instanceof Array)) {
            _shortcuts = [_shortcuts];
        }
        
        var $last = $list.find(".shortcut.add"),
            added = [];
            
        for (var i=0; i<_shortcuts.length; i++) {
            var shortcut = new Evme.Shortcut();
            var $el = shortcut.init(_shortcuts[i], i, click);
            
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
            var shortcut = new Evme.Shortcut();
            var $el = shortcut.init(_shortcuts[i], i, click, dragStart, remove);
            
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
    
    this.showPage = function(data) {
        categoryPageData = data || {};
        
        !categoryPageData.query && (categoryPageData.query = "");
        !categoryPageData.title && (categoryPageData.title = categoryPageData.query);
        !categoryPageData.options && (categoryPageData.options = []);
        
        $("#category-page-name").html(categoryPageData.title || categoryPageData.query);
        
        if (categoryPageData.button) {
            $("#category-page-button").html(categoryPageData.button).addClass("visible");
        } else {
            $("#category-page-button").removeClass("visible")
        }
        
        var html = '';
        for (var i=0; i<categoryPageData.options.length; i++) {
            var o = categoryPageData.options[i];
            
            html += '<li class="category-item">' +
                        '<form method="get" action="" data-type="' + o.type + '">' +
                            '<label>' + (o.title || "") + '</label>' +
                            '<input type="text" value="" class="textinput" name="search_' + o.type + '" id="search_' + o.type + '" placeholder="' + (o.placeholder || "") + '" />' +
                            '<em class="arrow-next"></em>' +
                        '</form>' +
                    '</li>';
        }
        $("#category-options").html(html);
        
        $("#category-options input").bind("focus", function(e) {
            $("#" + Evme.Utils.getID()).addClass("mode-edit");
        }).bind("blur", function(e) {
            $("#" + Evme.Utils.getID()).removeClass("mode-edit");
        });
        $("#category-options form").bind("submit", function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            categoryQuerySearch($(this));
        });
        $("#category-options em").bind("click", function(e) {
            categoryQuerySearch($(this).parent());
        });
        
        $("#page-categories, #header-categories").removeClass("active");
        $("#page-category, #header-category").addClass("active");
        $("#shortcuts").addClass("page-category").removeClass("page-categories");
        
        scrollPage.refresh();
        
        Evme.EventHandler.trigger("Shortcuts", "categoryPageShow", {
            "query": categoryPageData.title
        });
    };
    
    this.showCategories = function(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        $("#page-category, #header-category").removeClass("active");
        $("#page-categories, #header-categories").addClass("active");
        $("#shortcuts").addClass("page-categories").removeClass("page-category");
    };
    
    this.setCustomTitle = function(title) {
        $("#shortcuts-custom-title").remove();
        var $elTitle = $('<li id="shortcuts-custom-title">' + title + '</li>');
        $header.append($elTitle);
        
        
        $header.children().removeClass("active");
        $elTitle.addClass("active");
    };
    
    this.removeCustomTitle = function() {
        _this.showCategories();
        $("#shortcuts-custom-title").removeClass("active");
    };
    
    function categoryQuerySearch($form) {
        var type = $form.data("type"),
            $input = $form.find("input"),
            query = $input.val();
            
        $input.blur();
        
        if (query) {
            Evme.EventHandler.trigger(_name, "searchCategoryPage", {
                "query": query,
                "type": type
            });
        }
    }
    
    function clickContinueButton(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var query = categoryPageData.query;
        
        Evme.EventHandler.trigger(_name, "clickContinue", {
            "query": query
        });
    }
    
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
            shortcuts[i].remove();
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
    
    function dragStart(data) {
        Evme.EventHandler.trigger(_name, "dragStart", {
            "e": data.e,
            "shortcut": data.shortcut
        });
    }
    
    function click(data) {
        if (_this.swiped() || !_this.enabled()) {
            return;
        }
        
        Evme.EventHandler.trigger(_name, "click", data);
    }
    
    function remove(data) {
        if (_this.swiped() || !_this.enabled()) {
            return;
        }
        
        Evme.EventHandler.trigger(_name, "remove", data);
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
        onClick = null, onDragStart = null, onRemove = null, alreadyRemoved = false, tapIgnored = false,
        timeoutDrag = null, touchStartPos = null, DISTANCE_TO_IGNORE_AS_MOVE = 5, DRAG_THRESHOLD = 100;
    
    this.init = function(_cfg, _index, _onClick, _onDragStart, _onRemove) {
        cfg = _cfg;
        index = _index;
        query = cfg.query;
        onClick = _onClick;
        onRemove = _onRemove;
        onDragStart = _onDragStart;
        
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
        
        $el.bind("touchstart", touchstart)
           .bind("touchmove", touchmove)
           .bind("click", clicked);
           
        //$el.find(".remove").bind("click", removed);
        
        return $el;
    };
    
    this.remove = function() {
        if ($el) {
            $el.addClass("remove");
            window.setTimeout(function() {
                $el.remove();
                Evme.Shortcuts.refreshScroll();
            }, 200);
        }
    };
    
    this.getData = function() { return cfg; };
    this.getElement = function() { return $el; };
    this.getThumb = function() { return $thumb; };
    this.getId = function() { return id; };
    this.getQuery = function() { return query; };
    this.isCustom = function() { return cfg.isCustom; };
    
    this.setImage = function(shortcutIcons) {
        if ($thumb && shortcutIcons && shortcutIcons.length > 0) {
            var $iconGroup = Evme.IconGroup.get(shortcutIcons);
            $thumb.append($iconGroup);
        }
    };
    
    function touchstart(e) {
        if (onDragStart) {
            timeoutDrag = window.setTimeout(function(){
                onDragStart && onDragStart({
                    "e": e,
                    "shortcut": _this
                });
            }, DRAG_THRESHOLD);    
        }
        
        tapIgnored = false;
        touchStartPos = getEventPoint(e);
    }
    
    function touchmove(e) {
        if (!touchStartPos) return;
        
        var point = getEventPoint(e),
            distanceX = [point[0] - touchStartPos[0]];
            
        if (Math.abs(distanceX[0]) > DISTANCE_TO_IGNORE_AS_MOVE) {
            tapIgnored = true;
        }
    }
    
    function clicked() {
        if (tapIgnored) return;

        window.clearTimeout(timeoutDrag);
        
        onClick({
            "shortcut": _this,
            "data": cfg,
            "$el": $el,
            "index": index
        });
    }
    
    function removed(e) {
        e.preventDefault();
        e.stopPropagation();
        
        window.clearTimeout(timeoutDrag);
        if (alreadyRemoved) {
            return;
        }
        
        alreadyRemoved = true;
        onRemove({
            "shortcut": _this,
            "data": cfg,
            "$el": $el,
            "index": index
        });
    }
    
    function getEventPoint(e) {
        var touch = e.touches && e.touches[0] ? e.touches[0] : e,
            point = touch && [touch.pageX || touch.clientX, touch.pageY || touch.clientY];
        
        return point;
    }
};
