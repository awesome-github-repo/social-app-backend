### Backend Solution for [Sonata Social App](https://github.com/uzaysan/sonata-sociala-app "Sonata App") Based on [Parse Server](https://github.com/parse-community/parse-server "Parse Server")

This package is meant for sonata-social-app.

**Before you get started**
- Make sure you have a running mongodb database
- You have installed NodeJs (> 8) to your machine. But I recommend Node 12 or higher.

**Things you have to do **
- You need a firebase project in order to send push notifications.

- You need to go to Firebase Console and then go to Project Settings. You need to create an admin.json file for Nodejs. Rename that file to `serviceAccountKey.json`. And copy that file to cloud folder.

- Open index.js file. And fill the necessary parts like `databaseUri`, `appId`, `masterKey` etc..

- If you want instant messaging feature to work, you need a redis server. Edit live-query parts. If you dont want to run a redis server, you can delete the parts related to Live Query.

- Once you do all this things, you need to disable all Class Level Permissions or every class, This is for data security. App will work without this setting but all the data inside database will be publicly accessible. You can set Class Level Permissions by using [Parse-Dashboard](https://github.com/parse-community/parse-dashboard "Parse-Dashboard")

You can tweak settings to increase server performance and scalibility. But they are not discussed here. For that, you can use official parse-server repo. Or Parse community forum.
