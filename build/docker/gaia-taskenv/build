#! /bin/bash -vex

make -C git
docker build -t $(cat DOCKER_TAG):$(cat VERSION) $PWD
