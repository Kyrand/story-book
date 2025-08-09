# Start development environment with live reloading
dev:
	./scripts/shoreman.sh

tail-log-docker:
	docker logs --tail 1000 astro-blog-dev | perl -pe 's/\e\[[0-9;]*m(?:\e\[K)?//g'

# Display the last 100 lines of development log with ANSI codes stripped
tail-log:
	tail -100 ./dev.log | perl -pe 's/\e\[[0-9;]*m(?:\e\[K)?//g'


