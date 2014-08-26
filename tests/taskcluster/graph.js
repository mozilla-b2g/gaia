#! /usr/bin/env node

/**
Entrypoint for the task graph extension / decisions for gaia tests.
*/

var slugid = require('slugid');
var fs = require('fs');
var path = require('path');

var GAIA_DIR = path.resolve(__dirname, '..', '..');

// Default image name / version this can be overriden at the task level...
var IMAGE =
  fs.readFileSync(GAIA_DIR + '/build/docker/gaia-taskenv/DOCKER_TAG', 'utf8');

var VERSION =
  fs.readFileSync(GAIA_DIR + '/build/docker/gaia-taskenv/VERSION', 'utf8');

// Default provisioner and worker types
var WORKER_TYPE = 'v2';
var PROVISIONER_ID = 'aws-provisioner';

/**
Decorates tasks with required parameters.

See the http://docs.taskcluster.net/scheduler/api-docs/#extendTaskGraph section.

@param {Object} task.
@return {Object} decorated task.
*/
function decorateTask(task) {
  // Shallow copy the task...
  var output = {};
  for (var key in task) output[key] = task[key];

  // Each task must have its own unique task id.
  output.taskId = slugid.v4();

  // Taskcluster needs to know how to run the tasks these specify which
  // provisioning method and which worker type to run on.
  output.task.provisionerId = output.task.provisionerId || PROVISIONER_ID;
  output.task.workerType = output.task.workerType || WORKER_TYPE;
  output.task.created = new Date().toJSON();
  output.task.metadata.source = 'http://todo.com/soon';

  // Ensure we are always using the correct scheduler so our tasks are routed
  // correctly...
  output.task.schedulerId = output.task.schedulerId || 'task-graph-scheduler';

  // XXX: Should not be jlal@mozilla.com in all cases =p
  output.task.metadata.owner = 'jlal@mozilla.com';

  // Expire all tasks in 24 hours...
  var deadline = new Date();
  deadline.setHours(deadline.getHours() + 24);
  output.task.deadline = deadline;

  // Default docker image...
  var payload = output.task.payload;
  payload.image = payload.image || (IMAGE.trim()) + ':' + (VERSION.trim());
  payload.maxRunTime = 2400; // 40 minutes in seconds...

  // TODO: We need to define specific taskclusterProject's for each branch but
  //       right now only the `gaia` project is defined in the future we will
  //       have more.
  output.task.tags.treeherderProject =
    output.task.tags.treeherderProject || 'gaia';

  return output;
}

// Simply read all definitions for now...
var tasks = fs.readdirSync(__dirname + '/tasks/').map(function(file) {
  return require('./tasks/' + file);
});

var graph = {
  tasks: []
};

for (var i = 0; i < (600 / tasks.length); i++) {
  graph.tasks = graph.tasks.concat(tasks.map(function(task) {
    return decorateTask(task);
  }));
}

// Output directly to stdout and allow pipe redirection to handle where it
// should go...
process.stdout.write(JSON.stringify(graph, null, 2));
