Evme.Searchbar = new function() {
    var _name = "Searchbar", _this = this,
        $el = null, $form = null, $clear = null, $defaultText = null,
        value = "", isFocused = false,
        timeoutSearchOnBackspace = null, timeoutPause = null, timeoutIdle = null,
        intervalPolling = null;
        
    var DEFAULT_TEXT = "FROM CONFIG",
        BUTTON_CLEAR = "FROM CONFIG",
        SEARCHBAR_POLLING_INTERVAL = 300,
        TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE = 500,
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = "FROM CONFIG",
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = "FROM CONFIG",
        RETURN_KEY_CODE = 13,
        SET_FOCUS_ON_CLEAR = true,
        BACKSPACE_KEY_CODE = 8,
        DELETE_KEY_CODE = 46;

    this.init = function(options) {
        !options && (options = {});
        
        $el = options.$el;
        $defaultText = options.$defaultText;
        $form = options.$form;
        
        if (typeof options.setFocusOnClear == "boolean") {
            SET_FOCUS_ON_CLEAR = options.setFocusOnClear;
        }
        
        $form.bind("submit", function(e){
            e.preventDefault();
            e.stopPropagation();
            cbReturnPressed(e, $el.val());
        });
        
        DEFAULT_TEXT = options.texts.defaultText;
        if (DEFAULT_TEXT) {
            $defaultText.html(DEFAULT_TEXT);
        }
        BUTTON_CLEAR = options.texts.clear;
        
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = options.timeBeforeEventPause;
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = options.timeBeforeEventIdle;
        
        $("#button-clear").html(BUTTON_CLEAR).bind("touchstart", function(e){
            e.preventDefault();
            e.stopPropagation();
            clearButtonClick();
        }).bind("click", clearButtonClick);
        
        _this.bindEvents($el, cbFocus, inputKeyDown, inputKeyUp);
            
        $el.bind("blur", cbBlur);

        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.bindEvents = function($el, cbFocus, inputKeyDown, inputKeyUp){
        $el.bind("focus", cbFocus);
        
        $el.bind("keydown", inputKeyDown)
           .bind("keyup", inputKeyUp);
    };

    this.getValue = function() {
        return value;
    };
    
    this.setValue = function(_value, bPerformSearch, bDontBlur) {
        if (_value != "") {
            _this.showClearButton();
        }
        
        if (value !== _value) {
            value = _value;
            $el.val(value);

            if (bPerformSearch) {
                if (value == "") {
                    cbEmpty();
                } else {
                    cbValueChanged(value);
                }
            }

            if (!bDontBlur) {
                _this.blur();
            }
        }
    };

    this.clear = function() {
        _this.hideClearButton();
        value = "";
        $el[0].value = "";
    };

    this.focus = function() {
        if (isFocused) return;
        
        $el[0].focus();
        cbFocus();
    };

    this.blur = function(e) {
        if (!isFocused) return;
        
        $el[0].blur();
        cbBlur(e);
    };
    
    this.getElement = function() {
        return $el;
    };

    this.startRequest = function() {
        pending = true;
    };

    this.endRequest = function() {
        pending = false;
    };

    this.isWaiting = function() {
        return pending;
    };
    
    this.hideClearButton = function() {
        $("#search-header").removeClass("clear-visible");
    };
    
    this.showClearButton = function() {
        $("#search-header").addClass("clear-visible");
    };
    
    function clearButtonClick() {
        _this.setValue("", false, true);
        
        if (SET_FOCUS_ON_CLEAR) {
            $el.focus();
        }
        
        window.setTimeout(function(){
            cbClear();
            cbEmpty();
        }, 0);
        
        Evme.EventHandler.trigger(_name, "clearButtonClick");
    }
    
    function inputKeyDown(e) {
        // Hack to disable keyboard- must be here to cancel the event
        if (Evme.Brain.Dialog.isActive()) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        window.clearTimeout(timeoutPause);
        window.clearTimeout(timeoutIdle);
    }
    
    function inputKeyUp(e) {
        var _value = $el.val();
        
        if (_value !== value) {
            value = _value;

            if (value == "") {
                timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
                cbEmpty();
            } else {
                _this.showClearButton();
                if (e.keyCode == BACKSPACE_KEY_CODE) {
                    timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
                    timeoutSearchOnBackspace = window.setTimeout(function(){
                        cbValueChanged(value);
                    }, TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE);
                } else {
                    cbValueChanged(value);
                }
            }
        } else {
            if (e.keyCode == RETURN_KEY_CODE) {
                cbReturnPressed(e, value);
            }
        }
    }

    function pasted(e) {
        //
         // Setting timeout because otherwise the value of the input is the one
         // before the paste.
         //
        window.setTimeout(function(){
            inputKeyUp({
                "keyCode": ""
            });
        }, 0);
    }

    function cbValueChanged(val) {
        timeoutPause = window.setTimeout(cbPause, TIMEOUT_BEFORE_SENDING_PAUSE_EVENT);
        timeoutIdle = window.setTimeout(cbIdle, TIMEOUT_BEFORE_SENDING_IDLE_EVENT);
        
        Evme.EventHandler.trigger(_name, "valueChanged", {
            "value": val
        });
    }
    
    function cbEmpty() {
        _this.hideClearButton();
        Evme.EventHandler.trigger(_name, "empty", {
            "sourceObjectName": _name
        });
    }
    
    function cbReturnPressed(e, val) {
        Evme.EventHandler.trigger(_name, "returnPressed", {
            "e": e,
            "value": val
        });
    }
    
    function cbClear() {
        Evme.EventHandler.trigger(_name, "clear");
    }
    
    function cbFocus(e) {
        if (isFocused) return;
        isFocused = true;
        
        Evme.Brain && Evme.Brain[_name].onfocus({
            "e": e
        });
    }
    
    function cbBlur(e) {
        if (!isFocused) return;
        isFocused = false;
        
        Evme.Brain && Evme.Brain[_name].onblur({
            "e": e
        });
    }
    
    function cbPause(e) {
        Evme.EventHandler.trigger(_name, "pause", {
            "query": value
        });
    }
    
    function cbIdle(e) {
        Evme.EventHandler.trigger(_name, "idle", {
            "query": value
        });
    }
}