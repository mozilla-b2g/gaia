all: copy-search-app

# We are currently concerned about E.me performance when
# loading a dynamic search app. For now, we copy these files
# into the homescreen app.
.PHONY: copy-search-app
copy-search-app:
	@rm -rf ./search
	@cp -r ../search ./search
	@rm ./search/manifest.webapp
	@rm -rf ./search/test
