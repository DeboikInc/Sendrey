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

https://sendrey.netlify.app

1. put training after kyc submitted, 
2. always verify training for returning users too
3. training and test should be full screen, test is objective based, answers will live in a util/ trainingAnswers.js, 
4.if runner scores 80% and above, proceed and call updateProfile to update isTrainingCompleted to true also show success message and continue button, else show training failure message and render two buttons, start training again and retake test resp. 

<!-- server -->
add isTrainingCompleted to the model
call update profile 
add to isReturning user payload
if there are any users before this fix, set them to true 