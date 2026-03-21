#!/bin/bash
#
# Purpose: Builds and deploys the website to Google App Engine
#
# This script:
# - Runs full build via npm
# - Deploys website directory to App Engine

bun run build

gcloud app deploy --project beepbox-synth website/app.yaml
