### Backend Solution for [Sonata Social App](https://github.com/uzaysan/sonata-social-app "Sonata App") Based on [Parse Server](https://github.com/parse-community/parse-server "Parse Server")

This package is meant for sonata-social-app.

 **Before you get started**
- Make sure you have a running mongodb database
- You have installed NodeJs (> 8) to your machine. But I recommend Node 12 or higher.


 **Things you have to do**
- You need a firebase project in order to send push notifications.

- You need to go to Firebase Console and then go to Project Settings. You need to create an admin.json file for Nodejs. Rename that file to `serviceAccountKey.json`. And copy that file to cloud folder.

- Open index.js file. And fill the necessary parts like `databaseUri`, `appId`, `masterKey` etc..

- If you want instant messaging feature to work, you need a redis server. Edit live-query parts. If you dont want to run a redis server, you can delete the parts related to Live Query.

- Once you do all this things, you need to disable all Class Level Permissions for every class, This is for data security. App will work without this setting but all the data inside database will be publicly accessible. You can set Class Level Permissions by using [Parse-Dashboard](https://github.com/parse-community/parse-dashboard "Parse-Dashboard")

You can tweak settings to increase server performance and scalibility. But they are not discussed here. For that, you can use official parse-server repo. Or Parse community forum.

## Step by step guide for Ubuntu 20.04
### Install MongoDB database
MongoDb installation commands are taken from [here](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
Run below commands one by one.

- `sudo apt update; sudo apt upgrade -y; sudo apt install wget -y; sudo apt install gnupg -y`
- `wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add`
- `echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list`
- `sudo apt-get update`
- `sudo apt-get install -y mongodb-org=4.4 mongodb-org-server=4.4 mongodb-org-shell=4.4 mongodb-org-mongos=4.4 mongodb-org-tools=4.4`

After following these steps you have succesfully installed mongodb on your server.
Now we will start mongodb. To start mongodb simply run below command

- `sudo systemctl start mongod`

To verify mongodb running run below command

- `sudo systemctl status mongod`

You will see that mongo is active and running.
Currently if you reboot your server, mongodb doesnt start automatically. To make sure mongo start on boot run below command:

- `sudo systemctl enable mongod`

Now we will enter mongo shell. run below command:

- `mongo`

we will create a database for the app. `use` command will do the job.

- `use DATABASE_NAME` Now change DATABASE_NAME to your preferred name. This will be your apps database name. And we will use it on connection uri.

You should also set authentication for database security. But since we will install MongoDB to same server with backend, we are not going to set authentiation. Because by default mongo is not open to internet and only accessible by localhost. But if you want to enable authentication [you can read it from here](https://medium.com/mongoaudit/how-to-enable-authentication-on-mongodb-b9e8a924efac)

Now we will clone this repo:

- `git clone https://github.com/uzaysan/social-app-backend.git`

After this we will navigate to backend folder. Sİmply type 

- `cd social-app-backend`

Now we will edit index.js file with nano. Edit `appId`, `masterKey`, `databaseUri`. 
Now database uri is `mongodb://localhost:27017/DATABASE_NAME` where database name is set by you on previous steps.
And edit `appId` and `masterKey` you can set whatever you want. But you have to keep your masterKey secret. If anyone has your masterkey they can delete all data in database or even upload some junk data. or steal existing data.

Now you will need 2 things to connect android app to this server. appId and serverAdress. appId is what you set previous step. Server adress is server ip. By default parse server listen port 1337 and listen on parse endpoint. So you server adress should be like this `http://IP_ADRESS:1337/parse` unless you changed this setings.

There is only one step left. Which is setting up a redis server. I wont teach that here. Its not mandatory for apps functionality. Its only used for instant messaging. So ıf you want instant messaging feature, You should run a redis server. And paste connection uri to necessary places. If you dont, simply delete LiveQuery options from index.js. If you wanna install redis, you can use this tutorial 
https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-20-04


