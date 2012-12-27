window.Evme.currentTip = null;

window.Evme.Tip = function Evme_Tip(_config, _onShow, _onHide) {
    var self = this, NAME = "Tips",
        el = null, elScreen = null,
        id = '', _data = {}, buttons = [], classes = [], closeAfter = false, showAfter = false,
        blockScreen = false, timesToShow = Infinity, timesShown = 0, closeOnClick = false,
        timeoutAutoHide = null,
        onHide = _onHide || null, onShow = _onShow || null,
        
        CSS_TRANSITION_TIME = 400;
    
    this.init = function init(options, bIgnoreStorage) {
        if ('enabled' in options && enabled.enabled === false) {
            return false;
        }
        
        id = "tip_" + options.id;
        text = options.text;
        _data = options._data || {};
        buttons = options.buttons || [];
        closeAfter = options.closeAfter;
        showAfter = options.showAfter || 0;
        classes = options.classes;
        closeOnClick = options.closeOnClick || false;
        timesToShow = options.timesToShow || Infinity;
        blockScreen = options.blockScreen || false;
        
        timesShown = options.ignoreStorage? 0 : Evme.Storage.get(id) || 0;
        
        if (timesShown < timesToShow && !Evme.$("#" + id)) {
            el = Evme.$create('div', {
                'id': id,
                'class': "tip",
                'data-l10n-id': Evme.Utils.l10nKey(NAME, options.id),
                'data-l10n-args': JSON.stringify(_data)
            });
            
            el.addEventListener("touchstart", click);
            
            if (classes) {
                for (var i=0; i<classes.length; i++) {
                    el.classList.add(classes[i]);
                }
            }
            
            addButtons();
            
            if (blockScreen) {
                elScreen = Evme.$create('div', {'class': "screen tip-screen", 'style': "opacity: 0;"});
                Evme.Utils.getContainer().appendChild(elScreen);
            }
            
            Evme.Utils.getContainer().appendChild(el);
            
            el.style.marginTop = -el.offsetHeight/2 + "px";
        }
        
        return self;
    };
    
    this.show = function show() {
        if (!el) {
            return false;
        }
        if (timesShown >= timesToShow) {
            return false;
        }
        
        if (window.Evme.currentTip) {
            window.Evme.currentTip.hide("other-tip");
        }
        
        window.setTimeout(function onTimeout(){
            elScreen && elScreen.classList.add("visible");
            el.classList.add("visible");
            
            if (closeAfter) {
                timeoutAutoHide = window.setTimeout(function onTimeout(){
                    self.hide("auto");
                }, closeAfter);
            }
            
            timesShown = timesShown + 1;
            Evme.Storage.set(id, timesShown);
            
            onShow && onShow(self);
        }, showAfter);
        
        window.Evme.currentTip = self;
        
        Evme.EventHandler.trigger(NAME, "show", {
            "id": id
        });
        
        return self;
    };
    
    this.hide = function hide(source) {
        if (!el) {
            return;
        }
        
        Evme.EventHandler.trigger(NAME, "hide", {
            "id": id,
            "source": ((typeof source == "string")? source : "external")
        });
        
        window.clearTimeout(timeoutAutoHide);
        
        elScreen && elScreen.classList.remove("visible");
        el.classList.remove("visible");
        
        window.setTimeout(function onTimeout(){
            el && el.removeEventListener("touchstart", click);
            
            Evme.$remove(elScreen);
            Evme.$remove(el);
            
            onHide && onHide(self);
            
            el = null;
        }, CSS_TRANSITION_TIME + 50);
        
        window.Evme.currentTip = null;
        
        return self;
    };
    
    this.id = function id() { return id; };
    
    function addButtons() {
        if (!buttons || buttons.length === 0) return;
        
        var elButtons = Evme.$create('div', {'class': "buttons"}),
            style = 'width: ' + 100/buttons.length + '%;';
        
        for (var i=0; i<buttons.length; i++) {
            var button = buttons[i],
                elButton = Evme.$create('div', {'style': style}, '<b>' + button.text + '</b>');
                
            elButton.addEventListener("click", function onClick(e) {
                this.removeEventListener("click", onClick);
                button.onclick(e);
            });
            
            elButtons.appendChild(elButton);
        }
        
        el.appendChild(elButtons);
        el.classList.add("has-buttons");
    }
    
    function click(e) {
        if (closeOnClick) {
            e.preventDefault();
            e.stopPropagation();
            self.hide("click");
        }
    }
    
    _config && self.init(_config);
};