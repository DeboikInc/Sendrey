# hotfix — work directly on dev, test it, push up the chain

git checkout dev
# fix the bug
git add .
git commit -m "fix: phone validation bug"

# works? push to staging
git checkout staging
git merge dev

# tested on staging? push to main
git checkout main
git merge staging

now both errors show, new issue is, the error is showing for both parties which shouldbe be so, it should only show for who made the request or if they both clicked at same time, last test i clicked accept on runner to let the connection time out show - which did, then i switched to users tab and saw the error there too, but user never clicked the runner so this should be vice versa fixed - deboikinternational@gmail.com claude