# Deployment targets

This repository has separate deployment paths. A successful publish to one target does **not** update the other.

## Vercel production

The configured Vercel Production Deployment uses `feature/temporary-output-board-es` as its production branch (per the project’s Vercel deployment settings). Push changes to that branch to trigger the production deployment. Confirm the resulting Vercel deployment is **Ready** and its source commit contains the intended changes.

Before shipping, verify the branch shown in Vercel → Production Deployment. Do not infer the production branch from the local branch name, `master`, or a successful GitHub Pages publish.

## GitHub Pages

`npx --yes gh-pages -d build` publishes the generated `build/` output to the repository’s `gh-pages` branch. This updates the GitHub Pages site only; it does not trigger or update Vercel production.

## Verify the URL users open

Check the deployment’s listed domains and compare the served app bundle/commit with the expected deployment. The repository README references `https://app.cboard.io`, while the Vercel deployment shown in the project dashboard may list a different domain. If the user-facing domain is not attached to that deployment, publishing either branch will not update what they see there; identify the domain’s actual hosting origin first.

## Release checklist

- [ ] Confirm the target URL the user expects to see.
- [ ] Check the Vercel Production Deployment source branch and deploy there for Vercel production.
- [ ] If publishing GitHub Pages too, treat it as a separate deployment and verify its URL independently.
- [ ] Confirm the production deployment is Ready and serves the new build before reporting success.
