git remote add <REPO_NAME> git@github.com:DeboikInc/<REPO_NAME>.git

git fetch <REPO_NAME> <BRANCH>

git merge -X subtree=apps/<APP_NAME> --allow-unrelated-histories --no-edit <REPO_NAME>/<BRANCH>

git status

git push

<!-- keep incoming change -->
git checkout --theirs apps/<APP_NAME>
git add apps/<APP_NAME>
git commit

<!-- mostly use chore: sync apps/app_name with repo -->