Evme.SmartFolder = function(_options) {
    var _this = this, _name = "SmartFolder",
        name = '', image = '', scroll = null, shouldFadeImage = false, bgImage = null,
        $el = null, $elScreen = null, $elTitle = null, $elClose = null,
        $elAppsContainer = null, $elApps = null,
        $elImage = null, $elImageOverlay = null, $elImageFullscreen = null,
        reportedScrollMove = false, onScrollEnd = null, onClose = null,
        fadeBy = 1;
        
    var CLASS_WHEN_VISIBLE = 'visible',
        CLASS_WHEN_IMAGE_FULLSCREEN = 'full-image',
        CLASS_WHEN_ANIMATING = 'animate',
        CLASS_WHEN_MAX_HEIGHT = 'maxheight',
        TITLE_PREFIX = "<em></em>Everything",
        LOAD_MORE_TEXT = "Loading...",
        SCROLL_TO_BOTTOM = "CALCULATED",
        SCROLL_TO_SHOW_IMAGE = 80,
        TRANSITION_DURATION = 400,
        LOAD_MORE_SCROLL_THRESHOLD = -30,
        MAX_HEIGHT = 520,
        MAX_SCROLL_FADE = 200,
        FULLSCREEN_THRESHOLD = 0.8;
        
    this.init = function(options) {
        !options && (options = {});
        
        createElement();
        
        options.bgImage && _this.setBgImage(options.bgImage);
        options.name && _this.setName(options.name);
        options.image && _this.setImage(options.image);
        options.parent && _this.appendTo(options.parent);
        (typeof options.maxHeight == "number") && (MAX_HEIGHT = options.maxHeight);
        
        onScrollEnd = options.onScrollEnd;
        onClose = options.onClose;
        
        _this.MoreIndicator.init({
            "text": LOAD_MORE_TEXT,
            "$parent": $elApps
        });
        
        Evme.EventHandler.trigger(_name, "init");
        
        return _this;
    };
    
    this.show = function() {
        window.setTimeout(function(){
            $el.addClass(CLASS_WHEN_VISIBLE);
            $elScreen.addClass(CLASS_WHEN_VISIBLE);
        }, 0);
        
        Evme.EventHandler.trigger(_name, "show", {
            "folder": _this
        });
        return _this;
    };
    
    this.hide = function() {
        $el.removeClass(CLASS_WHEN_VISIBLE);
        $elScreen.removeClass(CLASS_WHEN_VISIBLE);
        
        Evme.EventHandler.trigger(_name, "hide", {
            "folder": _this
        });
        
        return _this;
    };
    
    this.close = function(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        _this.hide();
        
        window.setTimeout(function(){
            $el && $el.remove();
            $elScreen && $elScreen.remove();
        }, 500);
        
        onClose && onClose(_this);
        
        Evme.EventHandler.trigger(_name, "close");
        return _this;
    };
    
    this.clear = function() {
        $elApps.html('');
    };
    
    this.loadApps = function(options, onDone) {
        var apps = options.apps,
            iconsFormat = options.iconsFormat,
            offset = options.offset;
            
        var iconsResult = Evme.Utils.Apps.print({
            "obj": _this,
            "apps": apps,
            "numAppsOffset": offset,
            "isMore": offset > 0,
            "iconsFormat": iconsFormat,
            "$list": $elApps,
            "onDone": function(group, appsList) {
                scroll.refresh();
                
                SCROLL_TO_BOTTOM = $elAppsContainer.height() - $elApps.height();
                if (offset === 0) {
                    scroll.scrollTo(0, 0);
                }
                
                onDone && onDone();
            }
        });
        
        Evme.EventHandler.trigger(_name, "load");
    };
    
    this.appendTo = function($elParent) {
        $elParent.append($el);
        $elParent.append($elScreen);
        
        if ($el.height() > MAX_HEIGHT) {
            $el.addClass(CLASS_WHEN_MAX_HEIGHT);
            $el.css({
                'height': MAX_HEIGHT + 'px',
                'margin-top': -MAX_HEIGHT/2 + 'px'
            });
        }
        
        return _this;
    };
    
    this.setName = function(_name) {
        if (!_name || _name == name) return _this;
        name = _name;
        $elTitle.html(TITLE_PREFIX + ' <span>' + name + '</span>');
        
        return _this;
    };
    
    this.setImage = function(_image) {
        if (!_image || _image == image) return _this;
        image = _image;
        
        $elImage.css('background-image', 'url(' + image.image + ')');
        
        $elImageFullscreen = Evme.BackgroundImage.getFullscreenElement(image, _this.hideFullscreen);
        $el.append($elImageFullscreen);
        
        return _this;
    };
    
    this.setBgImage = function(_bgImage) {
        if (!_bgImage || _bgImage == bgImage) return _this;
        bgImage = _bgImage;
        
        $el.css('background-image', 'url(' + bgImage + ')');
        
        return _this;
    };
    
    this.showFullscreen = function(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        $el.addClass(CLASS_WHEN_ANIMATING);
        window.setTimeout(function(){
            _this.fadeImage(0);
            $el.addClass(CLASS_WHEN_IMAGE_FULLSCREEN);
            window.setTimeout(function(){
                scroll.scrollTo(0, 0);
            }, 100);
        }, 10);
    };
    
    this.hideFullscreen = function(e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        
        $el.addClass(CLASS_WHEN_ANIMATING);
        window.setTimeout(function(){
            _this.fadeImage(1);
            $el.removeClass(CLASS_WHEN_IMAGE_FULLSCREEN);
            window.setTimeout(function(){
                $el.removeClass(CLASS_WHEN_ANIMATING);
            }, TRANSITION_DURATION);
        }, 10);
    };
    
    this.fadeImage = function(howMuch) {
        $elImageOverlay[0].style.opacity = howMuch;
        $elAppsContainer[0].style.opacity = howMuch;
    };
    
    this.hasInstalled = function(isTrue) {
        if (typeof isTrue !== 'boolean') {
            return $elAppsContainer.hasClass("has-installed");
        }
        
        if (isTrue) {
            $elAppsContainer.addClass("has-installed");
        } else {
            $elAppsContainer.removeClass("has-installed");
        }
        
        return isTrue;
    };
    
    this.MoreIndicator = new function() {
        var _this = this,
            $el = null, $parent = null, spinner = null, text = '';
            
        this.init = function(options) {
            $parent = options.$parent;
            text = options.text;
        };
        
        this.set = function(hasMore) {
            if (hasMore) {
                $parent.addClass('has-more');
            } else {
                $parent.removeClass('has-more');
            }
        };
        
        this.show = function() {
            $el = $('<li class="loadmore"><span></span>' + text + '</li>');
            $parent.append($el);
            
            $parent.addClass("loading-more");
            
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
            spinner = new Spinner(opts).spin($el.find("span")[0]);
        };
        
        this.hide = function() {
            spinner.stop();
            $parent.removeClass("loading-more");
            $el && $el.remove();
        };
    };
    
    this.getElement = function() { return $el; };
    this.getName = function() { return name; };
    this.getImage = function() { return image; };
    
    function createElement() {
        $elScreen = $('<div class="screen smart-folder-screen"></div>');
        $el = $('<div class="smart-folder">' +
                    '<h2 class="title"></h2>' +
                    '<div class="evme-apps">' +
                        '<ul></ul>' +
                    '</div>' +
                    '<div class="image"><div class="image-overlay"></div></div>' +
                    '<b class="close"></b>' +
                '</div>');
                
        $elTitle = $el.find(".title");
        $elAppsContainer = $el.find(".evme-apps");
        $elApps = $elAppsContainer.find("ul");
        $elImage = $el.find(".image");
        $elImageOverlay = $el.find(".image-overlay");
        $elClose = $el.find(".close");
        
        $elClose.bind("click", _this.close);
        $elAppsContainer.data("scrollOffset", 0);
        
        scroll = new Scroll($elApps.parent()[0], {
            "hScroll": false,
            "checkDOMChanges": false,
            "onScrollStart": onScrollStart,
            "onScrollMove": onScrollMove,
            "onTouchEnd": onTouchEnd
        });
    }
    
    function onScrollStart(data) {
        var y = scroll.y;
        
        $elAppsContainer.data("scrollOffset", y);
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
            _this.fadeImage(fadeBy);
        }
        
        if (!reportedScrollMove && SCROLL_TO_BOTTOM + y < LOAD_MORE_SCROLL_THRESHOLD) {
            reportedScrollMove = true;
            onScrollEnd && onScrollEnd(_this);
        }
    }
    
    function onTouchEnd() {
        var y = scroll.y;
        
        $elAppsContainer.data("scrollOffset", y);
        
        if (shouldFadeImage && scroll.distY >= FULLSCREEN_THRESHOLD*MAX_SCROLL_FADE) {
            _this.showFullscreen();
        } else {
            _this.hideFullscreen();
        }
    }
    
    _this.init(_options);
};