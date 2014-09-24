module.exports = {
  task: {
    metadata: {
      name: 'Gaia linters',
      description: 'Run all gaia linters'
    },
    payload: {
      command: ['entrypoint', './bin/ci run linters']
    },
    tags: {
      treeherderProject: 'Li'
    }
  }
};

