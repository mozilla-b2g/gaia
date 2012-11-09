/*
 * APIStatsEvents class
 */
Evme.APIStatsEvents = function(Sandbox){
    var _this = this, config, logger, processedItems, tracker = Sandbox.DoATAPI, tempEventArr = [], templatesStr = "",
        templates = {
            "Results_search": {
                "userEvent": "pageView",
                "page": "searchResults",
                "query": "{query}",
                "type": "{type}",
                "feature": "{feature}",
                "src": "{source}"
            },
            
            "Searchbar_returnPressed": {
                "userEvent": "keyboardReturnClick"
            },
            
            "suggestions_click": {
                "userEvent":"suggestionsClick",
                "idx": "{index}",
                "visible": "{visible}"
            },
            
            "history_click": {
                "userEvent":"historyClick",
                "idx": "{index}"
            },
            
            "didyoumean_click": {
                "userEvent":"spellingClick",
                "idx": "{index}"
            },
            
            "refine_click": {
                "userEvent":"disambiguationClick",
                "idx": "{index}"
            },

            "Shortcut_click": {
                "userEvent": "shortcutsClick",
                "idx": "{index}"
            },
            "Shortcuts_categoryPageShow": {
                "userEvent": "shortcutsCategoryPageShow",
                "query": "{query}"
            },
            "ShortcutsCustomize_show": {
                "userEvent": "shortcutsFavoritesShow",
                "numSelected": "{numSelected}",
                "numSuggested": "{numSuggested}"
            },
            "ShortcutsCustomize_done": {
                "userEvent": "shortcutsFavoritesDoneClick",
                "numSelected": "{numSelected}",
                "numSuggested": "{numSuggested}",
                "numSelectedStartedWith": "{numSelectedStartedWith}",
                "numSuggestedStartedWith": "{numSuggestedStartedWith}"
            },
            
            "HomepageTip_show": {
                "userEvent": "hptipShow"
            },
            "HomepageTip_buttonClick": {
                "userEvent": "hptipHide",
                "src": "button"
            },
            "HomepageTip_backgroundClick": {
                "userEvent": "hptipHide",
                "src": "background"
            },
            
            "BackgroundImage_showFullScreen": {
                "userEvent":"imageFullScreen"
            },
            
            "AppsMore_show": {
                "userEvent":"loadMore"
            },
            
            "Core_redirectedToApp": {
                "userEvent": "appClick",
                "url": "{url}",
                "rowIdx": "{rowIndex}",
                "totalRows": "{totalRows}",
                "colIdx": "{colIndex}",
                "totalCols": "{totalCols}",
                "keyboardVisible": "{keyboardVisible}",
                "more": "{more}",
                "appName": "{appName}",
                "appId": "{appId}",
                "query": "{query}",
                "feature": "{source}"
            },
            
            "Core_returnedFromApp": {
                "userEvent": "returnedFromApp",
                "lengthInSeconds": "{elapsedTime}",
                "query": "{query}",
                "feature": "{source}",
                "appName": "{appName}",
                "appId": "{appId}"
            },
            
            "DoATAPI_sessionInitOnPageLoad": {
                "userEvent": "sessionInitOnPageLoad"
            },
            
            "Tips_show": {
                "userEvent": "tipImpression",
                "tipId": "{id}"
            },
            "Tips_hide": {
                "userEvent": "tipHide",
                "tipId": "{id}",
                "source": "{source}"
            },
            "Tips_click": {
                "userEvent": "tipClick",
                "tipId": "{id}"
            },
            
            "Prompt_show": {
                "userEvent": "promptShow",
                "prompt": "{id}",
                "text": "{text}"
            },
            "Prompt_click": {
                "userEvent": "promptClick",
                "prompt": "{id}",
                "text": "{text}"
            },
            "Prompt_dismiss": {
                "userEvent": "promptDismiss",
                "prompt": "{id}",
                "text": "{text}"
            },
            "Core_requestInvite": {
                "userEvent": "promptRequestInvite",
                "text": "{promptText}",
                "systemText": "{systemText}",
                "email": "{email}",
            },

            "Url_goTo": {
                "userEvent": "pageView",
                "page": "{page}",
                "src": "{source}"
            }
        };
        
    this.name = "APIStatsEvents";
    
    this.init = function(_config, _logger){
        // set config
        config = _config;
        logger = _logger;
        
        // add common params
        for (var k in templates){
            templates[k]["sessionId"] = "{sid}";
            templates[k]["elapsed"] = "{elapsed}";
            templates[k]["deviceId"] = Evme.DoATAPI.getDeviceId();
        }
        
        // stringify templates
        templatesStr = stringify(templates);

        // log 
        logger.debug(_this.name+".init(",config,")");
    };
    
    function stringify(old){
        var temp = {};
        
        for (key in old){
            var value = old[key];
                value = JSON.stringify(value);
            temp[key] = value;
        }
        
        return temp;
    }
    
    // actual report
    this.dispatch = function(items){
        // leave if no items
        if (!items.length) { return false;}
        
        // process
        items = process(items);
        
        // report   
        items.length && tracker.report({
            "data": "["+ items.toString()+"]"
        });
    
        // log
        logger.debug(_this.name+".dispatch(", items,")");
    };
    
    function process(items){
        processedItems = [];
        
        // make into an array if not
        if (!(items instanceof Array)){
            items = [items];
        }
        
        // process
        items.forEach(function(item){
            
            // authenticate
            if (authenticate(item)) {
                
                // render template
                var template = templatesStr[item["class"]+"_"+item["event"]]
                    data = renderTemplate(template, item["data"]);
                
                data && processedItems.push( data );
            }
        });
        
        return processedItems;
    }    
    
    function authenticate(item){
        var method = item["class"]+"_"+item["event"];
        return method in templates;
    }
    
    // template rendering
    function renderTemplate(str, attrArr) {
        if (str && attrArr) {
            for ( var key in attrArr ) {
                str = str.replace("{" + key + "}", attrArr[key]);
            }
        }
        return str;
    }
}