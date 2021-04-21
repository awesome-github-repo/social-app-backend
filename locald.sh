#!/bin/sh
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org=4.4.1 mongodb-org-server=4.4.1 mongodb-org-shell=4.4.1 mongodb-org-mongos=4.4.1 mongodb-org-tools=4.4.1
sudo systemctl start mongod
sudo systemctl enable mongod
mongo
use sonata
db.createUser({user: "Gh3vWvEdMzwa74nP2v9LFwQRBp8ZxHhw",pwd: "WK2yt2eUA4M8qEZqARHHfJhCz9ADWE5F",roles: [{ role: "readWrite", db: "sonata" }]})
