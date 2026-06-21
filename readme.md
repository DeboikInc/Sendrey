git remote set-url sendrey-frontend git@github.com:DeboikInc/sendrey-frontend.git
git remote set-url sendrey-server git@github.com:DeboikInc/sendrey-server.git

git fetch sendrey-frontend main
git fetch sendrey-server main

git subtree pull --prefix=apps/web sendrey-frontend main
git subtree pull --prefix=apps/mobile sendrey-frontend main
git subtree pull --prefix=services/api sendrey-server main