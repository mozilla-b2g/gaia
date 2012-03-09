'use strict';

if (!window['Gaia'])
  var Gaia = {};

const TASK_ICONS = ['style/icons/task_ta.png', // Task type
      'style/icons/task_ap.png']; // Appointment type
var sample_tasks = [];
var dates = [];

var idVal = 1;

for (var i = -4; i < 40; i = i + 2) {
  var date = new Date();
  date.setHours(date.getHours() + i);
  sample_tasks.push({id: idVal++, name: 't' + i, type: 0,
    desc: 'Long desc\n with line breaks.' + i, date: date});
}

var TaskList = {
  /** Date property to hold current TaskList date.
  * Undefined value means "next task in 24 hours"
  */
  currentDate: undefined,

  get tasks() {
    delete this.tasks;
    return this.tasks = document.getElementById('tasks');
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
          EditTask.load(EditTask.taskFromDataset(link.dataset));
      }
      break;
    }
  },

  init: function() {

    if (!this.currentDate || isNaN(this.currentDate.getTime())) {
      var startDate = new Date();
      var endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);

    } else {
      var startDate = new Date(this.currentDate.getTime());
      startDate.setHours(0);
      startDate.setMinutes(0);

      var endDate = new Date(this.currentDate.getTime());
      endDate.setHours(23);
      endDate.setMinutes(59);
    }

    var self = this;
    this.tasksInRange(startDate, endDate).forEach(function(task) {

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.dataset.id = 'task-' + task.id;
      a.dataset.name = task.name;
      a.dataset.desc = task.desc;
      a.dataset.date = task.date;

      a.href = '#task';
      a.classList.add('push');
      a.classList.add('slideHorizontal');

      li.appendChild(a);

      var img = document.createElement('img');
      img.src = TASK_ICONS[task.type];
      a.appendChild(img);

      var label = document.createElement('span');
      label.textContent = task.name;
      a.appendChild(label);

      var span = document.createElement('label');
      span.textContent = Cal.toShortDateTime(task.date);

      a.appendChild(span);

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
    for (i in sample_tasks) {
      if (sample_tasks[i].date >= start && sample_tasks[i].date <= end) {
        tasks.push(sample_tasks[i]);
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

  get typeInput() {
    delete this.typeInput;
    return this.typeInput =
      document.querySelector('select[name=\'task.type\']');
  },

  get dateInput() {
    delete this.dateInput;
    return this.dateInput = document.querySelector('input[name=\'task.date\']');
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
    case 'change': // Auto save on change. Not used by now.
      var input = evt.target;
      if (!input)
        return;

      var id = undefined;

      if (this.element.dataset.id != '') {
        var id = parseInt(this.element.dataset.id.substring(5));
      }

      this.updateTaskProperty(id, input.name.substring(5), input.value);

      TaskList.reset();

      break;
    }
  },

  taskFromDataset: function(dataset) {
    var task = {};

    task.id = dataset.id;
    task.name = dataset.name ? dataset.name : 'New task';
    task.desc = dataset.desc ? dataset.desc : '';
    task.type = dataset.type ? dataset.type : 0;
    task.date = dataset.date ?
      new Date(dataset.date) : TaskList.getCurrentDate();

    return task;
  },

  load: function(task) {
    // Set the values
    this.element.dataset.id = task.id;
    this.nameInput.value = task.name;
    this.typeInput.value = task.type;
    this.descInput.value = task.desc;
    this.dateInput.value = task.date.toISOString();
  },

  updateCurrent: function() {

    var task = {};
    if (this.element.dataset.id != '') {
      task.id = parseInt(this.element.dataset.id.substring(5));
    }

    var error = false;

    task.name = this.nameInput.value;
    task.desc = this.descInput.value;
    task.type = this.typeInput.value;
    task.date = new Date(this.dateInput.value);

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
    for (i in sample_tasks) {
      if (sample_tasks[i].id == id) {
        sample_tasks[i][property] = value;
        break;
      }
    }
  },

  manageTask: function(task) {
    if (task.id) {
      sample_tasks.some(function(taskElem) {
        if (taskElem.id == task.id) {
          taskElem.name = task.name;
          taskElem.type = task.type;
          taskElem.desc = task.desc;
          taskElem.date = task.date;
          return true;
        }
        return false;
      });
    } else {
      task.id = sample_tasks[sample_tasks.length - 1].id + 1;
      sample_tasks.push(task);
    }
  },

  deleteTask: function(id) {
    if (id) {
      sample_tasks.some(function(taskElem, index) {
        if (taskElem.id == id) {
          sample_tasks.splice(index, 1);
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
  // window.addEventListener('change', EditTask); AUTO SAVE ON CHANGE
  TaskList.init();
});
