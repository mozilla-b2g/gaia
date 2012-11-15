Evme.Tests = new function Evme_Tests() {
    var self = this,
        tests = {}, configData = {}, userGroups = {},
        elContainer = null,
        
        BASE_STYLES_URL = "/css/tests/",
        STORAGE_KEY = "tests";
    
    this.NOT_IN_TEST = "main";
    
    this.init = function init(options) {
        !options && (options = {});
        
        elContainer = options.elContainer;
        
        configData = options.config;
        
        populateGroupsFromStorage();
        
        var _tests = options.tests || [],
            activeTestsKeys = {};
        
        for (var i=0; i<_tests.length; i++) {
            var test = _tests[i];
            
            tests[test.name] = test;
            activeTestsKeys[test.storageKey] = true;
            
            var group = self.divideIntoGroup(test);
            
            if (group != self.NOT_IN_TEST) {
                self.applyTestChanges(test, group);
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
    
    this.divideIntoGroup = function divideIntoGroup(test) {
        // if user is already in a group- return that group
        var storedGroup = self.getStoredGroup(test.name);
        if (storedGroup) {
            return storedGroup;
        }
        
        if (test.filters) {
            var filters = test.filters;
            if (!(filters instanceof Array)) {
                filters = [filters];
            }
            
            for (var i=0; i<filters.length; i++) {
                var passedFilter = self.Filters[filters[i]]();
                if (!passedFilter) {
                    self.storeGroup(test, self.NOT_IN_TEST);
                    return self.NOT_IN_TEST;
                }
            }
        }
        
        // if the test isn't on ALL users, insert the remaining users into a "not in test" group
        if (test.percent && test.percent < 100) {
            var isInTest = (Math.round(Math.random()*100) < test.percent);
            if (!isInTest) {
                self.storeGroup(test, self.NOT_IN_TEST);
                return self.NOT_IN_TEST;
            }
        }
        
        if (test.excludeTests) {
            if (!test.excludeTests instanceof Array) {
                test.excludeTests = [test.excludeTests];
            }
            
            for (var i=0; i<test.excludeTests.length; i++) {
                if (self.getStoredGroup(tests[test.excludeTests].name) != self.NOT_IN_TEST) {
                    self.storeGroup(test, self.NOT_IN_TEST);
                    return self.NOT_IN_TEST;
                }
            }
        }
        
        var div = Math.floor(Math.random()*test.groups.length);
        var group = test.groups[div] || self.NOT_IN_TEST;
        
        self.storeGroup(test, group);
        
        return group;
    };
    
    this.applyTestChanges = function applyTestChanges(test, group) {
        if (test.bodyClass) {
            elContainer.classList.add(test.bodyClass + "-" + group);
        }
        
        if (test.css) {
            var elStyle = document.createElement('link');
            elStyle.setAttribute('rel', 'Stylesheet');
            elStyle.setAttribute('href', BASE_STYLES_URL + test.css);
            
            elContainer.appendChild(elStyle);
        }
        
        if (test.config && test.config[group]) {
            var groupConfig = test.config[group];
            Evme.Utils.updateObject(configData, groupConfig);
        }
    };
    
    this.storeGroup = function storeGroup(test, group) {
        userGroups[test.storageKey] = group;
    };
    
    this.getStoredGroup = function getStoredGroup(key) {
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
    
    this.getAll = function getAll() {
        var groups = [];
        
        for (var key in tests) {
            var test = tests[key];
            groups.push({
                "testName": test.name,
                "testGroup": self.getStoredGroup(test.name)
            });
        }
        
        return groups;
    };
    
    // these functions are used as custom filters in the tests
    // should return "true" if user is OK to get into the test, "false" otherwise.
    this.Filters = new function Filters() {
        this.noTests = function noTests() {
            for (var test in userGroups) {
                if (userGroups[test] !== self.NOT_IN_TEST) {
                    return false;
                }
            }
            
            return true;
        };
    };
};