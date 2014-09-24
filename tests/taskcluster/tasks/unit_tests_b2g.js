module.exports = {
  task: {
    metadata: {
      name: 'Gaia unit tests in b2g-desktop',
      description: 'Full gaia unit test suite'
    },
    payload: {
      command: ['entrypoint', './bin/ci run unit-tests-in-b2g']
    },
    tags: {
      treeherderProject: 'GU'
    }
  }
};

