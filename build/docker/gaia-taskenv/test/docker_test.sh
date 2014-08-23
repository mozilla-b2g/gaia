#! /bin/bash -xv

DOCKER_TAG=`cat DOCKER_TAG`
VERSION=`cat VERSION`

# must run from a docker enabled host
docker run $DOCKER_TAG:$VERSION 'exit 222'

# exit status from the task runner
exit_code=$?;

if [ "222" != $exit_code ]; then
  echo "Invalid exit code $exit_code"
  exit 1
fi
