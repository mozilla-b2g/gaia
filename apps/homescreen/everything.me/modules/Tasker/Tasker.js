Evme.Tasker = new function Evme_Tasker() {
    var NAME = "Tasker", self = this,
        tasks = {},
        triggerInterval = 0,
        // how long after a failed task should we retry - one hour
        triggerRetry = 1 * 60 * 60 * 1000,
        alarmId,
        powerSettings;

  this.init = function init(options) {
    !options && (options = {});

    triggerInterval = options.triggerInterval;

    // when the tasks should be triggered, we first verify the screen is even on
    powerSettings = window.navigator.mozPower || {'screenEnabled': true};

    // handle the alarm callback
    navigator.mozSetMessageHandler("alarm", handleAlarm);

    // trigger when language changes. pass "true" to force the trigger
    navigator.mozSettings.addObserver('language.current', function onLanguageChange(e) {
      window.addEventListener('localized', function localized() {
        window.removeEventListener('localized', localized);
        self.trigger(true);
      });
    });

    // set the alarm
    addAlarm();

    Evme.EventHandler.trigger(NAME, 'init');
  };

  function addAlarm(at) {
    if (!alarmId && navigator.mozAlarms) {
      var alarmTime = Date.now() + (at || triggerInterval);
      Evme.Utils.log('Adding an alarm');

      var alarm = navigator.mozAlarms.add(alarmTime, 'ignoreTimezone', {
        "Tasker": true
      });

      alarm.onsuccess = function(e) {
        alarmId = e.target.result;
        Evme.Utils.log('Alarm set: ' + alarmId);
      };

      alarm.onerror = function(event) {
        Evme.Utils.log('alarm error');
      };
    }
  }

  function handleAlarm(e) {
    Evme.Utils.log('handleAlarm called! ' + JSON.stringify(e));
    if (!e.data.Tasker) {
      Evme.Utils.log('Not our task, lets not touch it');
      return false;
    }

    if (!alarmId) {
      Evme.Utils.log('Called trigger without an alarm- dont do anything in case of duplicates');
      return false;
    }

    self.trigger();
  }

  function removeAlarm() {
    Evme.Utils.log('Removing alarm: ' + alarmId);
    navigator.mozAlarms.remove(alarmId);
    alarmId = null;
  }

  this.add = function add(taskConfig) {
    if (!taskConfig.id) {
      taskConfig.id = 'task_' + Date.now();
    }

    tasks[taskConfig.id] = taskConfig;

    Evme.EventHandler.trigger(NAME, 'taskAdded');
  };

  this.trigger = function trigger() {
    Evme.Utils.log('Task trigger');

    var bForceTrigger = arguments[0] === true,
        specificTaskToTrigger = typeof arguments[0] === 'string'? arguments[0] : null;

    // clear the current alarm, to avoid duplicates
    removeAlarm();

    // if the screen is off or there's no connection, reset the timer so we won't keep requesting it
    // since triggering tasks can trigger HTTP requests and CPI-intensive actions
    // we don't request when the screen is off to save user's battery and connection and respect the user
    // if the user locked down their device we want to keep it as silent as possible
    if ((!powerSettings.screenEnabled || !navigator.onLine) && !bForceTrigger) {
      Evme.Utils.log('Screen is off or no network- add a retry alarm');
      addAlarm(triggerRetry);
      return false;
    }

    // set a new alarm for the next sync
    addAlarm();

    // this allows you to trigger a single task instead of all of them,
    // by passing its id. eg. Evme.Tasker.trigger('updateShortcuts');
    var tasksToTrigger = specificTaskToTrigger? tasks[specificTaskToTrigger] : tasks;

    Evme.EventHandler.trigger(NAME, 'trigger', {
      "tasks": tasksToTrigger
    });

    return true;
  };
};