Evme.Shortcuts = new function Evme_Shortcuts() {
    var NAME = "Shortcuts", self = this, scroll = null,
        el = null, elList = null, elLoading = null, loadedResponse = null,
        shortcuts = [], visible = false, isSwiping = false, swiped = false, customizing = false, enabled = true,
        categoryPageData = {};
    
    this.init = function init(options) {
        !options && (options = {});
        
        el = options.el;
        elLoading = options.elLoading;
        
        elList = Evme.$("#shortcuts-items", el);
        
        scroll = new Scroll(Evme.$("#shortcuts-list", el));
        
        if (navigator.mozSettings) {
          navigator.mozSettings.addObserver('language.current', onLanguageChange);
        }
        
        Evme.EventHandler.trigger(NAME, "init");
    };
    
    this.load = function load(data) {
        loadedResponse = Evme.Utils.cloneObject(data);
        
        var _shortcuts = data.shortcuts.splice(0),
            icons = data.icons;
            
        for (var id in icons) {
            Evme.IconManager.add(id, icons[id], Evme.Utils.ICONS_FORMATS.small);
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
        
        self.clear();
        self.draw(_shortcuts);
        cbLoaded();
    };
    
    this.getLoadedResponse = function getLoadedResponse() {
        return loadedResponse;
    };
    
    this.scrollToBottom = function scrollToBottom(callback) {
        var max = elList.parentNode.offsetHeight,
            height = elList.offsetHeight;
            
        if (height > max) {
            window.setTimeout(function onTimeout(){
                scroll.scrollTo(0, max - height, 400);
                window.setTimeout(function onTimeout(){
                    callback && callback();
                }, 300);
            }, 100);
        } else {
            callback && callback();
        }
    };
    
    this.isSwiping = function _isSwiping() {
        return isSwiping;
    };

    this.draw = function draw(_shortcuts, icons) {
        var docFrag = Evme.$create('documentFragment');
        
        for (var i=0; i<_shortcuts.length; i++) {
            var shortcut = new Evme.Shortcut(),
                elShortcut = shortcut.init(_shortcuts[i], i);
            
            if (elShortcut) {
                shortcuts.push(shortcut);
                docFrag.appendChild(elShortcut);
            }
        }
        
        elList.appendChild(docFrag);
    };
    
    this.get = function get() {
        return shortcuts;
    };
    
    this.getQueries = function getQueries() {
        var list = [];
        for (var i=0; i<shortcuts.length; i++) {
            list.push(shortcuts[i].getQuery());
        }
        return list;
    };
    
    this.getShortcutByKey = function getShortcutByKey(key) {
        for (var i=0, shortcut; shortcut = shortcuts[i++];) {
            if (shortcut.getQuery() === key || shortcut.getExperience() == key) {
              return shortcut;
            }
        }
        
        return null;
    };
    
    this.orderByElements = function orderByElements() {
        var _shortcuts = [];
            
        Evme.$(".shortcut", elList, function itemIteration(elShortcut) {
            var query = elShortcut.getAttribute("query");
            for (var j=0; j<shortcuts.length; j++) {
                if (shortcuts[j].getQuery() == query) {
                    _shortcuts.push(shortcuts[j]);
                    break;
                }
            }
        });
            
        shortcuts = _shortcuts;
    };
    
    this.remove = function remove(shortcut) {
        var id = shortcut.getId();
        
        for (var i=0; i<shortcuts.length; i++) {
            if (shortcuts[i].getId() === id) {
                shortcuts.splice(i, 1);
                return true;
            }
        }
        
        return false;
    };
    
    this.enableScroll = function enableScroll() {
        scroll && scroll.enable();
    };
    this.disableScroll = function disableScroll() {
        scroll && scroll.disable();
    };
    this.scrollTo = function scrollTo(x, y, duration) {
        scroll && scroll.scrollTo(x, y, duration);
    };
    this.scrollY = function scrollY() {
        return scroll.y;
    };
    
    this.customizing = function _customizing() {
        return customizing;
    };
    this.customize = function customize() {
        customizing = true;
    };
    this.doneCustomize = function doneCustomize() {
        customizing = false;
    };

    this.clear = function clear() {
        for (var i=0; i<shortcuts.length; i++) {
            shortcuts[i].remove(null, true);
        }
        shortcuts = [];
        elList.innerHTML = '';
    };
    
    function toggle(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (visible) {
            self.hide(true);
        } else {
            self.show(true);
        }
    }

    this.show = function show(bReport) {
        visible = true;
        cbShow(bReport);
    };

    this.hide = function hide(bReport) {
        visible = false;
        cbHide(bReport);
    };
    
    this.getElement = function getElement() {
        return elList;
    };
    
    this.swiped = function _swiped() {
        return swiped;
    };
    
    this.enable = function enable() {
        enabled = true;
    };
    this.disable = function disable() {
        enabled = false;
    };
    this.enabled = function _enabled() {
        return enabled;
    };
    
    function onLanguageChange() {
      for (var i=0, shortcut; shortcut=shortcuts[i++];) {
        shortcut.refreshImage();
      }
    }
    
    function setShortcutsDesign() {
        if (setDesign) return;
        
        var style = "#" + Evme.Utils.getID() + " .shortcut { width: " + 100/itemsDesign.itemsPerRow + "%; } \n";
        
        var $style = $('<style type="text/css">' + style + '</style>');
        
        $("#" + Evme.Utils.getID()).append($style);
        setDesign = true;
    }
    
    function cbShow(bReport) {
        Evme.EventHandler.trigger(NAME, "show", {
            "shortcuts": shortcuts,
            "report": (bReport === true)
        });
    }
    
    function cbHide(bReport) {
        Evme.EventHandler.trigger(NAME, "hide", {
            "shortcuts": shortcuts,
            "report": (bReport === true)
        });
    }
    
    function cbLoaded() {
        Evme.EventHandler.trigger(NAME, "load", {
            "shortcuts": shortcuts
        });
    }
}

Evme.Shortcut = function Evme_Shortcut() {
    var NAME = "Shortcut", self = this,
        cfg = null, id = '',
        el = null, elThumb = null, index = -1, experienceId = '', query = '',
        timeoutHold = null, removed = false,
        posStart = [0, 0], timeStart = 0, fingerMoved = true,
        
        THRESHOLD = 5,
        TIME_BEFORE_CONTEXT = 600;
    
    this.init = function init(_cfg, _index) {
        cfg = _cfg;
        id = 'shrt-' + Evme.Utils.uuid();
        index = _index;
        experienceId = cfg.experienceId;
        query = cfg.query;
        
        if (!query && !experienceId) {
            return null;
        }
        
        el = Evme.$create('li', {
                            'class': 'shortcut',
                            'data-query': self.getName(),
                            'data-experienceId': experienceId
                          },
                            '<span class="thumb"></span>' +
                            '<span class="remove"></span>'
                        );
            
        elThumb = Evme.$(".thumb", el)[0];
        
        self.setImage(cfg.appIds);
        
        if ("ontouchstart" in window) {
            el.addEventListener("touchstart", onTouchStart);
            el.addEventListener("touchmove", onTouchMove);
            el.addEventListener("touchend", onTouchEnd);
        } else {
            el.addEventListener("click", function onClick(e){
                fingerMoved = false;
                onTouchEnd(e);
            });
        }
        
        Evme.$(".remove", el)[0].addEventListener("touchstart", function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            
            self.remove(e, false);
            onRemove(e);
        });
        
        return el;
    };
    
    this.setImage = function setImage(shortcutIcons) {
      if (elThumb && shortcutIcons && shortcutIcons.length > 0) {
        var elIconGroup = Evme.IconGroup.get(shortcutIcons, self.getName(), function onReady(elCanvas) {
          if (elThumb) {
            elThumb.innerHTML = '';
            elThumb.appendChild(elCanvas);
          }
        });
      }
    };
    
    this.refreshImage = function refreshImage() {
        cfg.appIds && self.setImage(cfg.appIds);
    };
    
    this.remove = function remove(e, isFromOutside) {
        if (removed) {
            return;
        }
        
        removed = true;
        Evme.$remove(el);
    };
    
    this.getName = function getName() {
        var name = query;
        
        if (experienceId) {
            var l10nkey = 'id-' + Evme.Utils.shortcutIdToKey(experienceId),
                translatedExperience = Evme.Utils.l10n(NAME, l10nkey);
            
            if (translatedExperience) {
              name = translatedExperience;
            }
        }
        
        return name;
    };
    
    this.getData = function getData() { return cfg; };
    this.getElement = function getElement() { return el; };
    this.getThumb = function getThumb() { return elThumb; };
    this.getId = function getId() { return id; };
    this.getQuery = function getQuery() { return query; };
    this.getExperience = function getExperience() { return experienceId; };
    this.isCustom = function isCustom() { return cfg.isCustom; };
    
    function onRemove(e) {
        Evme.EventHandler.trigger(NAME, "remove", {
            "shortcut": self,
            "data": cfg,
            "index": index,
            "e": e
        });
    }
    
    function onTouchStart(e) {
        if (removed) {
            return;
        }
        
        e = (e.touches || [e])[0];
        
        fingerMoved = false;
        
        posStart = [e.pageX, e.pageY];
        timeStart = Date.now();
        
        window.clearTimeout(timeoutHold);
        timeoutHold = window.setTimeout(fireLongTap, TIME_BEFORE_CONTEXT);
    }
    
    function onTouchMove(e) {
        if (removed) {
            return;
        }
        
        e = (e.changedTouches || [e])[0];
        
        var p = [e.pageX, e.pageY];
        if (Math.abs(p[0] - posStart[0]) > THRESHOLD || Math.abs(p[1] - posStart[1]) > THRESHOLD) {
            fingerMoved = true;
            window.clearTimeout(timeoutHold);
        }
    }
    
    function onTouchEnd(e) {
        if (removed) {
            return;
        }
        
        window.clearTimeout(timeoutHold);
        if (fingerMoved) return;
        fingerMoved = false;
        
        Evme.EventHandler.trigger(NAME, "click", {
            "shortcut": self,
            "data": cfg,
            "query": cfg.query,
            "el": el,
            "index": index,
            "e": e
        });
    }
    
    function fireLongTap(e) {
        window.clearTimeout(timeoutHold);
        if (fingerMoved) return;
        fingerMoved = false;
        
        Evme.EventHandler.trigger(NAME, "hold", {
            "shortcut": self,
            "data": cfg,
            "el": el,
            "index": index,
            "e": e
        });
    }
};