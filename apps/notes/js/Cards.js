
var Cards = function(_options) {
    var _this = this,
        elContainer = null, cardElements = [], drawerWidth = 0, cardWidth = 0, currentIndex = -1,
        hasDrawer = false, transitionDuration = 0, transitionEasing = "",
        onMove = null;

    var CLASS_WHEN_ACTIVE = "active",
        CLASS_DRAWER = "drawer",
        DEFAULT_TRANSITION_DURATION = 400,
        DEFAULT_TRANSITION_EASING = "ease";
        
    this.CARDS = {};
    
    this.init = function(options) {
        !options && (options = {});
        
        onMove = options.onMove;
        elContainer = options.container || document.querySelector(".cards");
        
        elContainer.style.cssText += '; position: relative; overflow: hidden; min-height: 100%;';
        
        cardWidth = drawerWidth = elContainer.offsetWidth;
        cardElements = elContainer.getElementsByClassName("card");
        
        transitionDuration = options.transitionDuration || DEFAULT_TRANSITION_DURATION;
        transitionEasing = options.transitionEasing || DEFAULT_TRANSITION_EASING;
        
        initCards();
    };

    this.goTo = function(index) {
        if (typeof index == "string") {
            index = getIndexById(index);
        }
        
        if (index < 0 || index >= cardElements.length) {
            return _this;
        }
        
        for (var i=0, l=cardElements.length; i<l; i++) {
            var pos = 0,
                zIndex = 10,
                el = cardElements[i];

            if (i < index) {
                pos = -((index-i)*cardWidth);
            } else if (i > index) {
                pos = (i-index)*cardWidth;
            } else {
                pos = 0;
                zIndex = 100;
            }

            if (hasDrawer) {
                if (index == 0 && i == 1) {
                    pos = pos - cardWidth + drawerWidth;
                }
            }

            el.style.cssText += "; z-index: " + zIndex + ";" +
                                 "-moz-transform: translate3d(" + pos + "px, 0, 0); " +
                                 "-webkit-transform: translate3d(" + pos + "px, 0, 0); ";
        }
        
        cardElements[currentIndex].classList.remove(CLASS_WHEN_ACTIVE);
        document.body.classList.remove("card-" + cardElements[currentIndex].id);
        currentIndex = index;
        cardElements[currentIndex].classList.add(CLASS_WHEN_ACTIVE);
        document.body.classList.add("card-" + cardElements[currentIndex].id);
        
        onMove && onMove(currentIndex);

        return _this;
    };

    function initCards() {
        var defaultIndex = 0;

        for (var i=0, l=cardElements.length; i<l; i++) {
            var el = cardElements[i];

            el.style.cssText += "; position: absolute; top: 0; left: 0; width: " + cardWidth + "px; min-height: 100%;";

            if (el.className.indexOf(CLASS_WHEN_ACTIVE) !== -1) {
                currentIndex = i;
                defaultIndex = i;
            }
            if (el.className.indexOf(CLASS_DRAWER) !== -1) {
                hasDrawer = true;
                el.isDrawer = true;
                drawerWidth -= el.getAttribute("data-gutter");
                el.style.cssText += "; width: " + drawerWidth + "px;";
            }

            _this.CARDS[el.id.toUpperCase().replace(/-/g, "_")] = el.id;

            addDefaultButtons(el, i);
        }

        _this.goTo(defaultIndex);

        window.setTimeout(enableAnimation, 0);
    }

    function addDefaultButtons(el, index) {
        var buttons = el.getElementsByClassName("card-prev");
        for (i=0; i<buttons.length; i++) {
            buttons[i].addEventListener("click", function(){
                _this.goTo(index-1);
            });
        }
        buttons = el.getElementsByClassName("card-next");
        for (i=0; i<buttons.length; i++) {
            buttons[i].addEventListener("click", function(){
                _this.goTo(index+1);
            });
        }
    }
    
    function enableAnimation() {
        for (var i=0, l=cardElements.length; i<l; i++) {
            var duration = transitionDuration;
            
            if (cardElements[i].isDrawer) {
                // duration should be proportionate so that there won't be the movement gap
            }
            
            cardElements[i].style.cssText += "; -moz-transition: all " + duration + "ms " + transitionEasing + ";" +
                                             "; -webkit-transition: all " + duration + "ms " + transitionEasing + ";";
        }
    }
    
    function getIndexById(cardId) {
        for (var i=0, l=cardElements.length; i<l; i++) {
            if (cardElements[i].id == cardId) {
                return i;
            }
        }

        return -1;
    }

    _this.init(_options);
};