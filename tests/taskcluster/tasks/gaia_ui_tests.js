module.exports = {
  task: {
    metadata: {
      name: "Gaia ui tests",
      description: "Gaia ui python tests"
    },
    payload: {
      command: ["./bin/ci run gaia_ui_tests"]
    },
    tags: {
      treeherderProject: "Gip"
    }
  }
};
