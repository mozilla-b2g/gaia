/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// TaskManager is responsible for managing opened apps
//

'use strict';

var TaskManager = (function() {

  var taskManager = document.getElementById('taskManager');
  var taskList = taskManager.getElementsByTagName('ul')[0];
  var displayedApp,
      runningApps;

  // Build and display the task switcher overlay
  // Note that we rebuild the switcher each time we need it rather
  // than trying to keep it in sync with app launches.  Performance is
  // not an issue here given that the user has to hold the HOME button down
  // for one second before the switcher will appear.
  //
  // FIXME: Currently tasks are displayed in the order in which
  // they were launched. We might want to change this to most recently
  // used order. Or, we might want to keep the apps in launch order, but
  // scroll so that the current task is always shown
  function showTaskSwitcher() {

    // Apps info form WindowManager
    displayedApp = WindowManager.getDisplayedApp();
    runningApps = WindowManager.getRunningApps();

    // First add an item to the taskList for each running app
    for (var origin in runningApps)
      addTaskIcon(origin, runningApps[origin]);

    // Then make the taskManager overlay active
    taskManager.classList.add('active');

    // Make sure we're in portrait mode
    screen.mozLockOrientation('portrait');

    // If there is a displayed app, take keyboard focus away
    if (displayedApp)
      runningApps[displayedApp].frame.blur();

    function addTaskIcon(origin, app) {
      // Build an icon representation of each window.
      // And add it to the task switcher
      var icon = document.createElement('li');
      icon.style.background = '-moz-element(#' + app.frame.id + ') no-repeat';
      var close_button = document.createElement('a');
      icon.appendChild(close_button);
      var title = document.createElement('h1');
      title.textContent = app.name;
      icon.appendChild(title);
      taskList.appendChild(icon);

      // Set up event handling

      // A click on the close button ends that task. And if it is the
      // last task, it dismisses the task switcher overlay
      close_button.addEventListener('click', function(e) {
        // Don't trigger a click on our ancestors
        e.stopPropagation();

        // Remove the icon from the task list
        taskList.removeChild(icon);

        // Stop the app itself
        // If the app is the currently displayed one,
        // this will also switch back to the homescreen
        // (though the task switcher will still be displayed over it)
        WindowManager.kill(origin);

        // if there are no more running apps, then dismiss
        // the task switcher
        if (WindowManager.getNumberOfRunningApps() === 0)
          hideTaskSwitcher();
      });

      // A click elsewhere in the icon switches to that task
      icon.addEventListener('click', function() {
        hideTaskSwitcher();
        WindowManager.launch(origin);
      });
    }
  }

  function hideTaskSwitcher() {
    // Make the taskManager overlay inactive
    taskManager.classList.remove('active');

    // And remove all the task icons from the document.
    taskList.textContent = '';

    // If there is a displayed app, give the keyboard focus back
    // And switch back to that's apps orientation
    if (WindowManager.getDisplayedApp()) {
      runningApps[displayedApp].frame.focus();
      WindowManager.setOrientationForApp(displayedApp);
    }
  }

  function taskSwitcherIsShown() {
    return taskManager.classList.contains('active');
  }

  // Public API of TaskManager
  return {
    showTaskSwitcher: showTaskSwitcher,
    hideTaskSwitcher: hideTaskSwitcher,
    taskSwitcherIsShown: taskSwitcherIsShown
  };
})();
