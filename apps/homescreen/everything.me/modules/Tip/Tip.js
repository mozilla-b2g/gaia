(function() {
    var currentTip = null;
    
    var Tip = function(_config, _onShow, _onHide) {
        var _this = this,
            _name = "Tips",
            $el = null, $elScreen = null,
            text = "", buttons = [], className = "", closeAfter = false, showAfter = false,
            blockScreen = false, timesToShow = Infinity, timesShown = 0, closeOnClick = false,
            timeoutAutoHide = null,
            onHide = _onHide || null, onShow = _onShow || null;
            
        var CSS_TRANSITION_TIME = 400;
        
        this.init = function(options, bIgnoreStorage) {
            if (options.enabled === false) {
                return;
            }
            
            id = "tip_" + options.id;
            text = options.text;
            buttons = options.buttons || [];
            closeAfter = options.closeAfter;
            showAfter = options.showAfter || 0;
            className = options.className;
            closeOnClick = options.closeOnClick || false;
            timesToShow = options.timesToShow || Infinity;
            blockScreen = options.blockScreen || false;
            
            timesShown = options.ignoreStorage? 0 : Evme.Storage.get(id) || 0;
            
            if (timesShown < timesToShow && $("#" + id).length == 0) {
                $el = $('<div id="' + id + '" class="tip">' + text + '</div>');
                
                $el.bind("touchstart", click);
                
                if (className) {
                    $el.addClass(className);
                }
                
                addButtons();
                
                if (blockScreen) {
                    $elScreen = $('<div class="screen tip-screen" style="opacity: 0;"></div>');
                    $("#" + Evme.Utils.getID()).append($elScreen);
                }
                
                $("#" + Evme.Utils.getID()).append($el);
                
                $el.css("margin-top", -($el.height()/2) + "px");
            }
            
            return _this;
        };
        
        this.show = function() {
            if (!$el) return;
            if (timesShown >= timesToShow) return;
            
            if (currentTip) {
                currentTip.hide("other-tip");
            }
            
            window.setTimeout(function(){
                $elScreen && $elScreen.addClass("visible");
                $el.addClass("visible");
                
                if (closeAfter) {
                    timeoutAutoHide = window.setTimeout(function(){
                        _this.hide("auto");
                    }, closeAfter);
                }
                
                timesShown++;
                Evme.Storage.set(id, timesShown);
                
                onShow && onShow(_this);
            }, showAfter);
            
            currentTip = _this;
            
            Evme.EventHandler.trigger(_name, "show", {
                "id": id
            });
            
            return _this;
        };
        
        this.hide = function(source) {
            if (!$el) return;
            
            Evme.EventHandler.trigger(_name, "hide", {
                "id": id,
                "source": ((typeof source == "string")? source : "external")
            });
            
            window.clearTimeout(timeoutAutoHide);
            
            $elScreen && $elScreen.removeClass("visible");
            $el.removeClass("visible");
            
            window.setTimeout(function(){
                $elScreen && $elScreen.remove();
                $el.remove();
                onHide && onHide(_this);
                $el = null;
            }, CSS_TRANSITION_TIME + 50);
            
            currentTip = null;
            
            return _this;
        };
        
        this.id = function() { return id; };
        
        function addButtons() {
            if (!buttons || buttons.length === 0) return;
            
            var $buttons = $('<div class="buttons"></div>'),
                style = 'style="width: ' + 100/buttons.length + '%;"';
            
            for (var i=0; i<buttons.length; i++) {
                var button = buttons[i],
                    $button = $('<div ' + style + '><b>' + button.text + '</b></div>');
                    
                $button.bind("click", button.onclick);
                    
                $buttons.append($button);
            }
            
            $el.append($buttons);
            $el.addClass("has-buttons");
        }
        
        function click(e) {
            if (closeOnClick) {
                e.preventDefault();
                e.stopPropagation();
                _this.hide("click");
            }
        }
        
        _config && _this.init(_config);
    };
    
    window.Evme.Tip = Tip;
})();