# Production deploy gate

A Sales Hub deployment is ready for merge only when all applicable checks are green:

- production build succeeds;
- Docker image builds;
- container starts and stays running;
- `/api/health` responds 200;
- no unrelated files are changed;
- database migrations are reviewed separately before being applied;
- public Factory attribution changes are tested against the Sales Hub intake route;
- rollback target is known.

Do not merge draft marketing or production-readiness PRs while away from a terminal. Review and merge them deliberately after the build and smoke tests have been run.
