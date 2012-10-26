Evme.Screens = new function() {
    var _name = "Screens", _this = this,
        $body = null, $main = null, $screens = null, $elTabs = null, $tabs = null,
        active, first, pre = "screen_", timeoutAnimation = null;
    
    var CLASS_ACTIVE = "active",
        SEARCH_PAGE_TRANSITION_DURATION = 400;
    
    this.init = function(options) {
        !options && (options = {});
        
        $body = $("#" + Evme.Utils.getID());
        $screens = options.$screens;
        $elTabs = $("#tabs");
        $tabs = $elTabs.find("td:not(.main)");
        $main = $("#search");
        
        for (var tab in options.tabs) {
            $elTabs.find("." + tab).find("span").html(options.tabs[tab]);
        }
        
        $elTabs.find("a").bind("touchstart", function(e){
            e.stopPropagation();
            e.preventDefault();
        });
        
        $tabs.bind("touchstart", function(e){
            e.stopPropagation();
            e.preventDefault();
            
            tabClick($(this));
        });
        
        $elTabs.addClass("visible");
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.goTo = function(id, data) {
        if (id == "search") {
            _this.Search.show(data);
            return;
        }
        
        var isFirst;
        
        if (!first){
            first = id;
            isFirst = true;
        }
        
        if (active !== id) {
            window.clearTimeout(timeoutAnimation);
            
            var $current = $("#" + active),
                $new = $("#" + id);
            
            $body.removeClass("screen-" + active).addClass("screen-" + id);
            
            $new.show();
            timeoutAnimation = window.setTimeout(function(){
                $new.addClass(CLASS_ACTIVE);
                timeoutAnimation = window.setTimeout(function(){
                    $current.removeClass(CLASS_ACTIVE);
                    timeoutAnimation = window.setTimeout(function(){
                        $current.hide();
                    }, 200);
                }, 200);
            }, 10);
            
            markTabAsActive($tabs.filter("." + id));
            active = id;
            cbShowScreen(id, isFirst);
        }
    };
    
    this.first = function() {
        return first;
    };
    
    this.active = function() {
        return active;
    };
    
    this.Search = new function() {
        var isActive = false, timeoutHideSearch = null;
        
        this.show = function(data) {
            if (isActive) return;
            isActive = true;
            
            $main.addClass(CLASS_ACTIVE);
            $body.addClass("screen-search");
            
            Evme.EventHandler.trigger(_name, "searchShow", data);
        };
        
        this.hide = function() {
            if (!isActive) return;
            isActive = false;
            
            $main.removeClass(CLASS_ACTIVE);
            window.setTimeout(function(){
                $body.removeClass("screen-search");
            }, 300);
            
            Evme.EventHandler.trigger(_name, "searchHide");
            cbShowScreen(active);
            
            timeoutHideSearch = window.setTimeout(function(){
                Evme.EventHandler.trigger(_name, "searchHidden", {"active": active});
            }, SEARCH_PAGE_TRANSITION_DURATION);
        };
        
        this.active = function() {
            return isActive;
        };
    };
    
    function tabClick($tab) {
        if ($tab.hasClass("active")) {
            return;
        }
        
        var page = $tab.data("page");
        
        Evme.EventHandler.trigger(_name, "tabClick", {
            "$el": $tab,
            "page": page
        });
        
        markTabAsActive($tab);
    }
    
    function markTabAsActive($tab) {
        $tabs.filter(".active").removeClass("active");
        $tab.addClass("active");
    }
    
    function clickMain() {
        Evme.EventHandler.trigger(_name, "mainClick");
    }

    function cbShowScreen(id, isFirst) {
        Evme.EventHandler.trigger(_name, "shown", {
            "id": id,
            "isFirst": isFirst
        });
    }
};