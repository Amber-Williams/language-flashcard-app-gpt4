#!/bin/bash

set -x
source ricotta.env

# Get CPU Architecture
cpu_arch=$(uname -m)

# Function to detect CPU features
detect_cpu_features() {
	cpu_info=$(lscpu)
	if echo "$cpu_info" | grep -q "avx512"; then
		echo "AVX512"
	elif echo "$cpu_info" | grep -q "avx2"; then
		echo "AVX2"
	elif echo "$cpu_info" | grep -q "avx"; then
		echo "AVX"
	else
		echo "basic"
	fi
}

# Handle termination signals
_term() {
	echo "Received termination signal!"
	kill -TERM "$redis_process" 2>/dev/null
	kill -TERM "$ricotta_api_process" 2>/dev/null
}

# Start Redis instance
redis-server /etc/redis/redis.conf &
redis_process=$!

# Start the API
cd /usr/src/app/api || exit 1
hypercorn_cmd="hypercorn src.ricotta.main:app --bind 0.0.0.0:9124"
if [ "$RICOTTA_API_ENABLE_IPV6" = true ] && [ "$RICOTTA_API_ENABLE_IPV4" != true ]; then
	hypercorn_cmd="hypercorn src.ricotta.main:app --bind [::]:9124"
elif [ "$RICOTTA_API_ENABLE_IPV4" = true ] && [ "$RICOTTA_API_ENABLE_IPV6" = true ]; then
	hypercorn_cmd="hypercorn src.ricotta.main:app --bind 0.0.0.0:9124 --bind [::]:9124"
fi

$hypercorn_cmd || {
	echo 'Failed to start main app'
	exit 1
} &

ricotta_api_process=$!

# Set up a signal trap and wait for processes to finish
trap _term TERM
wait $redis_process $ricotta_api_process
