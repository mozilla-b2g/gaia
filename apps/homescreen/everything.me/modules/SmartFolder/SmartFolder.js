Evme.SmartFolder = function Evme_SartFolder(_options) {
    var self = this, NAME = "SmartFolder",
        experienceId = '', query = '', image = '', scroll = null, shouldFadeImage = false, bgImage = null,
        el = null, elScreen = null, elTitle = null, elClose = null,
        elAppsContainer = null, elApps = null,
        elImage = null, elImageOverlay = null, elImageFullscreen = null,
        reportedScrollMove = false, onScrollEnd = null,
        fadeBy = 1,
        
        CLASS_WHEN_VISIBLE = 'visible',
        CLASS_WHEN_IMAGE_FULLSCREEN = 'full-image',
        CLASS_WHEN_ANIMATING = 'animate',
        CLASS_WHEN_MAX_HEIGHT = 'maxheight',
        SCROLL_TO_BOTTOM = "CALCULATED",
        SCROLL_TO_SHOW_IMAGE = 80,
        TRANSITION_DURATION = 400,
        LOAD_MORE_SCROLL_THRESHOLD = -30,
        MAX_HEIGHT = 520,
        MAX_SCROLL_FADE = 200,
        FULLSCREEN_THRESHOLD = 0.8;
        
    this.init = function init(options) {
        !options && (options = {});
        
        createElement();
        
        options.bgImage && self.setBgImage(options.bgImage);
        options.query && self.setQuery(options.query);
        options.experienceId && self.setExperience(options.experienceId);
        options.image && self.setImage(options.image);
        options.elParent && self.appendTo(options.elParent);
        (typeof options.maxHeight === "number") && (MAX_HEIGHT = options.maxHeight);
        
        onScrollEnd = options.onScrollEnd;
        
        self.MoreIndicator.init({
            "elParent": elApps
        });
        
        Evme.EventHandler.trigger(NAME, "init");
        
        return self;
    };
    
    this.show = function show() {
        window.setTimeout(function onTimeout(){
            el.classList.add(CLASS_WHEN_VISIBLE);
            elScreen.classList.add(CLASS_WHEN_VISIBLE);
        }, 0);
        
        Evme.EventHandler.trigger(NAME, "show", {
            "folder": self
        });
        
        return self;
    };
    
    this.hide = function hide() {
        el.classList.remove(CLASS_WHEN_VISIBLE);
        elScreen.classList.remove(CLASS_WHEN_VISIBLE);
        
        Evme.EventHandler.trigger(NAME, "hide", {
            "folder": self
        });
        
        return self;
    };
    
    this.close = function close(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        self.hide();
        
        window.setTimeout(function onTimeout(){
            Evme.$remove(el);
            Evme.$remove(elScreen);
            
            Evme.EventHandler.trigger(NAME, "close", {
                "folder": self
            });
        }, 350);
        
        return self;
    };
    
    this.clear = function clear() {
        elApps.innerHTML = '';
    };
    
    this.loadApps = function loadApps(options, onDone) {
        var apps = options.apps,
            iconsFormat = options.iconsFormat,
            offset = options.offset,
            areInstalledApps = options.installed,
            
            iconsResult = Evme.Utils.Apps.print({
                "obj": self,
                "apps": apps,
                "numAppsOffset": offset,
                "isMore": offset > 0,
                "iconsFormat": iconsFormat,
                "elList": elApps,
                "onDone": function onAppsPrintComplete(appsList) {
                    if (areInstalledApps && apps && apps.length) {
                        self.addInstalledSeparator();
                    }
                    
                    scroll.refresh();
                    
                    SCROLL_TO_BOTTOM = elAppsContainer.offsetHeight - elApps.offsetHeight;
                    if (offset === 0) {
                        scroll.scrollTo(0, 0);
                    }
                    
                    onDone && onDone();
                }
            });
        
        Evme.EventHandler.trigger(NAME, "load");
        
        return iconsResult;
    };
    
    this.appendTo = function appendTo(elParent) {
        elParent.appendChild(el);
        elParent.appendChild(elScreen);
        
        if (el.offsetHeight > MAX_HEIGHT) {
            el.classList.add(CLASS_WHEN_MAX_HEIGHT);
            el.style.cssText += 'height: ' + MAX_HEIGHT + 'px; margin-top: ' + (-MAX_HEIGHT/2) + 'px;';
        }
        
        return self;
    };
    
    this.setExperience = function setExperience(newExperienceId) {
        if (!newExperienceId || newExperienceId === experienceId) {
            return self;
        }
        
        experienceId = newExperienceId;
        
        var l10nkey = 'id-' + Evme.Utils.shortcutIdToKey(experienceId),
            queryById = Evme.Utils.l10n('shortcut', l10nkey);
            
        elTitle.innerHTML = '<em></em>' +
                            '<b ' + Evme.Utils.l10nAttr(NAME, 'title-prefix') + '></b> ' +
                            '<span ' + Evme.Utils.l10nAttr('shortcut', l10nkey) + '></span>';
        
        if (queryById) {
            self.setQuery(queryById);
        } else if (query) {
            Evme.$('span', elTitle)[0].innerHTML = query;
        }
        
        return self;
    };
    
    this.setQuery = function setQuery(newQuery) {
        if (!newQuery || newQuery === query) {
            return self;
        }
        
        query = newQuery;
        
        return self;
    };
    
    this.setImage = function setImage(newImage) {
        if (!newImage || newImage === image) {
            return self;
        }
        
        image = newImage;
        
        elImage.style.backgroundImage = 'url(' + image.image + ')';
        
        elImageFullscreen = Evme.BackgroundImage.getFullscreenElement(image, self.hideFullscreen);
        el.appendChild(elImageFullscreen);
        
        return self;
    };
    
    this.setBgImage = function setBgImage(newBgImage) {
        if (!newBgImage || newBgImage === bgImage) {
            return self;
        }
        
        bgImage = newBgImage;
        
        el.style.backgroundImage = 'url(' + bgImage + ')';
        
        return self;
    };
    
    this.showFullscreen = function showFullScreen(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        el.classList.add(CLASS_WHEN_ANIMATING);
        window.setTimeout(function onTimeout(){
            self.fadeImage(0);
            el.classList.add(CLASS_WHEN_IMAGE_FULLSCREEN);
            
            window.setTimeout(function onTimeout(){
                scroll.scrollTo(0, 0);
            }, 100);
        }, 10);
    };
    
    this.hideFullscreen = function hideFullscreen(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        el.classList.add(CLASS_WHEN_ANIMATING);
        window.setTimeout(function onTimeout(){
            self.fadeImage(1);
            el.classList.remove(CLASS_WHEN_IMAGE_FULLSCREEN);
            
            window.setTimeout(function onTimeout(){
                el.classList.remove(CLASS_WHEN_ANIMATING);
            }, TRANSITION_DURATION);
        }, 10);
    };
    
    this.fadeImage = function fadeImage(howMuch) {
        elImageOverlay.style.opacity = howMuch;
        elAppsContainer.style.opacity = howMuch;
    };
    
    this.hasInstalled = function hasInstalled(isTrue) {
        if (typeof isTrue !== 'boolean') {
            return elAppsContainer.classList.contains("has-installed");
        }
        
        if (isTrue) {
            elAppsContainer.classList.add("has-installed");
        } else {
            elAppsContainer.classList.remove("has-installed");
        }
        
        return isTrue;
    };
    
    this.addInstalledSeparator = function addInstalledSeparator() {
        elApps.appendChild(Evme.$create('li', {'class': "installed-separator"}));
    };
    
    this.refreshScroll = function refreshScroll() {
        scroll.refresh();
    };
    
    this.MoreIndicator = new function MoreIndicator() {
        var self = this,
            el = null, elParent = null,
            text = '';
        
        this.init = function init(options) {
            elParent = options.elParent;
            text = options.text;
        };
        
        this.set = function set(hasMore) {
            if (hasMore) {
                elParent.classList.add('has-more');
            } else {
                elParent.classList.remove('has-more');
            }
        };
        
        this.show = function show() {
            el = Evme.$create('li',
                    {'class': "loadmore"},
                    '<progress class="small skin-dark"></progress>' +
                    '<b class="label" ' + Evme.Utils.l10nAttr(NAME, 'loading-more') + '></b>');
                    
            elParent.appendChild(el);
            
            elParent.classList.add("loading-more");
        };
        
        this.hide = function hide() {
            elParent.classList.remove("loading-more");
            Evme.$remove(el);
        };
    };
    
    this.getElement = function getElement() { return el; };
    this.getExperience = function getExperience() { return experienceId; };
    this.getQuery = function getQuery() { return query; };
    this.getImage = function getImage() { return image; };
    
    function createElement() {
        elScreen = Evme.$create('div', {'class': "screen smart-folder-screen"});
        el =  Evme.$create('div', {'class': "smart-folder"},
                    '<h2 class="title"></h2>' +
                    '<div class="evme-apps">' +
                        '<ul></ul>' +
                    '</div>' +
                    '<div class="image"><div class="image-overlay"></div></div>' +
                    '<b class="close"></b>');
                
        elTitle = Evme.$(".title", el)[0];
        elAppsContainer = Evme.$(".evme-apps", el)[0];
        elApps = Evme.$('ul', elAppsContainer)[0];
        elImage = Evme.$(".image", el)[0];
        elImageOverlay = Evme.$(".image-overlay", el)[0];
        elClose = Evme.$('.close', el)[0];
        
        elClose.addEventListener("click", self.close);
        elAppsContainer.dataset.scrollOffset = 0;
        
        scroll = new Scroll(elApps.parentNode, {
            "hScroll": false,
            "checkDOMChanges": false,
            "onScrollStart": onScrollStart,
            "onScrollMove": onScrollMove,
            "onTouchEnd": onTouchEnd
        });
    }
    
    function onScrollStart(data) {
        var y = scroll.y;
        
        elAppsContainer.dataset.scrollOffset = y;
        shouldFadeImage = (y === 0);
        fadeBy = 1;
        reportedScrollMove = false;
    }
    
    function onScrollMove(data) {
        var y = scroll.y;
        
        if (shouldFadeImage) {
            var _fadeBy = 1 - Math.min(Math.max(scroll.distY, 0), MAX_SCROLL_FADE)/MAX_SCROLL_FADE;
            if (_fadeBy > fadeBy) {
                _fadeBy = 1;
                shouldFadeImage = false;
            }
            
            fadeBy = _fadeBy;
            self.fadeImage(fadeBy);
        }
        
        if (!reportedScrollMove && SCROLL_TO_BOTTOM + y < LOAD_MORE_SCROLL_THRESHOLD) {
            reportedScrollMove = true;
            onScrollEnd && onScrollEnd(self);
        }
    }
    
    function onTouchEnd() {
        var y = scroll.y;
        
        elAppsContainer.dataset.scrollOffset = y;
        
        if (shouldFadeImage && scroll.distY >= FULLSCREEN_THRESHOLD*MAX_SCROLL_FADE) {
            self.showFullscreen();
        } else {
            self.hideFullscreen();
        }
    }
    
    self.init(_options);
};