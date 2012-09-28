function Scroll(el, options, hasFixedPositioning){
    var object = hasFixedPositioning ? NativeScroll : iScroll;
    return new object(el, options);
}

function NativeScroll(el, _options){
    var _this = this, onScrollEndTimeout, isScrolling = false,
        isTouch = ('ontouchstart' in window);
        
    var options = {
        "hScroll": true,
        "vScroll": true
    };
        
    // init
    (function(){
        // override defaults
        for (i in _options) { options[i] = _options[i] }
        
        // set style
        css(el, {
            /*"overflow-x": options.hScroll ? "scroll" : "hidden",
            "overflow-y": options.vScroll ? "scroll" : "hidden",*/
            "overflow": "scroll",
            "-webkit-overflow-scrolling": "touch"
        });
        
        // bind events
        el.addEventListener("scroll", onScrollMove, false);
        options.onScrollMove && el.addEventListener("scroll", options.onScrollMove, false);
    })();
    
    _this.y = 0; // holds el.scrollTop
    
    this.refresh = function(){};
    
    function onScrollStart(){
        // save state
        isScrolling = true;
        
        // external callback
        options.onScrollStart && options.onScrollStart();
        
        // add "touchend" listener
        isTouch && el.addEventListener("touchend", onScrollEnd, false);
    }
    
    function onScrollMove(e){
        // if first move, fire onScrollStart
        !isScrolling && onScrollStart();
        
        // update y
        _this.y = el.scrollTop*-1;
        
        // determine scrollEnd
        if (!isTouch){
            onScrollEndTimeout && clearTimeout(onScrollEndTimeout);        
            onScrollEndTimeout = setTimeout(function(){
                onScrollEnd();
            }, 100);
        }
    }
    
    function onScrollEnd(){        
        // save state
        isScrolling = false;
        
        // external callback
        options.onTouchEnd && options.onTouchEnd();
        
        // remove "touchend" listener
        isTouch && el.removeEventListener("touchend", onScrollEnd, false);
    }
    
    function css(el, rules){
        var str = "";
        for (i in rules){ str += i+":"+rules[i]+";"; }
        el.style.cssText += ";"+str;
    }
}