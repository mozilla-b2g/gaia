-include $(PWD)/build/common.mk


.PHONY: all
all:
	@echo Building keyboard app to build_stage...
	@$(call run-js-command,app/build)
clean:
	@rm -rf $(STAGE_APP_DIR)
