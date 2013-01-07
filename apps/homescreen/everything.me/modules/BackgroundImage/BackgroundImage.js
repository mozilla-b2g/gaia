Evme.BackgroundImage = new function() {
    var _name = "BackgroundImage", _this = this,
            $el = null, $elFullScreen = null, $fullScreenFade = null, $default = null, elStyle = null,
            currentImage = null, $currentImage = null, active = false, changeOpacityTransitionCallback = null,
            defaultImage = "";

    var SOURCE_LABEL = "FROM CONFIG",
        TIMEOUT_BEFORE_REMOVING_OLD_IMAGE = 1500;

    this.init = function(options) {
        !options && (options = {});

        defaultImage = options.defaultImage || "";
        $el = options.$el;
        $fullScreenFade = options.$elementsToFade;
        elStyle = $el[0].style;
        
        SOURCE_LABEL = options.texts.sourceLabel;
        
        $default = $('<div class="img default-image visible"></div>');
        if (defaultImage) {
            $default.css('background-image', defaultImage);
        }
        $el.append($default);
        
        Evme.EventHandler.trigger(_name, "init");
    };

    this.update = function(oImage, isDefault) {
        if (typeof oImage == "string") {
            oImage = {
                "image": oImage,
                "source": "",
                "query": ""
            };
        }

        if (!currentImage || currentImage.image !== oImage.image) {
            removeCurrent();

            if (isDefault) {
                $el.addClass("default");
            } else {
                currentImage = oImage;

                $currentImage = $('<div style="background-image: url(' + currentImage.image + ')" class="img"></div>');
                $el.append($currentImage);

                window.setTimeout(function(){
                    $currentImage.addClass("visible");
                    window.setTimeout(function(){
                        $el.removeClass("default");
                    }, 300);
                }, 10);
            }

            cbUpdated(currentImage);
        }
    };

    this.loadDefault = function() {
        _this.update(defaultImage, true);
    };

    this.clear = function() {
        removeCurrent();
    };

    this.fadeFullScreen = function(per) {
        per = 1 - (Math.round(per*100)/100);
        $fullScreenFade.css("opacity", per);
    };

    this.cancelFullScreenFade = function() {
        $fullScreenFade.addClass("animate");

        window.setTimeout(function(){
            for (var i=0; i<$fullScreenFade.length; i++) {
                var el = $fullScreenFade[i];
                el.style.cssText = el.style.cssText.replace(/opacity: .*;/, "");
            }

            window.setTimeout(function(){
                $fullScreenFade.removeClass("animate");
            }, 500);
        }, 0);

    };

    this.showFullScreen = function() {
        if ($elFullScreen) {
            $elFullScreen.remove();
            $elFullScreen = null;
        }

        $fullScreenFade.addClass("animate");
        window.setTimeout(function(){
            $fullScreenFade.css("opacity", 0);
        }, 0);
        $elFullScreen = _this.getFullscreenElement(currentImage, _this.closeFullScreen);

        $el.parent().append($elFullScreen);

        window.setTimeout(function(){
            $elFullScreen.addClass("ontop").addClass("active");
        }, 0);

        active = true;

        cbShowFullScreen();
    };
    
    this.getFullscreenElement = function(data, onClose) {
        !data && (data = currentImage);
        
        var $el = $('<div id="bgimage-overlay">' +
                        '<div class="img" style="background-image: url(' + data.image + ')"></div>' +
                        '<div class="content">' +
                            ((data.query)? '<h2>' + data.query + '</h2>' : '') +
                            ((data.source)? '<div class="source">' + SOURCE_LABEL + ' <span>' + data.source + '</span></div>' : '') +
                            '<b class="close"></b>' +
                        '</div>' +
                    '</div>');
                    
        $el.find(".close, .img").bind("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            onClose && onClose();
        });
        
        if (data.source) {
            $el.find(".content").bind("touchstart", function(e){
                window.location.href = data.source;
            });
        } else {
            $el.addClass("nosource");
        }
        
        return $el;
    };

    this.closeFullScreen = function(e) {
        if ($elFullScreen && active) {
            _this.cancelFullScreenFade();
            $elFullScreen.removeClass("active");
            window.setTimeout(function(){
                $elFullScreen && $elFullScreen.remove();
            }, 700);
            e && e.preventDefault();
            cbHideFullScreen();
        }

        active = false;
    };

    this.isFullScreen = function() {
        return active;
    };

    this.get = function() {
        return currentImage || {"image": defaultImage};
    };

    this.changeOpacity = function(value, duration, cb) {
        if (duration) {
            changeOpacityTransitionCallback = cb;
            elStyle.MozTransition = 'opacity ' + duration + 'ms linear';
            $el[0].addEventListener('transitionend', transitionEnd);
        }
        this.closeFullScreen();
        elStyle.opacity = value;
    };

    function transitionEnd(e) {
        $el[0].removeEventListener('transitionend', transitionEnd);
        elStyle.MozTransition = '';
        window.setTimeout(function(){
            changeOpacityTransitionCallback && changeOpacityTransitionCallback();
            changeOpacityTransitionCallback = null;
        }, 0);
    }

    function removeCurrent() {
        if ($currentImage) {
            // Keep it as a local var cause it might change during this timeout
            var $remove = $currentImage;
            $remove.removeClass("visible");
            currentImage = {};
            window.setTimeout(function(){
                $remove && $remove.remove();
            }, TIMEOUT_BEFORE_REMOVING_OLD_IMAGE);
        }
    }

    function imageLoaded() {
        cbLoaded();
    }

    function cbUpdated(image) {
        Evme.EventHandler.trigger(_name, "updated", {
            "image": image
        });
    }

    function cbLoaded() {
        Evme.EventHandler.trigger(_name, "load", {
            "image": currentImage
        });
    }

    function cbShowFullScreen() {
        Evme.EventHandler.trigger(_name, "showFullScreen");
    }

    function cbHideFullScreen() {
        Evme.EventHandler.trigger(_name, "hideFullScreen");
    }
}