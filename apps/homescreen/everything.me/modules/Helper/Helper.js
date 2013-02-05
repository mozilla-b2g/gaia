Evme.Helper = new function Evme_Helper() {
    var NAME = "Helper", self = this,
        el = null, elWrapper = null, elTitle = null, elList = null, elTip = null,
        _data = {}, defaultText = "", iscroll = null, currentDisplayedType = "", timeoutShowRefine = null,
        queryForSuggestions = "", lastVisibleItem, clicked = false, titleVisible = false,
        TOTAL_WIDTH_ADDITION = 20, MIN_WIDTH = 308, TYPE_ELEMENT_OFFSET = 86,
        
        bShouldAnimate = true, ftr = {};
           
    this.init = function init(options) {
        !options && (options = {});        
        
        // features
        if (options.features){
            for (var i in options.features) {
                ftr[i] = options.features[i]
            }
        }

        el = options.el;
        elTitle = options.elTitle;
        elTip = options.elTip;
        
        elWrapper = el.parentNode;
        elList = Evme.$("ul", el)[0];

        elList.addEventListener("touchmove", function cancelPanning(e) {
          e.stopPropagation();
        });
        
        elList.addEventListener("click", elementClick, false);
        elTitle.addEventListener("click", titleClicked, false);
        
        self.reset();

        // iscroll options
        var iscrollOptions = {
            "vScroll": false,
            "onBeforeScrollStart": function onBeforeScrollStart(e){ e.preventDefault(); e.stopPropagation(); }
        };
        
        iscroll = new iScroll(el, iscrollOptions);
        
        // feature animation disable
        if (ftr.Animation === false){
            elWrapper.classList.add("anim-disabled");
        }
        if (ftr.Suggestions && ftr.Suggestions.Animation !== undefined){
            var c = "anim-sugg-";
                c += ftr.Suggestions.Animation ? "enabled" : "disabled";
                
            elWrapper.classList.add(c);
        }

        Evme.EventHandler.trigger(NAME, "init");
    };
    
    this.reset = function reset() {
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
        
        self.setTitle();
    };
    
    this.empty = function empty() {
        elList.innerHTML = '<li class="label" ' + Evme.Utils.l10nAttr(NAME, 'default') + '></li>';
        elList.classList.remove("default");
    };
    
    this.clear = function clear() {
        self.empty();
        
        Evme.EventHandler.trigger(NAME, "clear");
    };
    
    this.getElement = function getElement() {
        return el;
    };
    this.getList = function getList() {
        return elList;
    };
    
    this.enableCloseAnimation = function enableCloseAnimation() {
        elWrapper.classList.add("animate");
    };
    this.disableCloseAnimation = function disableCloseAnimation() {
        elWrapper.classList.remove("animate");
    };
    this.animateLeft = function animateLeft(callback) {
        el.classList.add("animate");
        window.setTimeout(function onTimeout(){
            el.style.cssText += "; -moz-transform: translateX(" + -el.offsetWidth + "px)";
            window.setTimeout(function onTimeout(){
                el.classList.remove("animate");
                window.setTimeout(function onTimeout(){
                    callback && callback();
                }, 50);
            }, 400);
        }, 50);
    };
    this.animateRight = function animateRight(callback) {
        el.classList.add("animate");
        window.setTimeout(function onTimeout(){
            el.style.cssText += "; -moz-transform: translateX(" + el.offsetWidth + "px)";
            window.setTimeout(function onTimeout(){
                el.classList.remove("animate");
                window.setTimeout(function onTimeout(){
                    callback && callback();
                }, 50);
            }, 400);
        }, 50);
    };
    this.animateFromRight = function animateFromRight() {
        el.style.cssText += "; -moz-transform: translateX(" + el.offsetWidth + "px)";
        window.setTimeout(function onTimeout(){
            el.classList.add("animate");
            window.setTimeout(function onTimeout(){
                el.style.cssText += "; -moz-transform: translateX(0)";
                window.setTimeout(function onTimeout(){
                    el.classList.remove("animate");
                }, 400);
            }, 20);
        }, 20);
    };
    this.animateFromLeft = function animateFromLeft() {
        el.style.cssText += "; -moz-transform: translateX(" + -el.offsetWidth + "px)";
        window.setTimeout(function onTimeout(){
            el.classList.add("animate");
            window.setTimeout(function onTimeout(){
                el.style.cssText += "; -moz-transform: translateX(0)";
                window.setTimeout(function onTimeout(){
                    el.classList.remove("animate");
                }, 400);
            }, 20);
        }, 20);
    };
    
    this.load = function load(inputQuery, parsedQuery, suggestions, spelling, types) {
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
         
        self.setTitle(parsedQuery, _type);
        
        self.empty();
        
        cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types);
    };
    
    this.loadSuggestions = function loadSuggestions(suggestions) {
        self.reset();
        self.load("", "", suggestions);
    };
    
    this.loadHistory = function loadHistory(history) {
        _data.history = history;
    };
    
    this.showSuggestions = function showSuggestions(querySentWith) {
        querySentWith && (queryForSuggestions = querySentWith);
        
        if (_data.suggestions.length > 0) {
            if (_data.suggestions.length > 4) {
                _data.suggestions = _data.suggestions.slice(0, 4);
            }
            self.showList({
                "data": _data.suggestions
            });
        }
        
        Evme.EventHandler.trigger(NAME, "showSuggestions", {
            "data": _data.suggestions
        });
    };
    
    this.getSuggestionsQuery = function getSuggestionsQuery() {
        return queryForSuggestions;
    };
    
    this.showHistory = function showHistory() {
        self.disableAnimation();
        
        self.showList({
            "data": _data.history,
            "l10nKey": 'history-title',
            "className": "history"
        });
        
        Evme.EventHandler.trigger(NAME, "showHistory", {
            "data": _data.history
        });
    };
    
    this.showSpelling = function showSpelling() {
        self.disableAnimation();
        
        var list = _data.spelling;
        if (list.length == 0) {
            list = _data.types;
        }
        
        self.showList({
            "data": list,
            "l10nKey": 'didyoumean-title',
            "className": "didyoumean"
        });
        
        if (list.length > 0) {
            self.flash();
        }
        
        Evme.EventHandler.trigger(NAME, "showSpelling", {
            "data": _data.spelling
        });
    };
    
    this.loadRefinement = function loadRefinement(types) {
        _data.types = types;
    };
    
    this.showRefinement = function showRefinement() {
        self.enableCloseAnimation();
        self.disableAnimation();
        
        self.showList({
            "data": _data.types,
            "l10nKey": 'refine-title',
            "className": "refine"
        });
        
        Evme.EventHandler.trigger(NAME, "showRefinement", {
            "data": _data.types
        });
    };
    
    this.showList = function showList(data) {
        var classToAdd = data.className || '',
            label = data.l10nKey? Evme.Utils.l10nAttr(NAME, data.l10nKey) : '',
            items = (data.data || []).slice(0);
            
        currentDisplayedType = classToAdd;
        
        self.empty();
        
        elList.className = classToAdd;
        
        var html = "";
        
        if (label) {
            html += '<li class="label" ' + label + '></li>';
        }
        
        for (var i=0; i<items.length; i++) {
            html += getElement(items[i], i, classToAdd);
        }
        elList.innerHTML = html;
        
        window.setTimeout(self.refreshScroll, 0);
        
        if (bShouldAnimate) {
            self.disableAnimation();
            animateSuggestions();
        }
        
        Evme.EventHandler.trigger(NAME, "show", {
            "type": classToAdd,
            "data": items
        });
    };
    
    this.flash = function flash() {
        elWrapper.classList.remove("flash");
        elTip.classList.remove("flash");
        
        window.setTimeout(function onTimeout() {
            elWrapper.classList.add("flash");
            elTip.classList.add("flash");
            
            window.setTimeout(function onTimeout(){
                elWrapper.classList.remove("flash");
                elTip.classList.remove("flash");
            }, 4000);
        }, 0);
    };
    
    this.refreshScroll = function refreshScroll() {
        MIN_WIDTH = el.offsetWidth;
        setWidth();
        iscroll.refresh();
        iscroll.scrollTo(0,0);
    };

    this.setTitle = function setTitle(title, type) {
        if (!title) {
            elTitle.innerHTML = '<b ' + Evme.Utils.l10nAttr(NAME, 'title-empty') + '></b>';
            return false;
        }
        
        
        var currentTitle = Evme.$('.query', elTitle)[0],
            currentType = Evme.$('.type', elTitle)[0];
       
        currentTitle = currentTitle? currentTitle.textContent : '';
        currentType = currentType? currentType.textContent.replace(/\(\)/g, "") : '';
        
        title = title.replace(/</g, "&lt;");
        
        // if trying to set the title to the one already there, don't doanything
        if (currentTitle == title) {
            if ((!type && currentType) || type == currentType) {
                return false;
            }
        }
        
        var html =  '<b ' + Evme.Utils.l10nAttr(NAME, 'title-prefix') + '></b>' +
                    '<span class="query">' + title + '</span>' +
                    '<em class="type">(' + (type || "") + ')</em>';
        
        elTitle.innerHTML = html;
        
        if (type) {
            elTitle.classList.remove("notype");
        } else {
            elTitle.classList.add("notype");
        }
        
        return html;
    };
    
    this.showTitle = function showTitle() {
        if (titleVisible) return;
        
        elWrapper.classList.add("close");
        elTitle.classList.remove("close");
        self.hideTip();
        window.setTimeout(self.disableCloseAnimation, 50);
        
        titleVisible = true;
    };
    
    this.hideTitle = function hideTitle() {
        if (!titleVisible) return;
        
        elWrapper.classList.remove("close");
        elTitle.classList.add("close");
        window.setTimeout(self.disableCloseAnimation, 50);
        self.refreshScroll();
        
        titleVisible = false;
    };

    this.selectItem = function selectItem(index) {
        elList.childNodes[index].click();
    };
    
    this.getList = function getList() {
        return elList;
    };
    
    this.getData = function getData() {
        return _data;
    };
    
    this.enableAnimation = function enableAnimation() {
        bShouldAnimate = true;
    };
    this.disableAnimation = function disableAnimation() {
        bShouldAnimate = false;
    };
    
    this.showTip = function showTip() {
        elTip.style.visibility = 'visible';
    };
    
    this.hideTip = function hideTip() {
        elTip.style.visibility = 'hidden';
    };
    
    this.addLink = function addLink(l10Key, callback, isBefore) {
        var elLink = Evme.$create('li', {
            'class': "link",
            'data-l10n-id': Evme.Utils.l10nKey(NAME, l10Key)
        });
        
        elLink.addEventListener("click", function onClick(e) {
            e.stopPropagation();
            e.preventDefault();
            callback(e);
        });
        
        if (isBefore) {
            elList.insertBefore(elLink, elList.firstChild);
        } else {
            elList.appendChild(elLink);
        }
        
        window.setTimeout(self.refreshScroll, 0);
        
        return elLink;
    };
    
    this.addText = function addText(l10Key) {
        var el = Evme.$create('li', {
            'class': "text",
            'data-l10n-id': Evme.Utils.l10nKey(NAME, l10Key)
        });
        
        el.addEventListener("click", function onClick(e) {
            e.stopPropagation();
            e.preventDefault();
        });
        
        elList.appendChild(el);
        
        self.refreshScroll();
    };
    
    function animateSuggestions() {
        elList.classList.remove("anim");
        elList.classList.add("start");
        
        window.setTimeout(function onTimeout(){
            elList.classList.add("anim");
            
            window.setTimeout(function onTimeout(){
                elList.classList.remove("start");
                
                window.setTimeout(function onTimeout(){
                    elList.classList.remove("anim");
                    
                    if (currentDisplayedType == "" && !Evme.Utils.Cookies.get("fs")) {
                        self.flash();
                    }
                }, 50);
            }, 50);
        }, 50);
    }

    function removeElement(text) {
        if (!text) {
            return false;
        }
        
        text = text.toLowerCase().replace(/\[\]/gi, "");
        
        var removed = false,
            elItems = elList.childNodes;
        
        for (var i=0,el=elItems[i]; el; el=elItems[++i]) {
            var sugg = (el.dataset.suggestion || "").toLowerCase().replace(/\[\]/gi, "");
            
            if (sugg === text) {
                Evme.$remove(el);
                removed = true;
            }
        }
        
        return removed;
    }

    function getElement(item, index, source) {
        var id = "",
            isSmartObject = (typeof item === "object"),
            text = item;
            
        if (isSmartObject) {
            id = item.id;
            text = item.name;
        }
        
        if (!text) {
            return false;
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
        window.setTimeout(function onTimeout(){
            clicked = false;
        }, 500);
        
        var elClicked = e.originalTarget || e.target;
        
        while (elClicked && elClicked.nodeName !== "LI") {
            elClicked = elClicked.parentNode;
        }
        
        if (!elClicked) {
            clicked = false;
            return;
        }
        
        if (elClicked.classList.contains("label") || elClicked.classList.contains("text")) {
            return;
        }
        
        var val = elClicked.dataset.suggestion,
            valToSend = (val || "").replace(/[\[\]]/g, "").toLowerCase(),
            index = elClicked.dataset.index,
            source = elClicked.dataset.source, 
            type = elClicked.dataset.type;
            
        if (val) {
            cbClick(elClicked, index, isVisibleItem(index), val, valToSend, source, type);
        }
    }
    
    function titleClicked(e){
        e.preventDefault();
        e.stopPropagation();
        
        if (Evme.$('.query', elTitle).length === 0) {
            return;
        }
        
        window.setTimeout(function onTimeout(){
            if (!clicked) {
                self.hideTitle();
                self.showRefinement();
            }
        }, 100);
    }
    
    function isVisibleItem(index){
        return index <= lastVisibleItem;
    }

    function setWidth() {
        elList.style.width = '5000px';
        
        var width = 0,
            elListItems = Evme.$('li', elList);
        
        lastVisibleItem = 0;
        for (var i=0,elItem=elListItems[i]; elItem; elItem=elListItems[++i]) {
            if (width < MIN_WIDTH){
                lastVisibleItem = i;
            }
            
            if (!elItem.classList.contains("history")) {
                width += elItem.offsetWidth;
            }
        }
        
        width = Math.max(width + TOTAL_WIDTH_ADDITION, MIN_WIDTH);
        
        elList.style.width = width + 'px';
    }

    function cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types) {
        Evme.EventHandler.trigger(NAME, "load", {
            "suggestions": suggestions,
            "spelling": spelling,
            "types": types,
            "query": inputQuery
        });
    }
    
    function cbClick(elClicked, index, isVisibleItem, originalValue, val, source, type) {
        Evme.EventHandler.trigger(NAME, "click", {
            "el": elClicked,
            "originalValue": originalValue,
            "value": val,
            "source": source,
            "type": type,
            "index": index,
            "visible": isVisibleItem
        });
    }
}