Evme.Tests = new function() {
    var _this = this, tests = {}, $body = null, $head = null, configData = {}, userGroups = {};
    
    var BASE_STYLES_URL = "/css/tests/",
        STORAGE_KEY = "tests";
    
    this.NOT_IN_TEST = "main";
    
    this.init = function(options) {
        !options && (options = {});
        
        $body = $(document.body);
        $head = $("head");
        
        configData = options.config;
        
        populateGroupsFromStorage();
        
        var _tests = options.tests || [],
            activeTestsKeys = {};
        
        for (var i=0; i<_tests.length; i++) {
            var test = _tests[i];
            
            tests[test.name] = test;
            activeTestsKeys[test.storageKey] = true;
            
            var group = _this.divideIntoGroup(test);
            
            if (group != _this.NOT_IN_TEST) {
                _this.applyTestChanges(test, group);
            }
        }
        
        for (var key in userGroups) {
            if (!activeTestsKeys[key]) {
                delete userGroups[key];
            }
        }
        
        Evme.Storage.set(STORAGE_KEY, JSON.stringify(userGroups));
    };
    
    function populateGroupsFromStorage() {
        userGroups = Evme.Storage.get(STORAGE_KEY);
        if (userGroups) {
            try {
                userGroups = JSON.parse(userGroups);
            } catch(ex) {
                userGroups = {};
            }
        } else {
            userGroups = {};
        }
    }
    
    this.divideIntoGroup = function(test) {
        // if user is already in a group- return that group
        var storedGroup = _this.getStoredGroup(test.name);
        if (storedGroup) {
            return storedGroup;
        }
        
        if (test.filters) {
            var filters = test.filters;
            if (!(filters instanceof Array)) {
                filters = [filters];
            }
            
            for (var i=0; i<filters.length; i++) {
                var passedFilter = _this.Filters[filters[i]]();
                if (!passedFilter) {
                    _this.storeGroup(test, _this.NOT_IN_TEST);
                    return _this.NOT_IN_TEST;
                }
            }
        }
        
        // if the test isn't on ALL users, insert the remaining users into a "not in test" group
        if (test.percent && test.percent < 100) {
            var isInTest = (Math.round(Math.random()*100) < test.percent);
            if (!isInTest) {
                _this.storeGroup(test, _this.NOT_IN_TEST);
                return _this.NOT_IN_TEST;
            }
        }
        
        if (test.excludeTests) {
            if (!test.excludeTests instanceof Array) {
                test.excludeTests = [test.excludeTests];
            }
            
            for (var i=0; i<test.excludeTests.length; i++) {
                if (_this.getStoredGroup(tests[test.excludeTests].name) != _this.NOT_IN_TEST) {
                    _this.storeGroup(test, _this.NOT_IN_TEST);
                    return _this.NOT_IN_TEST;
                }
            }
        }
        
        var div = Math.floor(Math.random()*test.groups.length);
        var group = test.groups[div] || _this.NOT_IN_TEST;
        
        _this.storeGroup(test, group);
        
        return group;
    };
    
    this.applyTestChanges = function(test, group) {
        if (test.bodyClass) {
            $body.addClass(test.bodyClass + "-" + group);
        }
        
        if (test.css) {
            var $style = $('<link rel="Stylesheet" type="text/css" href="' + BASE_STYLES_URL + test.css + '" />');
            $head.append($style);
        }
        
        if (test.config && test.config[group]) {
            var groupConfig = test.config[group];
            Evme.Utils.updateObject(configData, groupConfig);
        }
    };
    
    this.storeGroup = function(test, group) {
        userGroups[test.storageKey] = group;
    };
    
    this.getStoredGroup = function(key) {
        var test = tests[key],
            group = false;
            
        if (test) {
            group = userGroups[test.storageKey];
            if (!group) {
                return false;
            }
        }
        
        return group;
    };
    
    this.getAll = function() {
        var groups = [];
        
        for (var key in tests) {
            var test = tests[key];
            groups.push({
                "testName": test.name,
                "testGroup": _this.getStoredGroup(test.name)
            });
        }
        
        return groups;
    };
    
    // these functions are used as custom filters in the tests
    // should return "true" if user is OK to get into the test, "false" otherwise.
    this.Filters = new function() {
        this.noTests = function() {
            for (var test in userGroups) {
                if (userGroups[test] !== _this.NOT_IN_TEST) {
                    return false;
                }
            }
            
            return true;
        };
    };
};