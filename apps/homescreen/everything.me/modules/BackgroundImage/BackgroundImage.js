Evme.BackgroundImage = new function() {
    var _name = "BackgroundImage", _this = this,
            $el = null, $elFullScreen = null, $fullScreenFade = null, $default = null, elStyle = null,
            currentImage = {}, $currentImage = null, active = false, changeOpacityTransitionCallback = null,
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

        if (defaultImage) {
            $default = $('<div style="background-image: url(' + defaultImage + ')" class="img default-image visible"></div>');
            $el.append($default);
        }

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

        if (currentImage.image !== oImage.image) {
            removeCurrent();

            if (isDefault) {
                $el.addClass("default");
            } else {
                $el.removeClass("default");
                currentImage = oImage;

                $currentImage = $('<div style="background-image: url(' + currentImage.image + ')" class="img"></div>');
                $el.append($currentImage);

                window.setTimeout(function(){
                    $currentImage.addClass("visible");
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
        $elFullScreen = $('<div id="bgimage-overlay">' +
                                '<div class="img" style="background-image: url(' + currentImage.image + ')"></div>' +
                                '<div class="content">' +
                                    ((currentImage.query)? '<div class="image-title">' + currentImage.query + '</div>' : '') +
                                    ((currentImage.source)? '<div class="image-source">' + SOURCE_LABEL + ' <span>' + currentImage.source + '</span></div>' : '') +
                                    '<b class="close"></b>' +
                                '</div>' +
                            '</div>');

        $elFullScreen.find(".close, .img").bind("touchstart", function(e){
            e.preventDefault();
            e.stopPropagation();
            _this.closeFullScreen();
        });

        if (currentImage.source) {
            $elFullScreen.find(".content").bind("touchstart", function(e){
                Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.OPEN_URL, {
                    "url": currentImage.source
                });
            });
        } else {
            $elFullScreen.addClass("nosource");
        }

        $el.parent().append($elFullScreen);

        window.setTimeout(function(){
            $elFullScreen.addClass("ontop").addClass("active");
        }, 0);

        active = true;

        cbShowFullScreen();
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
        return currentImage;
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