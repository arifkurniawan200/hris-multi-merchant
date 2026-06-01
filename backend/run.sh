#!/bin/bash
cd /tmp/hris-project/backend
set -o allexport
. .env
set +o allexport
exec ./server
