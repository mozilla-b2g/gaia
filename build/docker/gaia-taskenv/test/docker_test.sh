#! /bin/bash -xv

# must run from a docker enabled host
docker run lightsofapollo/gaia-taskenv \
           ./bin/git_branch_taskrunner \
           https://github.com/taskcluster/gaia-taskenv.git \
           master 'exit 222'

# exit status from the task runner
exit_code=$?;

if [ "222" != $exit_code ]; then
  echo "Invalid exit code $exit_code"
  exit 1
fi
