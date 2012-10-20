Evme.Dialog = function(_id) {
    var _name = "Dialog", _this = this, $el = null, $elBlackout = null,
        id = _id, isBlackout = false, blackoutCallback = null, centered = false,
        waitingOnCloseTimeout = false, timeoutBeforeClickThrough = false;
    
    if (!id) {
        throw new Exception("Please provide an ID for the dialog");
    }
    
    this.getId = function() {
        return id;
    };
    
    this.show = function(options) {
        if ($el) {
            window.setTimeout(function(){
                $el.addClass("visible");
                $elBlackout && $elBlackout.addClass("visible");
            }, 50);
            
            if (centered) {
                _this.center();
            }
            
            cbShow();
            
            if (timeoutBeforeClickThrough) {
                waitingOnCloseTimeout = true;
                window.setTimeout(function() {
                    waitingOnCloseTimeout = false;
                }, timeoutBeforeClickThrough);
            }
        } else {
            createDialog(options);
        }
        
        return _this;
    };
    
    this.remove = function() {
        $el && $el.remove();
        $elBlackout && $elBlackout.remove();
        cbRemove();
    };
    
    this.center = function() {
        $el.css({
            "top": "50%",
            "margin-top": "-" + $el.height()/2 + "px"
        });
    };
    
    this.getElement = function() {
        return $el;
    };
    
    this.clickOK = function() {
        $el.find("b.ok").trigger("touchstart");
    };
    
    this.clickCancel = function() {
        $el.find("b.cancel").click();
    };
    
    function createDialog(options) {
        (!options.className) && (options.className = "");
        
        $el = $('<div class="dialog ' + options.className + '" id="dialog_' + id + '">' +
                    ((options.title)? '<h2>' + options.title + '</h2>' : '') +
                    '<div class="content">' +
                        options.content +
                    '</div>' +
                '</div>');
                
        $el.bind("touchstart", function(e){
            e.preventDefault();
            e.stopPropagation();
        });
        
        if (options.tip) {
            $el.append($('<span class="tiparrow"></span>'));
        }
        
        if (options.buttons) {
            var buttons = options.buttons,
                $buttons = $('<div class="buttons"></div>');
                
            for (var buttonId in buttons) {
                $buttons.append(createButton(buttonId, buttons[buttonId]));
            }
            
            $el.append($buttons);
        }
        
        centered = options.centered;
        isBlackout = options.blackout;
        timeoutBeforeClickThrough = options.timeoutBeforeClickThrough;
        
        var $container = options.$container || $("#" + Evme.Utils.getID());
        $container.append($el);
        
        if (isBlackout) {
            createBlackoutScreen(options.blackoutCallback);
            $container.append($elBlackout);
        }
        
        cbCreate();
        _this.show();
        
        return _this;
    }
    
    function createBlackoutScreen(callback) {
        $elBlackout = $('<div class="dialog-blackout"></div>');
        $elBlackout.bind("touchstart", function(e){
            if (!waitingOnCloseTimeout) {
                callback && callback(e);
                cbBlackoutClick(e);
            }
        });
                    
        return $elBlackout;
    }
    
    function createButton(buttonType, button) {
        $button = $('<b class="button ' + buttonType + '">' + button.text + '</b>');
        
        var buttonCallback = function(e){
            e.preventDefault();
            e.stopPropagation();
            
            button.callback && button.callback(e, _this);
            
            cbButtonClick(e, buttonType);
            
            if (button.remove) {
                _this.remove();
            }
        };
        
        var buttonClicked = false;
        
        $button.bind("touchstart", buttonCallback);
            
        if (button.entireDialog) {
            $el.bind("touchstart", function(e){
                if (!buttonClicked && !waitingOnCloseTimeout) {
                    buttonCallback(e);
                }
            });
        }
        
        return $button;
    }
    
    function cbCreate() {
        Evme.EventHandler.trigger(_name, "create", {
            "id": id,
            "obj": _this,
            "isBlackout": isBlackout,
            "$el": $el
        });
    }
    
    function cbShow() {
        Evme.EventHandler.trigger(_name, "show", {
            "id": id,
            "obj": _this,
            "isBlackout": isBlackout,
            "$el": $el
        });
    }
    
    function cbBlackoutClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        Evme.EventHandler.trigger(_name, "blackoutClick", {
            "id": id
        });
    }
    
    function cbButtonClick(e, button) {
        Evme.EventHandler.trigger(_name, "buttonClick", {
            "e": e,
            "id": id,
            "obj": _this,
            "$el": $el,
            "button": button
        });
    }
    
    function cbRemove() {
        Evme.EventHandler.trigger(_name, "remove", {
            "id": id,
            "obj": _this,
            "isBlackout": isBlackout,
            "$el": $el
        });
    }
};

var Prompt = function(_options) {
    var _name = "Prompt", _this = this,
        $parent = null, $el = null, id = "", text = "", className = "", storageKey = false,
        onShow = null, onClick = null, onDismiss= null;
    
    var STORAGE_PREFIX = "prompt_";
    
    this.show = function(options) {
        id = options.id;
        text = options.text;
        className = options.className;
        $parent = options.$parent;
        onShow = options.onShow;
        onClick = options.onClick;
        onDismiss = options.onDismiss;
        
        storageKey = STORAGE_PREFIX + id;
        
        var shown = Evme.Storage.enabled() && Evme.Storage.get(storageKey);
        if (shown) {
            return false;
        }
        if ($("#" + storageKey).length > 0) {
            return false;
        }
        
        $el = $('<div id="' + storageKey + '" class="prompt textpage ' + (className? className : '') + '">' + text + '<b class="close"></b></div>');
        $el.bind("touchstart", function(e) {
            e && e.preventDefault();
            e && e.stopPropagation();
            
            cbClick();
        });
        $el.find(".close").bind("touchstart", function(e){
            e && e.preventDefault();
            e && e.stopPropagation();
            
            _this.hide(true);
        });
        
        $parent.append($el);
        
        window.setTimeout(function(){
            $el.addClass("visible");
            $container.addClass("prompt-visible");
            cbShow();
        }, 50);
        
        return true;
    };
    
    this.hide = function(fireCallback) {
        $el.removeClass("visible");
        $container.removeClass("prompt-visible");
        window.setTimeout(function(){
            $el && $el.remove();
        }, 500);
        
        if (fireCallback) {
            cbDismiss();
        }
    };
    
    this.markAsShown = function() {
        Evme.Storage.set(storageKey, true);
    };
    
    function cbShow() {
        onShow && onShow();
        Evme.EventHandler.trigger(_name, "show", {
            "id": id,
            "text": text
        });
    }
    function cbClick() {
        onClick && onClick();
        Evme.EventHandler.trigger(_name, "click", {
            "id": id,
            "text": text
        });
    }
    function cbDismiss() {
        onDismiss && onDismiss();
        Evme.EventHandler.trigger(_name, "dismiss", {
            "id": id,
            "text": text
        });
    }
    
    _options && _this.show(_options);
};