#! /usr/bin/env node
'use strict';

/**
Entrypoint for the task graph extension / decisions for gaia tests.
*/
var slugid = require('slugid');
var fs = require('fs');
var path = require('path');
var template = require('json-templater/object');

var GAIA_DIR = path.resolve(__dirname, '..', '..', '..');

// Default image name / version this can be overriden at the task level...
var IMAGE =
  fs.readFileSync(GAIA_DIR + '/build/docker/gaia-taskenv/DOCKER_TAG', 'utf8');

var VERSION =
  fs.readFileSync(GAIA_DIR + '/build/docker/gaia-taskenv/VERSION', 'utf8');

// Default provisioner and worker types
var COPIED_ENVS = [
  'CI',
  'GITHUB_PULL_REQUEST',
  'GITHUB_BASE_REPO',
  'GITHUB_BASE_USER',
  'GITHUB_BASE_GIT',
  'GITHUB_BASE_REV',
  'GITHUB_BASE_BRANCH',
  'GITHUB_HEAD_REPO',
  'GITHUB_HEAD_USER',
  'GITHUB_HEAD_GIT',
  'GITHUB_HEAD_REV',
  'GITHUB_HEAD_BRANCH',
  'TREEHERDER_PROJECT',
  'TREEHERDER_REVISION'
];

/**
Decorates tasks with required parameters.

See the http://docs.taskcluster.net/scheduler/api-docs/#extendTaskGraph section.

@param {Object} task.
@return {Object} decorated task.
*/
function decorateTask(task, options) {
  task = template(task, options);

  // Shallow copy the task...
  var output = {};
  for (var key in task) {
    output[key] = task[key];
  }

  // Each task must have its own unique task id unless this is an
  // external hook. In the external case we expect
  // external systems to generate a taskId.
  if (!options.externalHook) {
    output.taskId = output.taskId || slugid.v4();
  }

  // Taskcluster needs to know how to run the tasks these specify which
  // provisioning method and which worker type to run on.
  if (!options.externalHook) {
    output.task.created = new Date().toJSON();
  }
  output.task.metadata.source = 'http://todo.com/soon';

  // Ensure we are always using the correct scheduler so our tasks are routed
  // correctly...
  output.task.schedulerId = output.task.schedulerId || options.schedulerId ||
    'task-graph-scheduler';
  output.task.metadata.owner = 'dev-gaia@lists.mozilla.org';

  // Expire all tasks in 24 hours.
  if (!options.externalHook) {
    var deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    output.task.deadline = deadline.toJSON();
  }

  // Default docker image...
  var payload = output.task.payload;
  payload.image = payload.image || (IMAGE.trim()) + ':' + (VERSION.trim());
  payload.maxRunTime = payload.maxRunTime || 30 * 60; // 30 minutes in seconds

  // Copy over the important environment variables...
  payload.env = payload.env || {};
  COPIED_ENVS.forEach(function(env) {
    payload.env[env] = payload.env[env] || process.env[env];
  });

  output.task.scopes = output.task.scopes || [];
  // Hack to ensure all tasks have the scope for the given image.
  output.task.scopes.push('docker-worker:image:' + IMAGE + '*');

  if (process.env.TREEHERDER_PROJECT && process.env.TREEHERDER_REVISION) {
    output.task.routes = output.task.routes || [];
    output.task.routes.push(
      'tc-treeherder.' +
      process.env.TREEHERDER_PROJECT + '.' +
      process.env.TREEHERDER_REVISION
    );
  }

  return output;
}

module.exports = decorateTask;
