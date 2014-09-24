module.exports = {
  task: {
    metadata: {
      name: 'Marionette JS tests',
      description: 'Run entire suite of marionette js tests'
    },
    payload: {
      command: ['entrypoint', './bin/ci run marionette_js']
    },
    tags: {
      treeherderProject: 'Gij'
    }
  }
};

