'use strict';

if (!window['Gaia'])
  var Gaia = {};

const TASK_ICONS = ['task_ta.png'];
var taskDataList = [];

var TaskList = {
  get tasks() {
    delete this.tasks;
    return this.tasks = document.getElementById('tasks');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('tasks-title');
  },

  handleEvent: function(evt) {
    switch (evt.type) {
    case 'click':
      var link = evt.target;
      if (!link)
        return;

      switch (link.id) {
        case 'tasks-reset':
          this.refresh();
          break;
        default:
          EditTask.load(EditTask.taskFromDataset(link.parentNode.dataset));
      }
      break;
    }
  },

  init: function() {
    
    var self = this;
    taskDataList.forEach(function(task) {

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.dataset.id = 'task-' + task.id;
      a.dataset.name = task.name;
      a.dataset.desc = task.desc;
      a.dataset.done = task.done;

      a.href = '#task';

      li.appendChild(a);

      var img = document.createElement('img');
      img.src = task.done ?
        'style/icons/done_' + TASK_ICONS[0] :
        'style/icons/' + TASK_ICONS[0];
      a.appendChild(img);

      var nameSpan = document.createElement('span');
      nameSpan.textContent = task.name;
      a.appendChild(nameSpan);

      var label = document.createElement('label');
      label.classList.add('text');

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

  get doneInput() {
    delete this.doneInput;
    return this.doneInput = document.querySelector('input[name=\'task.done\']');
  },

  get taskTitle() {
    delete this.taskTitle;
    return this.taskTitle = document.getElementById('task-title');
  },

  get deleteElement() {
    delete this.deleteElement;
    return this.deleteElement = document.querySelector('li.delete');
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
            return false;
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
    task.done = dataset.done == 'true' ? true : false;

    return task;
  },

  load: function(task) {

    // Reset the required message to blank
    this.nameInput.nextElementSibling.innerHTML = '';

    // Set the values
    this.element.dataset.id = task.id;
    this.nameInput.value = task.name;
    this.descInput.value = task.desc;
    this.doneInput.checked = task.done;

    if(task.id) {
      this.taskTitle.innerHTML = "Edit Task";
      this.deleteElement.style.display = "block";
    } else {
      this.taskTitle.innerHTML = "New Task";
      this.deleteElement.style.display = "none";
    }
    
  },

  updateCurrent: function() {

    var task = {};
    if (this.element.dataset.id != '') {
      task.id = parseInt(this.element.dataset.id.substring(5));
    }

    var error = false;

    task.name = this.nameInput.value;
    task.desc = this.descInput.value;
    task.done = this.doneInput.checked;

    if (!task.name) {
      this.nameInput.nextElementSibling.textContent = 'Required';
      error = true;
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

window.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#task-new').addEventListener('click', TaskList);

  document.querySelector('#task-save').addEventListener('click', EditTask);
  document.querySelector('#task-del').addEventListener('click', EditTask);

  TaskList.init();
});

window.addEventListener('keyup', function goBack(event) {
  if (document.location.hash != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {

    event.preventDefault();
    event.stopPropagation();

    document.location.hash = 'root';
  }
});
