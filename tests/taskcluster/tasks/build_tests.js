module.exports = {
  task: {
    metadata: {
      name: "Gaia build tests"
    },
    payload: {
      command: ["./bin/ci run build_tests"]
    },
    tags: {
      treeherderProject: "GB"
    }
  }
};
