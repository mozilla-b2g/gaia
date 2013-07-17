GAIA_ROOT_PATH?=../..

all: stamp-commit-hash

# Generate a text file containing the current changeset of Gaia
.PHONY: stamp-commit-hash
stamp-commit-hash:
	@(if [ -e ${GAIA_ROOT_PATH}/gaia_commit_override.txt ]; then \
		cp ${GAIA_ROOT_PATH}/gaia_commit_override.txt ./resources/gaia_commit.txt; \
	elif [ -d ${GAIA_ROOT_PATH}/.git ]; then \
		git --git-dir=${GAIA_ROOT_PATH}/.git log -1 --format="%H%n%ct" HEAD > ./resources/gaia_commit.txt; \
	else \
		echo 'Unknown Git commit; build date shown here.' > ./resources/gaia_commit.txt; \
		date +%s >> ./resources/gaia_commit.txt; \
	fi)
