Evme.ShortcutsCustomize = new function Evme_ShortcutsCustomize() {
    var NAME = 'ShortcutsCustomize', self = this,
        elList = null, elParent = null,
        savedIcons = null;
        
    this.init = function init(options) {
        elParent = options.elParent;
        
        elList = Evme.$create('select', {'multiple': "multiple", 'id': "shortcuts-select"});
        elList.addEventListener('blur', onHide);
        
        elParent.appendChild(elList);
        
        Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.show = function show() {
        elList.focus();
        
        Evme.EventHandler.trigger(NAME, 'show');
    };
    
    this.hide = function hide() {
        window.focus();
        elList.blur();
    };
    
    this.get = function get() {
        var shortcuts = [],
            elShourtcuts = Evme.$('option', elList);
        
        for (var i=0, elOption=elShourtcuts[i]; elOption; elOption=elShourtcuts[++i]) {
            if (elOption.selected) {
                shortcuts.push(elOption.value);
            }
        }
        
        return shortcuts;
    };
    
    this.load = function load(data) {
        savedIcons = data.icons;
        
        elList.innerHTML = '';
        self.add(data.shortcuts);
        
        Evme.EventHandler.trigger(NAME, 'load');
    };
    
    this.add = function add(shortcuts) {
        var html = '';
        
        for (var query in shortcuts) {
            html += '<option value="' + query.replace(/"/g, '&quot;') + '"';
            
            if (shortcuts[query]) {
                html += ' selected="selected"';
            }
            
            html += '>' + query.replace(/</g, '&lt;') + '</option>';
        }
        
        elList.innerHTML = html;
    };
    
    this.Loading = new function Loading() {
        var active = false,
            ID = 'shortcuts-customize-loading';
        
        this.show = function loadingShow() {
            if (active) return;
            
            var el = Evme.$create('div',
                        {'id': ID},
                        '<b ' + Evme.Utils.l10nAttr(NAME, 'loading') + '></b>' +
                        '<div class="loading-wrapper">' +
                            '<progress class="loading-icon small"></progress>' +
                        '</div>' +
                        '<menu>' +
                            '<button ' + Evme.Utils.l10nAttr(NAME, 'loading-cancel') + '></button>' +
                        '</menu>');
                      
            Evme.$("button", el, function onItem(elButton) {
                elButton.addEventListener("click", onLoadingCancel)
            });
            
            Evme.Utils.getContainer().appendChild(el);
            
            active = true;
            
            Evme.EventHandler.trigger(NAME, 'loadingShow');
        };
        
        this.hide = function loadingHide() {
            if (!active) return;
            
            Evme.$remove('#' + ID);
            active = false;
            
            Evme.EventHandler.trigger(NAME, 'loadingHide');
        };
    };
    
    function onHide() {
        Evme.EventHandler.trigger(NAME, 'hide');
        
        done();
    }
    
    function onLoadingCancel(e) {
        Evme.EventHandler.trigger(NAME, 'loadingCancel', {
            'e': e
        });
    }
    
    function done() {
        var shortcuts = self.get();
        
        Evme.EventHandler.trigger(NAME, 'done', {
            'shortcuts': shortcuts,
            'icons': savedIcons
        });
    }
};