#!/bin/bash
set -o allexport
source /tmp/hris-project/backend/.env
set +o allexport
cd /tmp/hris-project/backend
exec ./server
