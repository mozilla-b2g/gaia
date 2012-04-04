'use strict';

if (!window['Gaia'])
  var Gaia = {};

const TASK_ICONS = ['task_ta.png'];
var taskDataList = [];

var TaskList = {
  /** Date property to hold current TaskList date.
  * Undefined value means "next task in 24 hours"
  */
  currentDate: undefined,

  get tasks() {
    delete this.tasks;
    return this.tasks = document.getElementById('tasks');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('tasks-title');
  },

  /** Gets current date or now if not set.
  * @this {TaskList}
  * @return {Date} Current date or now.
  */
  getCurrentDate: function() {
    return this.currentDate ? this.currentDate : new Date();
  },

  handleEvent: function(evt) {
    switch (evt.type) {
    case 'click':
      var link = evt.target;
      if (!link)
        return;

      switch (link.id) {
        case 'tasks-reset':
          this.reload();
          break;
        case 'cal-load':
          Cal.load();
          break;
        default:
          EditTask.load(EditTask.taskFromDataset(link.parentNode.dataset));
      }
      break;
    }
  },

  init: function() {

    if (!this.currentDate || isNaN(this.currentDate.getTime())) {
      var startDate = new Date();
      var endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      this.title.textContent = 'Tasks in 24 hours';
      
    } else {
      var startDate = new Date(this.currentDate.getTime());
      startDate.setHours(0);
      startDate.setMinutes(0);

      var endDate = new Date(this.currentDate.getTime());
      endDate.setHours(23);
      endDate.setMinutes(59);
      
      this.title.textContent = 'Tasks for ' + Cal.toShortDate(this.currentDate);
    }

    var self = this;
    this.tasksInRange(startDate, endDate).forEach(function(task) {

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.dataset.id = 'task-' + task.id;
      a.dataset.name = task.name;
      a.dataset.desc = task.desc;
      a.dataset.date = task.date;
      a.dataset.done = task.done;

      a.href = '#task';

      li.appendChild(a);

      var img = document.createElement('img');
      img.src = task.done ? 'style/icons/done_' + TASK_ICONS[0] : 'style/icons/' + TASK_ICONS[0];
      a.appendChild(img);

      var nameSpan = document.createElement('span');
      nameSpan.textContent = task.name;
      a.appendChild(nameSpan);

      var label = document.createElement('label');
      label.classList.add('text');
      label.textContent = Cal.toShortDateTime(task.date);

      a.appendChild(label);

      a.addEventListener('click', TaskList);

      self.tasks.appendChild(li);
    });

    window.parent.postMessage('appready', '*');
  },

  refresh: function() {
    if (this.tasks.hasChildNodes()) {
      while (this.tasks.childNodes.length >= 1) {
        this.tasks.removeChild(this.tasks.firstChild);
      }
    }

    this.init();
  },

  reload: function(date) {
    this.currentDate = date;
    this.refresh();
  },

  tasksInRange: function(start, end) {
    var tasks = [];
    for (var i in taskDataList) {
      if (taskDataList[i].date >= start && taskDataList[i].date <= end) {
        tasks.push(taskDataList[i]);
      }
    }

    tasks.sort(function(a, b) {return a.date.getTime() - b.date.getTime();});

    return tasks;
  }
};

var EditTask = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('task');
  },

  get nameInput() {
    delete this.nameInput;
    return this.nameInput = document.querySelector('input[name=\'task.name\']');
  },

  get descInput() {
    delete this.descInput;
    return this.descInput =
      document.querySelector('textarea[name=\'task.desc\']');
  },

  get dateInput() {
    delete this.dateInput;
    return this.dateInput = document.querySelector('input[name=\'task.date\']');
  },

  get doneInput() {
    delete this.doneInput;
    return this.doneInput = document.querySelector('input[name=\'task.done\']');
  },
  
  handleEvent: function(evt) {
    switch (evt.type) {
    case 'click':
      var input = evt.target;
      if (!input)
        return;

      switch (input.id) {
        case 'task-save':
          if (this.updateCurrent()) {
            TaskList.refresh();
          } else {
            evt.preventDefault();
            evt.stopPropagation();
          }
          break;
        case 'task-del':
          this.deleteCurrent();
          TaskList.refresh();
          break;
      }
      break;
    }
  },

  taskFromDataset: function(dataset) {
    var task = {};

    task.id = dataset.id;
    task.name = dataset.name ? dataset.name : '';
    task.desc = dataset.desc ? dataset.desc : '';
    task.date = dataset.date ?
      new Date(dataset.date) : TaskList.getCurrentDate();
    task.done = dataset.done == 'true' ? true : false;

    return task;
  },

  load: function(task) {
    // Set the values
    this.element.dataset.id = task.id;
    this.nameInput.value = task.name;
    this.descInput.value = task.desc;
    this.dateInput.value = task.date.toISOString();
    this.doneInput.checked = task.done;
  },

  updateCurrent: function() {

    var task = {};
    if (this.element.dataset.id != '') {
      task.id = parseInt(this.element.dataset.id.substring(5));
    }

    var error = false;

    task.name = this.nameInput.value;
    task.desc = this.descInput.value;
    task.date = new Date(this.dateInput.value);
    task.done = this.doneInput.checked;

    if (!task.name) {
      this.nameInput.nextElementSibling.textContent = 'Required';
      error = true;
    }

    if (!Cal.checkDate(task.date)) {
      this.dateInput.nextElementSibling.textContent = 'Invalid date';
    }

    if (!error) {
      this.manageTask(task);
    }

    return !error;
  },

  deleteCurrent: function() {
    if (this.element.dataset.id != '') {
      var id = parseInt(this.element.dataset.id.substring(5));
      this.deleteTask(id);
    }
  },

  updateTaskProperty: function(id, property, value) {
    for (var i in taskDataList) {
      if (taskDataList[i].id == id) {
        taskDataList[i][property] = value;
        break;
      }
    }
  },

  manageTask: function(task) {
    if (task.id) {
      taskDataList.some(function(taskElem) {
        if (taskElem.id == task.id) {
          taskElem.name = task.name;
          taskElem.desc = task.desc;
          taskElem.date = task.date;
          taskElem.done = task.done;
          return true;
        }
        return false;
      });
    } else {
      task.id = taskDataList.length > 0 ? 
        taskDataList[taskDataList.length - 1].id + 1 : 1;
      taskDataList.push(task);
    }
  },

  deleteTask: function(id) {
    if (id) {
      taskDataList.some(function(taskElem, index) {
        if (taskElem.id == id) {
          taskDataList.splice(index, 1);
          return true;
        }
        return false;
      });
    }
  }
};

var Cal = {

  get dateInput() {
    delete this.dateInput;
    return this.dateInput = document.querySelector('input[name=\'cal.date\']');
  },

  handleEvent: function(evt) {
    switch (evt.type) {
    case 'click':
      var input = evt.target;
      if (!input)
        return;

      var selDate = new Date(this.dateInput.value);

      if (this.checkDate(selDate)) {
        TaskList.reload(selDate);
      } else {
        this.dateInput.nextElementSibling.textContent = 'Invalid date';
        evt.preventDefault();
        evt.stopPropagation();
      }

      break;
    }
  },

  load: function() {
    this.dateInput.nextElementSibling.textContent = '';
    this.dateInput.value = this.toShortDate(TaskList.getCurrentDate());
  },

  toShortTime: function(date) {
    return this.pad(date.getHours(), 2) + ':' + this.pad(date.getMinutes(), 2);
  },

  toShortDate: function(date) {
    return date.getFullYear() + '-' + this.pad((date.getMonth() + 1), 2) +
      '-' + this.pad(date.getDate(), 2);
  },

  toShortDateTime: function(date) {
    return this.toShortTime(date) + '   ' + this.toShortDate(date);
  },

  pad: function(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }

    return str;
  },

  checkDate: function(date) {
    return date && !isNaN(date.getTime());
  }
};

window.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#tasks-reset').addEventListener('click', TaskList);
  document.querySelector('#task-new').addEventListener('click', TaskList);
  document.querySelector('#cal-load').addEventListener('click', TaskList);

  document.querySelector('#task-save').addEventListener('click', EditTask);
  document.querySelector('#task-del').addEventListener('click', EditTask);

  document.querySelector('#cal-pick').addEventListener('click', Cal);
  TaskList.init();
});
