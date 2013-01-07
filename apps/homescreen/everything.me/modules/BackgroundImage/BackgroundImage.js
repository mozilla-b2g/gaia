Evme.BackgroundImage = new function Evme_BackgroundImage() {
    var NAME = "BackgroundImage", self = this,
        el = null, elFullScreen = null, elementsToFade = null, elDefault = null, elStyle = null,
        currentImage = null, elCurrentImage = null, active = false, changeOpacityTransitionCallback = null,
        defaultImage = "",
        TIMEOUT_BEFORE_REMOVING_OLD_IMAGE = 1500;

    this.init = function init(options) {
        !options && (options = {});

        defaultImage = options.defaultImage || "";
        el = options.el;
        elementsToFade = options.elementsToFade;
        elStyle = el.style;
        
        elDefault = Evme.$create('div',  {'class': 'img default-image visible'});
        if (defaultImage) {
            elDefault.style.backgroundImage = defaultImage;
        }
        el.appendChild(elDefault);

        Evme.EventHandler.trigger(NAME, "init");
    };

    this.update = function update(oImage, isDefault) {
        if (typeof oImage === "string") {
            oImage = {
                "image": oImage,
                "source": "",
                "query": ""
            };
        }

        if (!currentImage || currentImage.image !== oImage.image) {
            removeCurrent();

            if (isDefault) {
                el.classList.add("default");
            } else {
                currentImage = oImage;

                elCurrentImage = Evme.$create('div',{'class': 'img'});
                elCurrentImage.style.backgroundImage = 'url(' + currentImage.image + ')';
                el.appendChild(elCurrentImage);

                window.setTimeout(function onTimeout(){
                    elCurrentImage.classList.add("visible");

                    window.setTimeout(function onTimeout(){
                        el.classList.remove("default");
                    }, 300);
                }, 10);
            }

            cbUpdated(currentImage);
        }
    };

    this.loadDefault = function loadDefault() {
        self.update(defaultImage, true);
    };

    this.clear = function clear() {
        removeCurrent();
    };

    function onElementsToFade(cb) {
        for (var i=0, el=elementsToFade[i]; el; el=elementsToFade[++i]) {
            cb.call(el);
        }
    }

    this.fadeFullScreen = function fadeFullScreen(per) {
        per = 1 - (Math.round(per*100)/100);
        onElementsToFade(function onElement(){
            this.style.opacity = per;
        });
    };

    this.cancelFullScreenFade = function cancelFullScreenFade() {
        onElementsToFade(function onElement(){
            this.classList.add('animate');
        });

        window.setTimeout(function onTimeout(){
            onElementsToFade(function onElement(){
                this.style.cssText = this.style.cssText.replace(/opacity: .*;/, "");
            });

            window.setTimeout(function onTimeout(){
                onElementsToFade(function onElement(){
                    this.classList.remove('animate');
                });
            }, 500);
        }, 0);

    };

    this.showFullScreen = function showFullScreen() {
        Evme.$remove(elFullScreen);
        elFullScreen = null;

        onElementsToFade(function onElement(){
            this.classList.add('animate');
        });
        window.setTimeout(function onTimeout(){
            onElementsToFade(function onElement(){
                this.style.opacity = 0;
            });
        }, 0);

        elFullScreen = self.getFullscreenElement(currentImage, self.closeFullScreen);

        el.parentNode.appendChild(elFullScreen);

        window.setTimeout(function onTimeout(){
            elFullScreen.classList.add("ontop");
            elFullScreen.classList.add("active");
        }, 0);

        active = true;

        cbShowFullScreen();
    };

    this.getFullscreenElement = function getFullscreenElement(data, onClose) {
        !data && (data = currentImage);

        var el = Evme.$create('div', {'id': "bgimage-overlay"},
                        '<div class="img" style="background-image: url(' + data.image + ')"></div>' +
                        '<div class="content">' +
                            ((data.query)? '<h2>' + data.query + '</h2>' : '') +
                            ((data.source)? '<div class="source"><b ' + Evme.Utils.l10nAttr(NAME, 'source-label') + '></b> <span>' + data.source + '</span></div>' : '') +
                            '<b class="close"></b>' +
                        '</div>');



        Evme.$(".close, .img", el, function onElement(el) {
            el.addEventListener("touchstart", function onTouchStart(e) {
                e.preventDefault();
                e.stopPropagation();
                onClose && onClose();
            });
        });

        if (data.source) {
            Evme.$(".content", el)[0].addEventListener("touchstart", function onTouchEnd(e){
                Evme.Utils.sendToOS(Evme.Utils.OSMessages.OPEN_URL, {
                    "url": data.source
                });
            });
        } else {
            el.classList.add("nosource");
        }

        return el;
    };

    this.closeFullScreen = function closeFullScreen(e) {
        if (elFullScreen && active) {
            self.cancelFullScreenFade();
            elFullScreen.classList.remove("active");

            window.setTimeout(function onTimeout(){
                Evme.$remove(elFullScreen);
            }, 700);

            e && e.preventDefault();
            cbHideFullScreen();
        }

        active = false;
    };

    this.isFullScreen = function isFullScreen() {
        return active;
    };

    this.get = function get() {
        return currentImage || {"image": defaultImage};
    };

    this.changeOpacity = function changeOpacity(value, duration, cb) {
        if (duration) {
            changeOpacityTransitionCallback = cb;
            elStyle.MozTransition = 'opacity ' + duration + 'ms linear';
            el.addEventListener('transitionend', transitionEnd);
        }
        this.closeFullScreen();
        elStyle.opacity = value;
    };

    function transitionEnd(e) {
        el.removeEventListener('transitionend', transitionEnd);
        elStyle.MozTransition = '';
        window.setTimeout(function onTimeout(){
            changeOpacityTransitionCallback && changeOpacityTransitionCallback();
            changeOpacityTransitionCallback = null;
        }, 0);
    }

    function removeCurrent() {
        if (elCurrentImage) {
            // Keep it as a local var cause it might change during this timeout
            var elRemove = elCurrentImage;
            elRemove.classList.remove("visible");
            currentImage = {};

            window.setTimeout(function onTimeout(){
                Evme.$remove(elRemove);
            }, TIMEOUT_BEFORE_REMOVING_OLD_IMAGE);
        }
    }

    function imageLoaded() {
        cbLoaded();
    }

    function cbUpdated(image) {
        Evme.EventHandler.trigger(NAME, "updated", {
            "image": image
        });
    }

    function cbLoaded() {
        Evme.EventHandler.trigger(NAME, "load", {
            "image": currentImage
        });
    }

    function cbShowFullScreen() {
        Evme.EventHandler.trigger(NAME, "showFullScreen");
    }

    function cbHideFullScreen() {
        Evme.EventHandler.trigger(NAME, "hideFullScreen");
    }
}