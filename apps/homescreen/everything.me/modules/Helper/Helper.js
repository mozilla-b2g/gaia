Evme.Helper = new function() {
    var _name = "Helper", _this = this,
        $el = null, $wrapper = null, $elTitle = null, $list = null, $tip = null, $loading = null,
        _data = {}, defaultText = "", iscroll = null, currentDisplayedType = "", timeoutShowRefine = null,
        queryForSuggestions = "", lastVisibleItem, clicked = false, titleVisible = false,
        ITEM_WIDTH_ADDITION = 0, TOTAL_WIDTH_ADDITION = 20, MIN_WIDTH = 308, TYPE_ELEMENT_OFFSET = 86,
        TITLE_PREFIX = "FROM CONFIG",
        TITLE_PREFIX_EMPTY = "FROM CONFIG",
        TITLE_SHORTCUTS = "FROM CONFIG",
        TITLE_HISTORY = "FROM CONFIG",
        TITLE_DID_YOU_MEAN = "FROM CONFIG",
        TITLE_REFINE = "FROM CONFIG";
        
    var bShouldAnimate = true, ftr = {};
           
    this.init = function(options) {
        !options && (options = {});        
        
        // features
        if (options.features){
            for (var i in options.features) {
                ftr[i] = options.features[i]
            }
        }

        defaultText = options.texts.defaultText;
        $el = options.$el;
        $wrapper = $el.parent();
        $elTitle = options.$elTitle;
        $tip = options.$tip;
        $list = $el.find("ul");
        $loading = $wrapper.find(".loading");
        
        TITLE_SHORTCUTS = options.texts.titleShortcuts;
        TITLE_HISTORY = options.texts.titleHistory;
        TITLE_DID_YOU_MEAN = options.texts.titleDidYouMean;
        TITLE_REFINE = options.texts.titleRefine;
        
        TITLE_PREFIX = options.texts.titlePrefix || "Everything";
        TITLE_PREFIX_EMPTY = options.texts.titlePrefixEmpty || TITLE_PREFIX;

        $list[0].addEventListener("click", elementClick, false);
        $elTitle[0].addEventListener("click", titleClicked, false);
        
        _this.reset();

        // iscroll options
        var iscrollOptions = {"vScroll": false};
        
        iscroll = new iScroll($el[0], iscrollOptions);
        
        // feature animation disable
        if (ftr.Animation === false){
            $wrapper.addClass("anim-disabled");
        }
        if (ftr.Suggestions && ftr.Suggestions.Animation !== undefined){
            var c = "anim-sugg-";
                c += ftr.Suggestions.Animation ? "enabled" : "disabled";
            $wrapper.addClass(c);
        }

        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.reset = function() {
        _data = {
            "suggestions": [],
            "spelling": [],
            "types": [],
            "history": [],
            "queries": {
                "input": "",
                "parsed": ""
            }
        };
        
        _this.setTitle();
    };
    
    this.empty = function() {
        $list[0].innerHTML = "";
        $list.removeClass("default");
    };
    
    this.clear = function() {
        if (defaultText) {
            _this.showText(defaultText);
        } else {
            _this.empty();
        }
        
        Evme.EventHandler.trigger(_name, "clear");
    };
    
    this.getElement = function() {
        return $el;
    };
    this.getList = function() {
        return $list;
    };
    
    this.enableCloseAnimation = function() {
        $wrapper.addClass("animate");
    };
    this.disableCloseAnimation = function() {
        $wrapper.removeClass("animate");
    };
    this.animateLeft = function(callback) {
        $el.addClass("animate");
        window.setTimeout(function(){
            $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(-" + $el.width() + "px)");
            window.setTimeout(function(){
                $el.removeClass("animate");
                window.setTimeout(function(){
                    callback && callback();
                }, 50);
            }, 400);
        }, 50);
    };
    this.animateRight = function(callback) {
        $el.addClass("animate");
        window.setTimeout(function(){
            $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(" + $el.width() + "px)");
            window.setTimeout(function(){
                $el.removeClass("animate");
                window.setTimeout(function(){
                    callback && callback();
                }, 50);
            }, 400);
        }, 50);
    };
    this.animateFromRight = function() {
        $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(" + $el.width() + "px)");
        window.setTimeout(function(){
            $el.addClass("animate");
            window.setTimeout(function(){
                $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(0)");
                window.setTimeout(function(){
                    $el.removeClass("animate");
                }, 400);
            }, 20);
        }, 20);
    };
    this.animateFromLeft = function() {
        $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(-" + $el.width() + "px)");
        window.setTimeout(function(){
            $el.addClass("animate");
            window.setTimeout(function(){
                $el.css(Evme.Utils.cssPrefix() + "transform", "translateX(0)");
                window.setTimeout(function(){
                    $el.removeClass("animate");
                }, 400);
            }, 20);
        }, 20);
    };
    
    this.load = function(inputQuery, parsedQuery, suggestions, spelling, types) {
        inputQuery = inputQuery || "";
        
        types = types || [];
        
        (typeof suggestions !== "undefined") && (_data.suggestions = suggestions);
        (typeof spelling !== "undefined") && (_data.spelling = spelling);
        (typeof types !== "undefined") && (_data.types = types);
        
        _data.queries.input = inputQuery;
        _data.queries.parsed = parsedQuery;
        
        if (_data.suggestions.length > 4) {
            _data.suggestions = _data.suggestions.slice(0, 4);
        }
        
         var _type = (_data.types && _data.types.length >= 1)? _data.types[0].name : "";
         
        _this.setTitle(parsedQuery, _type);
        
        _this.empty();
        
        cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types);
    };
    
    this.loadSuggestions = function(suggestions) {
        _this.reset();
        _this.load("", "", suggestions);
    };
    
    this.loadHistory = function(history) {
        _data.history = history;
    };
    
    this.showSuggestions = function(querySentWith) {
        querySentWith && (queryForSuggestions = querySentWith);
        
        Evme.EventHandler.trigger(_name, "showSuggestions", {
            "data": _data.suggestions
        });
        
        if (_data.suggestions.length > 0) {
            if (_data.suggestions.length > 4) {
                _data.suggestions = _data.suggestions.slice(0, 4);
            }
            _this.showList(_data.suggestions);
        }
    };
    
    this.getSuggestionsQuery = function() {
        return queryForSuggestions;
    };
    
    this.showHistory = function() {
        _this.disableAnimation();
        Evme.EventHandler.trigger(_name, "showHistory", {
            "data": _data.history
        });
        _this.showList(_data.history, TITLE_HISTORY, "history");
    };
    
    this.showSpelling = function() {
        _this.disableAnimation();
        Evme.EventHandler.trigger(_name, "showSpelling", {
            "data": _data.spelling
        });
        
        var list = _data.spelling;
        if (list.length == 0) {
            list = _data.types;
        }
        
        _this.showList(list, TITLE_DID_YOU_MEAN, "didyoumean");
        
        if (list.length > 0) {
            _this.flash();
        }
    };
    
    this.loadRefinement = function(types) {
        _data.types = types;
    };
    
    this.showRefinement = function() {
        _this.enableCloseAnimation();
        _this.disableAnimation();
        
        Evme.EventHandler.trigger(_name, "showRefinement", {
            "data": _data.types
        });
        
        _this.showList(_data.types, TITLE_REFINE, "refine");
    };
    
    this.showText = function(text) {
        _this.enableCloseAnimation();
        _this.disableAnimation();
        
        Evme.EventHandler.trigger(_name, "showText", {
            "text": text
        });
        
        _this.showList([], text, "text");
    };
    
    this.showList = function(_items, label, addClass) {
        !addClass && (addClass = "");
        currentDisplayedType = addClass;
        
        var items = _items.slice(0);
        _this.empty();
        
        if (_data.queries.input) {
            $list.removeClass("default");
        } else {
            $list.addClass("default");
        }
        
        $list.attr("class", addClass);
        
        if (label) {
            items.splice(0, 0, label);
        }
        
        var html = "";
        for (var i=0; i<items.length; i++) {
            html += getElement(items[i], i, addClass);
        }
        $list[0].innerHTML = html;
        
        if (label) {
            $($list.children()[0]).addClass("label");
        }
        
        _this.refreshIScroll();
        
        if (bShouldAnimate) {
            _this.disableAnimation();
            animateSuggestions();
        }
        
        _this.Loading.hide();
        
        Evme.EventHandler.trigger(_name, "show", {
            "type": addClass,
            "data": items
        });
    };
    
    this.flash = function() {
        $wrapper.removeClass("flash");
        $tip.removeClass("flash");
        window.setTimeout(function() {
            $wrapper.addClass("flash");
            $tip.addClass("flash");
            window.setTimeout(function(){
                $wrapper.removeClass("flash");
                $tip.removeClass("flash");
            }, 4000);
        }, 0);
    };
    
    this.refreshIScroll = function() {
        MIN_WIDTH = $el.width();
        setWidth();
        iscroll.refresh();
        iscroll.scrollTo(0,0);
    };

    this.setTitle = function(title, type) {
        if (!title) {
            $elTitle[0].innerHTML = '<b>' + TITLE_PREFIX_EMPTY + '</b>';
            return;
        }
        
        title = title.replace(/</g, "&lt;");
        var currentTitle = $elTitle.find(".query").text();
        var currentType = (""+$elTitle.find(".type").text()).replace(/\(\)/g, "");
        
        // if trying to set the title to the one already there, don't doanything
        if (currentTitle == title) {
            if ((!type && currentType) || type == currentType) {
                return;
            }
        }
        
        var html =  '<b>' + TITLE_PREFIX + '</b>' +
                    '<span class="query">' + title + '</span>' +
                    '<em class="type">(' + (type || "") + ')</em>';
        
        $elTitle[0].innerHTML = html;
        
        if (type) {
            $elTitle.removeClass("notype");
        } else {
            $elTitle.addClass("notype");
        }
        
        return html;
    };
    
    this.showTitle = function() {
        if (titleVisible) return;
        
        $wrapper.addClass("close");
        $elTitle.removeClass("close");
        _this.hideTip();
        window.setTimeout(_this.disableCloseAnimation, 50);
        
        titleVisible = true;
    };
    
    this.hideTitle = function() {
        if (!titleVisible) return;
        
        $wrapper.removeClass("close");
        $elTitle.addClass("close");
        window.setTimeout(_this.disableCloseAnimation, 50);
        _this.refreshIScroll();
        
        titleVisible = false;
    };

    this.selectItem = function(index) {
        $($list.children()[index]).click();
    };
    
    this.getList = function() {
        return $list;
    };
    
    this.getData = function() {
        return _data;
    };
    
    this.enableAnimation = function() {
        bShouldAnimate = true;
    };
    this.disableAnimation = function() {
        bShouldAnimate = false;
    };
    
    this.showTip = function() {
        $tip.show();
    };
    
    this.hideTip = function() {
        $tip.hide();
    };
    
    this.addLink = function(text, callback, isBefore) {
        var $link = $('<li class="link">' + text + '</li>');
        $link.bind("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            callback(e);
        });
        
        if (isBefore) {
            $list.prepend($link);
        } else {
            $list.append($link);
        }
        
        _this.refreshIScroll();
        
        return $link;
    };
    
    this.addText = function(text) {
        var $el = $('<li class="text">' + text + '</li>');
        $el.bind("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
        });
        $list.append($el);
        
        _this.refreshIScroll();
    };
    
    this.Loading = new function() {
        var loading = null;
        
        this.show = function() {
            if (!$loading) {
                return;
            }
            
            if (!loading) {
                var opts = {
                  "lines": 8,
                  "length": 3,
                  "width": 2,
                  "radius": 3,
                  "color": "#333",
                  "speed": 1,
                  "trail": 60,
                  "shadow": false
                };
                loading = new Spinner(opts).spin($loading[0]);
            } else {
                loading.spin();
            }
            
            $loading.addClass("visible");
        };
        
        this.hide = function() {
            if (!$loading || !loading) {
                return;
            }
            
            $loading.removeClass("visible");
            loading.stop();
        };
    };
    
    function animateSuggestions() {
        $list.removeClass("anim");
        $list.addClass("start");
        window.setTimeout(function(){
            $list.addClass("anim");
            window.setTimeout(function(){
                $list.removeClass("start");
                window.setTimeout(function(){
                    $list.removeClass("anim");
                    
                    if (currentDisplayedType == "" && !Evme.Utils.Cookies.get("fs")) {
                        _this.flash();
                    }
                }, 50);
            }, 50);
        }, 50);
    }

    function removeElement(text) {
        if (!text) {
            return;
        }
        
        var removed = false;
        var $items = $list.children();
        
        text = text.toLowerCase();
        for (var i=0; i<$items.length; i++) {
            var $item = $($items[i]);
            var sugg = ($item.data("suggestion") || "").toLowerCase();
            
            if (sugg.replace(/\[\]/gi, "") == text.replace(/\[\]/gi, "")) {
                $item.remove();
                removed = true;
            }
        }

        return removed;
    }

    function getElement(item, index, source) {
        var id = "";
        var isSmartObject = (typeof item == "object");
        
        var text = item;
        if (isSmartObject) {
            id = item.id;
            text = item.name;
        }
        
        if (!text) {
            return;
        }
        
        text = text.replace(/</g, "&lt;");
        
        var content = text.replace(/\[/g, "<b>").replace(/\]/g, "</b>");
        
        
        // Pass . so that Brain will know not to search for it
        if (isSmartObject && !item.type && item.type != "") {
            text = ".";
        }
        
        return '<li data-index="' + index + '" data-suggestion="' + text.replace(/"/g, "&quot;") + '" data-source="' + source + '" data-type="' + id + '">' + content + '</li>';
    }

    function elementClick(e) {
        e.stopPropagation();
        e.preventDefault();
        
        clicked = true;
        window.setTimeout(function(){
            clicked = false;
        }, 500);
        
        var $li = e.originalTarget || e.target;
        
        while ($li && $li.nodeName !== "LI") {
            $li = $li.parentNode;
        }
        if (!$li) {
            clicked = false;
            return;
        }
        
        $li = $($li);
        if ($li.hasClass("label") || $li.hasClass("text")) {
            return;
        }
        
        var val = $li.attr("data-suggestion"),
            valToSend = (val || "").replace(/[\[\]]/g, "").toLowerCase(),
            index = $li.attr("data-index"),
            source = $li.attr("data-source"), 
            type = $li.attr("data-type");
            
        if (val) {
            cbClick($li, index, isVisibleItem(index), val, valToSend, source, type);
        }
    }
    
    function titleClicked(e){
        e.preventDefault();
        e.stopPropagation();
        
        if ($elTitle.find(".query").length == 0) {
            return;
        }
        
        window.setTimeout(function(){
            if (!clicked) {
                _this.hideTitle();
                _this.showRefinement();
            }
        }, 100);
    }
    
    function isVisibleItem(index){
        return index <= lastVisibleItem;
    }

    function setWidth() {
        var width = 0,
            $children = $list.children();
        
        $list.css("width", "5000px");
        
        lastVisibleItem = 0;
        for (var i=0; i<$children.length; i++) {
            if (width < MIN_WIDTH){
                lastVisibleItem = i;
            }
            
            if ($children[i].className.indexOf("history") == -1) {
                width += $children[i].offsetWidth+ITEM_WIDTH_ADDITION;
            }
        }
        
        width += TOTAL_WIDTH_ADDITION;
        
        width = Math.max(MIN_WIDTH, width);
        
        $list.css("width", width + "px");
    }

    function cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types) {
        Evme.EventHandler.trigger(_name, "load", {
            "suggestions": suggestions,
            "spelling": spelling,
            "types": types,
            "query": inputQuery
        });
    }
    
    function cbClick($li, index, isVisibleItem, originalValue, val, source, type) {
        Evme.EventHandler.trigger(_name, "click", {
            "$element": $li,
            "originalValue": originalValue,
            "value": val,
            "source": source,
            "type": type,
            "index": index,
            "visible": isVisibleItem
        });
    }
}