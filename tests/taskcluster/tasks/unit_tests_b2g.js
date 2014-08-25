module.exports = {
  task: {
    metadata: {
      name: "Gaia build tests",
      description: "Runs entire gaia build system through all known variants."
    },
    payload: {
      command: ["./bin/ci run unit-tests-in-b2g"]
    },
    tags: {
      treeherderProject: "GU"
    }
  }
};

