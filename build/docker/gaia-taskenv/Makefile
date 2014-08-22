DOCKER_REPO?=
DOCKER_TAG?=mozillab2g/gaia-taskenv
VERSION?=$(shell cat VERSION)

default: docker_image

.PHONY: docker_image
docker_image:
	docker build -t $(DOCKER_REPO)$(DOCKER_TAG):$(VERSION) .

.PHONY: register
register: docker_image
