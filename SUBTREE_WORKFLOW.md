git remote add <REPO_NAME> git@github.com:DeboikInc/<REPO_NAME>.git

git fetch <REPO_NAME> <BRANCH>

git merge -X subtree=apps/<APP_NAME> --allow-unrelated-histories --no-edit <REPO_NAME>/<BRANCH>

## Server branch name is production
## Web branch is web-app
## Mobile branch is main/staging, main 
## admin-dashboard - main
## landing page - main

git status

git push

<!-- keep incoming change -->
git checkout --theirs apps/<APP_NAME>
git add apps/<APP_NAME>
git commit

<!-- mostly use chore: sync apps/app_name with repo -->

git rm -r --cached apps/mobile
Remove-Item -Recurse -Force apps/mobile
git read-tree --prefix=apps/mobile -u sendrey-frontend/main
git status
git commit -m "Sync apps/mobile with sendrey-frontend/main"
git push