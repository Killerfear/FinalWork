sudo forever start app.js
cd judge/
node-gyp configure
node-gyp build
cd ..
sudo forever start judge/judgeSvr.js
