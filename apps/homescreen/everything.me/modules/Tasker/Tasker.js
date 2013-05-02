Evme.Tasker = new function Evme_Tasker() {
    var NAME = "Tasker", self = this,
        tasks = {},
        lastRun = 0, triggerInterval = 0,
        interval, powerSettings,
        
        // the tasker will run each tick by this interval, and compare the time to the actual interval
        // set to 10 seconds cause it doesn't have to be accurate, and shouldn't be too CPI intensive
        actualInterval = 10000;
    
    this.init = function init(options) {
        !options && (options = {});

        triggerInterval = options.triggerInterval;
        
        // when the tasks should be triggered, we first verify the screen is even on
        powerSettings = window.navigator.mozPower || {'screenEnabled': true};
        
        lastRun = Date.now();
        interval = window.setInterval(checkInterval, actualInterval);
        
        // trigger when language changes. pass "true" to force the trigger
        navigator.mozSettings.addObserver('language.current', function onLanguageChange(e) {
            self.trigger(true);
        });
        
        Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.add = function add(taskConfig) {
      if (!taskConfig.id) {
        taskConfig.id = 'task_' + Date.now();
      }
      
      tasks[taskConfig.id] = taskConfig;

      Evme.EventHandler.trigger(NAME, 'taskAdded');
    };
    
    this.trigger = function trigger(taskIdToTrigger) {
        // if the screen is off, reset the timer so we won't keep requesting it
        if (!powerSettings.screenEnabled && taskIdToTrigger !== true) {
          lastRun = Date.now();
          return false;
        }
        
        lastRun = Date.now();
        
        // this allows you to trigger a single task instead of all of them,
        // by passing its id. eg. Evme.Tasker.trigger('updateShortcuts');
        var tasksToTrigger = taskIdToTrigger && taskIdToTrigger !== true? tasks[taskIdToTrigger] : tasks;
        
        Evme.EventHandler.trigger(NAME, 'trigger', {
          "tasks": tasksToTrigger
        });
        
        return true;
    };
    
    // runs frequently and checks if the real interval had passed
    // if so- trigger ALL the tasks!
    function checkInterval() {
      var now = Date.now();
      
      if (now - lastRun >= triggerInterval) {
        self.trigger();
      }
    }
};