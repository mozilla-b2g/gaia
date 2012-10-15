Evme.ShortcutsCustomize = new function() {
    var _name = "ShortcutsCustomize", _this = this,
        $el = null, $title = null, $subTitle = null, $list = null, $buttonDone = null,
        scroll = null, numSelectedStartedWith = 0, numSuggestedStartedWith = 0, clicked = null, moved = null,
        
        title = "FROM CONFIG",
        titleCustomize = "FROM CONFIG",
        subTitle = "FROM CONFIG",
        buttonDone = "FROM CONFIG",
        buttonDoneSaving = "FROM CONFIG";
        
    this.init = function(options) {
        $parent = options.$parent;
        
        title = options.texts.title;
        titleCustomize = options.texts.titleCustomize;
        subTitle = options.texts.subTitle;
        subTitleCustomize = options.texts.subTitleCustomize;
        buttonDone = options.texts.buttonDone;
        buttonDoneSaving = options.texts.buttonDoneSaving;
        
        $el = $('<div id="shortcuts-favorites">' +
                    '<h2></h2>' +
                    '<b class="pbutton done"></b>' +
                    '<div class="scroll-wrapper">' +
                        '<div>' +
                            '<div class="subtitle"></div>' +
                            '<ul></ul>' +
                        '</div>' +
                    '</div>' +
                '</div>');
                
        $title = $el.find("h2");
        $subTitle = $el.find(".subtitle");
        
        $list = $el.find("ul");
        $list
            .bind("touchend", touchend)
            .bind("touchmove", touchmove);
        
        $buttonDone = $el.find(".done");        
        $buttonDone.bind("click", done);
        
        $parent.append($el);
        
        scroll = new Scroll($el.find(".scroll-wrapper")[0], {
            "hScroll": false,
            "checkDOMChanges": false
        });
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.show = function(isFirstScreen) {
        if (isFirstScreen) {
            $title.html(title);
            $subTitle.html(subTitle);
        } else {
            $title.html(titleCustomize);
            $subTitle.html(subTitleCustomize);
        }
        
        $buttonDone.html(buttonDone);
        
        $el.addClass("visible");
        
        Evme.EventHandler.trigger(_name, "show", {
            "numSelected": numSelectedStartedWith,
            "numSuggested": numSuggestedStartedWith
        });
    };
    this.hide = function() {
        $el.removeClass("visible");
        
        Evme.EventHandler.trigger(_name, "hide");
    };
    
    this.get = function() {
        var $items = $el.find("li.on"),
            shortcuts = [];
        
        for (var i=0; i<$items.length; i++) {
            shortcuts.push($items[i].innerHTML);
        }
        
        return shortcuts;
    };
    
    this.load = function(shortcuts) {
        numSelectedStartedWith = 0;
        numSuggestedStartedWith = 0;
        
        $list.empty();
        _this.add(shortcuts);
        
        Evme.EventHandler.trigger(_name, "load");
    };
    
    this.add = function(shortcuts) {
        var htmlShortcuts = '';
        
        for (var query in shortcuts) {
            var $item = $('<li>' + query.replace(/</g,  "&lt;") + '</li>');
            $item
                .attr("class", shortcuts[query]? 'on' : 'off')
                .bind("click", clickFavoriteCategory)
            
            if (shortcuts[query]) {
                numSelectedStartedWith++;
            } else {
                numSuggestedStartedWith++;
            }
            
            $list.append($item);
        }
        
        scroll.refresh();
    };
    
    function clickFavoriteCategory(e) {
        if (!clicked && !moved) {
            clicked = true;
            $(this).toggleClass("on").toggleClass("off");
        }
    }
    
    function touchmove() {
        moved = true;
    }
    
    function touchend() {
        clicked = false;
        setTimeout(function() {
            moved = false;    
        }, 50);
        
    }
    
    function done() {
        $buttonDone.html(buttonDoneSaving);
        
        var shortcuts = _this.get();
        
        Evme.EventHandler.trigger(_name, "done", {
            "shortcuts": shortcuts,
            "numSelectedStartedWith": numSelectedStartedWith,
            "numSuggestedStartedWith": numSuggestedStartedWith,
            "numSelected": $el.find("li.on").length,
            "numSuggested": $el.find("li.off").length
        });
    }
};
