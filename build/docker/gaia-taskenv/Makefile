DOCKER_REPO?=
DOCKER_TAG?=$(shell cat DOCKER_TAG)
VERSION?=$(shell cat VERSION)

default: docker_image

.PHONY: docker_image
docker_image:
	docker build -t $(DOCKER_REPO)$(DOCKER_TAG):$(VERSION) .

.PHONY: register
register: docker_image

.PHONY: test
test:
	./test/docker_test.sh
