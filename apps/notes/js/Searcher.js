var Searcher = new function() {
    var _this = this,
        elInput = null,
        searchNotes = [], searchFields = [], lastValueSearched = "",
        onSearch = null, onInputBlur = null, onInputFocus = null;
        
    this.init = function(options) {
        elInput = options.input;
        onSearch = options.onSearch;
        onInputFocus = options.onInputFocus;
        onInputBlur = options.onInputBlur;
        
        _this.setData(options.data, options.fields);
        
        elInput.addEventListener("focus", onFocus);
        elInput.addEventListener("keyup", onKeyUp);
        elInput.addEventListener("blur", onBlur);
    };
    
    this.setData = function(_notes, _fields) {
        _notes && (searchNotes = _notes);
        _fields && (searchFields = _fields);
        
        if (!(searchFields instanceof Array)) {
            searchFields = [searchFields];
        }
        if (!(searchNotes instanceof Array)) {
            searchNotes = [searchNotes];
        }
    };
    
    this.search = function(keyword) {
        var results = [],
            regexMatch = new RegExp("(" + keyword + ")", "ig");
        
        if (!keyword) {
            return results;
        }
        
        for (var id in searchNotes) {
            var item = searchNotes[id],
                match = 0;
            
            for (var j=0,jl=searchFields.length; j<jl; j++) {
                var val = item["data_" + searchFields[j]],
                    matches = val.match(regexMatch);
                    
                if (matches && matches.length) {
                    match += matches.length;
                }
            }
            
            if (match) {
                item._matches = match;
                results.push(item);
            }
        }
        
        results.sort(function(a, b){
            return a._matches > b._matches? -1 : a._matches < b._matches? 1 : 0;
        });
        
        return results;
    };
    
    this.value = function() {
        return lastValueSearched;
    };
    
    this.focus = function() {
        elInput.focus();
    };
    
    function onFocus(e) {
        onInputFocus && onInputFocus(e);
    }
    
    function onBlur(e) {
        onInputBlur && onInputBlur(e);
    }
    
    function onKeyUp(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (lastValueSearched == this.value) {
            return;
        }
        
        lastValueSearched = this.value;
        
        var items = _this.search(lastValueSearched);
        onSearch && onSearch(items, lastValueSearched, searchFields);
    }
};