-include $(PWD)/build/common.mk

GAIA_ROOT_PATH?=../..

.PHONY: all build stamp-commit-hash
all: build stamp-commit-hash

build:
	@echo 'Building settings app...'
	@$(call run-app-js-command, build)

# Generate a text file containing the current changeset of Gaia
stamp-commit-hash:
	@(if [ -e ${GAIA_ROOT_PATH}/gaia_commit_override.txt ]; then \
		cp ${GAIA_ROOT_PATH}/gaia_commit_override.txt ./resources/gaia_commit.txt; \
	elif [ -d ${GAIA_ROOT_PATH}/.git ]; then \
		git --git-dir=${GAIA_ROOT_PATH}/.git log -1 --format="%H%n%ct" HEAD > ./resources/gaia_commit.txt; \
	else \
		echo 'Unknown Git commit; build date shown here.' > ./resources/gaia_commit.txt; \
		date +%s >> ./resources/gaia_commit.txt; \
	fi)
