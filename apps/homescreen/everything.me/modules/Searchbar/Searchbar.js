Evme.Searchbar = new function() {
    var _name = "Searchbar", _this = this,
        $el = null, $form = null, $clear = null, $defaultText = null,
        value = "", Selection = null,
        timeoutSearchOnBackspace = null, timeoutPause = null, timeoutIdle = null,
        intervalPolling = null;
        
    var DEFAULT_TEXT = "FROM CONFIG",
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
        
        $("#button-back").bind("touchstart", function(){
            $(this).addClass("down");
        }).bind("click", function(e){
            $(this).removeClass("down");
            backButtonClick(e);
        });
        
        DEFAULT_TEXT = options.texts.defaultText;
        if (DEFAULT_TEXT) {
            $defaultText.html(DEFAULT_TEXT);
        }
        BUTTON_CLEAR = options.texts.clear;
        
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = options.timeBeforeEventPause;
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = options.timeBeforeEventIdle;
        
        Selection = new pseudoSelection();
        
        $("#button-clear").html(BUTTON_CLEAR).bind("touchstart", function(e){
            e.preventDefault();
            e.stopPropagation();
            clearButtonClick();
        });
        
        _this.bindEvents($el, cbFocus, inputKeyDown, inputKeyUp);
            
        $el.bind("blur", cbBlur);
            
        $el.bind("click", Selection.create);

        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.bindEvents = function($el, cbFocus, inputKeyDown, inputKeyUp){
        $el.bind("touchstart", cbFocus);
        
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
        $el[0].focus();
        cbFocus();
    };

    this.blur = function(e) {
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
    
    function backButtonClick(e) {
        e.stopPropagation();
        Evme.EventHandler.trigger(_name, "backButtonClick");
    }
    
    function pseudoSelection(){
        var self = this,
            $elSelection = null;
                
        function onClick(e){
            e.stopPropagation();
            e.preventDefault();
            _this.focus();
            self.cancel();
        }
        
        this.create = function(){
            if ($elSelection) {
                self.cancel();
            } else {
                var val = $el.val().replace(/</g, "&lt;");
                if (val == "") {
                    return;
                }
                
                $elSelection = $('<span id="search-selection"><span>' + val + '</span></span>');
                $elSelection.bind("touchstart", onClick)
                            .bind("mousedown", onClick);
                            
                $el.parent().append($elSelection);
                $el[0].setSelectionRange(0, 0);
            }
        };
        
        this.cancel = function(){
            if ($elSelection) {
                $elSelection.remove();
                $elSelection = null;
                $el[0].setSelectionRange(100000, 100000);
            }
        };
        
        this.isSelected = function(){
            return ($elSelection !== null);
        };
    }
    
    function nativeSelection(){
        var self = this,
            isSelected = false;
        
        this.create = function(){
            var end = $el.val().length;
        
            if (isSelected){
                //logger.debug('nativeSelection deselected');
                // deselect and move anchor to end
                isSelected = false;
            }
            else{
                // select
                //logger.debug('nativeSelection selected');
                $el[0].setSelectionRange(0, end);
                isSelected = true;    
            }
        };
        
        this.cancel = function(){
            //window.getSelection().getRangeAt(0).removeRange();
            //$el[0].setSelectionRange(end, end);
            isSelected = false;
        };
        
        this.isSelected = function(){
            return isSelected;
        };
    }

    function clearButtonClick() {
        Selection.cancel();
        _this.setValue("", false, true);
        
        if (SET_FOCUS_ON_CLEAR) {
            $el.focus();
        }
        
        window.setTimeout(function(){
            cbClear();
            cbEmpty();
        }, 0);
    }
    
    function inputKeyDown(e) {
        // Hack to disable keyboard- must be here to cancel the event
        if (Evme.Brain.Dialog.isActive()) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        
        if (e.keyCode !== RETURN_KEY_CODE && Selection.isSelected()) {
            $el.val("");
            Selection.cancel();
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
        //Do not use Evme.Utils.hideAddressBar() caus it has a delay that makes the address bar pop in a nasty way
        window.scrollTo(0,1);
        
        Brain && Brain[_name].onfocus({
            "e": e
        });
    }
    
    function cbBlur(e) {
        Selection.cancel();
        
        Brain && Brain[_name].onblur({
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