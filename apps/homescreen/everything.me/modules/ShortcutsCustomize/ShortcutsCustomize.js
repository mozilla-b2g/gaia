Evme.ShortcutsCustomize = new function() {
    var _name = 'ShortcutsCustomize', _this = this,
        $list = null,
        numSelectedStartedWith = 0, numSuggestedStartedWith = 0, savedIcons = null;
        
    this.init = function(options) {
        $parent = options.$parent;
        
        $list = $('<select multiple="multiple" id="shortcuts-select"></select>');
        $list.bind('change', done);
        $list.bind('blur', onHide);
        
        $parent.append($list);
        
        Evme.EventHandler.trigger(_name, 'init');
    };
    
    this.show = function() {
        $list.focus();
        
        Evme.EventHandler.trigger(_name, 'show', {
            'numSelected': numSelectedStartedWith,
            'numSuggested': numSuggestedStartedWith
        });
    };
    
    this.hide = function() {
        $('window').focus();
        $list.blur();
    };
    
    this.get = function() {
        var $items = $list.find('option'),
            shortcuts = [];
        
        for (var i=0; i<$items.length; i++) {
            if ($items[i].selected) {
                shortcuts.push($items[i].value);
            }
        }
        
        return shortcuts;
    };
    
    this.load = function(data) {
        var shortcuts = data.shortcuts;
            
        numSelectedStartedWith = 0;
        numSuggestedStartedWith = 0;
        savedIcons = data.icons;
        
        $list.empty();
        _this.add(shortcuts);
        
        Evme.EventHandler.trigger(_name, 'load');
    };
    
    this.add = function(shortcuts) {
        var html = '';
        
        for (var query in shortcuts) {
            html += '<option value="' + query.replace(/"/g, '&quot;') + '"';
            
            if (shortcuts[query]) {
                html += ' selected="selected"';
                numSelectedStartedWith++;
            } else {
                numSuggestedStartedWith++;
            }
            
            html += '>' + query.replace(/</g, '&lt;') + '</option>';
        }
        
        $list.append(html);
    };
    
    this.Loading = new function() {
        var active = false,
            ID = 'shortcuts-customize-loading',
            TEXT_CANCEL = "Cancel";
        
        this.show = function() {
            if (active) return;
            
            var $el = $('<div id="' + ID + '"><menu><button>' + TEXT_CANCEL + '</button></menu></div>');
            $('#' + Evme.Utils.getID()).append($el);
            active = true;
            
            $el.find("button").bind("click", onLoadingCancel);
        };
        
        this.hide = function() {
            if (!active) return;
            
            $('#' + ID).remove();
            active = false;
        };
    };
    
    function onHide() {
        Evme.EventHandler.trigger(_name, 'hide');
    }
    
    function onLoadingCancel(e) {
        Evme.EventHandler.trigger(_name, 'loadingCancel', {
            'e': e
        });
    }
    
    function done() {
        var shortcuts = _this.get();
        
        Evme.EventHandler.trigger(_name, 'done', {
            'shortcuts': shortcuts,
            'icons': savedIcons,
            'numSelectedStartedWith': numSelectedStartedWith,
            'numSuggestedStartedWith': numSuggestedStartedWith,
            'numSelected': shortcuts.length,
            'numSuggested': $list.find('option').length - shortcuts.length
        });
    }
};