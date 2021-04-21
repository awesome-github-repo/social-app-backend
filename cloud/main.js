const base64Img = require('base64-img');
const imageThumbnail = require('image-thumbnail');
const sizeOf = require('image-size');
const fileType = require("file-type");
const admin = require("firebase-admin");
const tmp = require('tmp');
const ffprobeStatic = require('ffprobe-static');
const fs = require('fs');
const ffprobe = require('ffprobe');
const ffmpeg = require('fluent-ffmpeg');
const pathToFfmpeg = require('ffmpeg-static');

const axios = require('axios');
const cld = require('cld');

const UserInterest = Parse.Object.extend("UserInterest");
const Chat = Parse.Object.extend("Chat");
const Message = Parse.Object.extend("Message");
const Comment = Parse.Object.extend("Comment");
const Post = Parse.Object.extend("Post");
const DeviceToken = Parse.Object.extend("DeviceToken");
const Follow = Parse.Object.extend("Follow");
const FollowRequest = Parse.Object.extend("FollowRequest");
const Block = Parse.Object.extend("Block");
const SavedComment = Parse.Object.extend("SavedComment");
const ReportComment = Parse.Object.extend("ReportComment");
const SavedPost = Parse.Object.extend("SavedPost");
const Report = Parse.Object.extend("Report");
const Like = Parse.Object.extend("Like");
const CommentVote = Parse.Object.extend("CommentVote");
const Notif = Parse.Object.extend("Notif");
const ExtraUserInfo = Parse.Object.extend("ExtraUserInfo");


//Don't forget to generate your own admin key from firebase console.
var serviceAccount = require("./serviceAccountKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const featuredList = [];
   featuredList.push("3Chefq52Ky5wBFbG8E74eRMksnqdFk");
   featuredList.push("h9LBH2LVNj9PVpsH9HT7BS6fP8ML3X");
   featuredList.push("6N4Q6BfWsXC25vRNhAu5PkZaU9N69k");
   featuredList.push("UnNfPHcUpUyF8nZd6Vjs2kg3BEbPdX");
   featuredList.push("tx4bJH6tWkT6MgFwHm2GZz6BcAcdFC");


const kategoriList = [];
  kategoriList.push("h9LBH2LVNj9PVpsH9HT7BS6fP8ML3X");
  kategoriList.push("3Chefq52Ky5wBFbG8E74eRMksnqdFk");
  kategoriList.push("6N4Q6BfWsXC25vRNhAu5PkZaU9N69k");
  kategoriList.push("UnNfPHcUpUyF8nZd6Vjs2kg3BEbPdX");
  kategoriList.push("tx4bJH6tWkT6MgFwHm2GZz6BcAcdFC");
  kategoriList.push("5aT7qyvEVTEf3aTFNuvUwmR9HFwnVq");
  kategoriList.push("kC8vrjRNG7AxjP6xqUdWLkDn2NbCsh");
  kategoriList.push("mwhrT4CauTx622t5r524GVwzb7Evvz");
  kategoriList.push("JsJCapxsL74fVBmPa3FpMK4QkfeQYP");
  kategoriList.push("CjQ9Tbv7ZsJqTC4Yw2xmL4NEfh3GdN");
  kategoriList.push("3c9DPnT8ZNGnQ3pzUG474XvhHHZvzN");



Parse.Cloud.define("getHomeDiscoverObjects", async (request) => {

  let user;
  if(request.master){
    user = new Parse.User({id:request.params.userID});
  }
  else{
    user = request.user;
  }
  if(!user){
    throw "denied";
  }

  var langtext = request.params.lang;
  if(langtext===undefined || langtext === null){
    langtext = 'en';
  }

  var langList = [];
  var langListOnly = [];
  if(!langtext.startsWith("en")){
    langList.push("en");
  }
  langList.push(langtext.substring(0, 2));
  langListOnly.push(langtext.substring(0, 2));



  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("who",user);
  getBlock.select("owner");
  getBlock.descending("createdAt");
  getBlock.limit(1000);
  

  console.log("block list");
  


  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.descending("createdAt");
  getLikes.select("post");
  getLikes.limit(1000);


  const interestQuery = new Parse.Query("UserInterest");
  interestQuery.equalTo("user",user);
  interestQuery.descending("count");
  interestQuery.limit(6);
  

  let [bList, lList,interestList] = await Promise.all([getBlock.find({useMasterKey:true}),getLikes.find({useMasterKey:true}),interestQuery.find({useMasterKey:true})]);

  
  var followList = [];
  for(var i = 0; i < bList.length; i++){
    followList.push(bList[i].get("owner"));
  }
  followList.push(user);
  console.log("added follow list");

  let seenL = [];
  if(request.params.seenList !== undefined && request.params.seenList !== null){
    if(request.params.seenList.length > 0){
      seenL = seenL.concat(request.params.seenList);
    }
  }
  for(const idl of lList){
    seenL.push(idl.get("post").id);
  }
  //seenL = seenL.concat(lList);

  
  interestList = interestList.slice(0,Math.min(interestList.length,6));



  
  var totalInterest = 0;
  let intJson = [];

  for(var i = 0; i < 6; i++){
    var interest = interestList[i];
    if(interest){
      totalInterest = totalInterest + interest.get("count");
      let nj = {"interest":interest.get("content"),"count":interest.get("count")};
      intJson.push(nj);
    }
    else{
      let an = Math.floor(Math.random() * (kategoriList.length + 1));
      if(an > kategoriList.length || an < 0){
        an = kategoriList.length;
      }
      let nj = {"interest":kategoriList[an],"count":1};
      intJson.push(nj);
    }
    //console.log(totalInterest);
  }

  console.log(intJson);


  

  var allPostList = [];

  await new Promise((resolve, reject) => {

    let triedtimes = 0;
    const prLimit = intJson.length;
    for(let az = 0; az < prLimit; az++){
      const getPosts = new Parse.Query("Post");
      getPosts.notContainedIn("objectId",seenL);
      getPosts.notContainedIn("user",followList);
      getPosts.include("user");
      getPosts.containedIn("lang",getLangList(intJson[az].interest,langtext.substring(0, 2)));
      getPosts.exclude("words","updatedAt","lang","accounttype","private","reportable");
      getPosts.descending("createdAt");
      getPosts.equalTo("accounttype",2);
      getPosts.hint('getDiscoverPosts');
      let hmtval = 200;
      let fruits = Math.random()*1000;
      if(fruits >= 900){
        hmtval = 20;
      }
      getPosts.skip(Math.floor(Math.random() * ((request.params.hmt + 1) * hmtval)));
      getPosts.containsAll("words",["c_"+intJson[az].interest]);
      getPosts.limit(Math.max(1,Math.min(10,Math.ceil((intJson[az].count * 20) / totalInterest))));
      getPosts.find({useMasterKey:true}).then((res) => {
        triedtimes++;
        allPostList = allPostList.concat(res);
        if(triedtimes === prLimit){
          resolve();
        }
        
      }, (error) => {
        triedtimes++;
        if(triedtimes === prLimit){
          resolve();
        }
      });
    }
  });
  
  
  const getLikess = new Parse.Query("Like");
  getLikess.equalTo("owner",user);
  getLikess.select("post");
  getLikess.hint("owner_post");
  getLikess.containedIn("post",allPostList);

  const likeList = await getLikess.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }


  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.select("post");
  getSaves.hint("owner_post");
  getSaves.containedIn("post",allPostList);

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }




  var fL = allPostList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":false,"date":new Date()};



});

Parse.Cloud.define("sendFirstMessage", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  const to = request.params.to;
  if(!to){
    throw "denied";
  }

  const text = request.params.text;
  if(!text){
    throw "denied";
  }

  const otherUser = new Parse.User({id:to});

  const query = new Parse.Query("Block");
  query.equalTo("owner",user);
  query.equalTo("who",otherUser);
  query.limit(1);
  const res = await query.count({useMasterKey:true});
  if(res > 1){
    throw "denied";
  }

  const query1 = new Parse.Query("Block");
  query1.equalTo("owner",otherUser);
  query1.equalTo("who",user);
  query1.limit(1);
  const res1 = await query1.count({useMasterKey:true});
  if(res1 > 1){
    throw "denied";
  }


  //const idL = [user.id,otherUser.id];

  const getChat = new Parse.Query("Chat");
  getChat.containsAll("users",[user.id,otherUser.id]);
  getChat.limit(1);
  const chatL = await getChat.find({useMasterKey:true});
  if(chatL.length>0){

    const chat=chatL[0];


    const message = new Message();
    message.set("owner",user.id);
    message.set("chat",chat.id);
    message.set("message",text);
  
    const groupACL2 = new Parse.ACL();
    groupACL2.setReadAccess(user, true);
    groupACL2.setReadAccess(otherUser, true);
    message.setACL(groupACL);
    return {"chat":chat,"message":await message.save(null,{sessionToken:user.getSessionToken()})};
  }
  else{
    const chat = new Chat();
    chat.set("users",[user.id,otherUser.id]);
    chat.set("lastedit",new Date(1970, 1, 1));
    chat.set("lastposter",user.id);
    chat.set("read",false);
    chat.set("lastmessage","");
  
    const groupACL = new Parse.ACL();
    groupACL.setReadAccess(user, true);
    groupACL.setReadAccess(otherUser, true);
    //groupACL.setWriteAccess(userList[i], true);
    
    chat.setACL(groupACL);
  
    await chat.save(null,{useMasterKey:true});
  
  
    const message = new Message();
    message.set("owner",user.id);
    message.set("chat",chat.id);
    message.set("message",text);
  
    const groupACL2 = new Parse.ACL();
    groupACL2.setReadAccess(user, true);
    groupACL2.setReadAccess(otherUser, true);
    message.setACL(groupACL);
    return {"chat":chat,"message":await message.save(null,{sessionToken:user.getSessionToken()})};

  }

  
  
  
});

Parse.Cloud.define("getChatAndMessages", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  const to = request.params.to;

  const getChat = new Parse.Query("Chat");
  getChat.containsAll("users",[user.id,to]);
  getChat.limit(1);
  const chatL = await getChat.find({useMasterKey:true});

  if(chatL.length > 0){
    const chat = chatL[0];

    const getMessages = new Parse.Query("Message");
    getMessages.equalTo("chat",chat.id);
    getMessages.descending("createdAt");
    getMessages.limit(20);
    const messages = await getMessages.find({sessionToken:user.getSessionToken()});
    if(messages.lessThan<1){
      return {"chat":chat,"messages":[],"hasmore":false,"date":new Date()};
    } 
    return {"chat":chat,"messages":messages,"hasmore":messages.length >= 20,"date":messages[messages.length-1].get("createdAt")};
  }
  return {"chat":null,"messages":[]};

});

Parse.Cloud.define("removeDeletedChatMessages", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var chat = new Parse.Object("Chat",{id:request.params.chat});

  const queryNotif = new Parse.Query("Message");
  queryNotif.equalTo("chat", chat.id);
  //queryNotif.hint("follow");
  //queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  var bool = results.length > 999;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("removeDeletedChatMessages",request.params,{useMasterKey:true});
  }


});

Parse.Cloud.define("removeChatsAfterBlock", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var otherUser = new Parse.User({id:request.params.who});
  var user = new Parse.User({id:request.params.owner});
  const queryNotif = new Parse.Query("Chat");
  queryNotif.containsAll("users", [user.id,otherUser.id]);
  //queryNotif.hint("follow");
  //queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  var bool = results.length > 999;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("removeChatsAfterBlock",request.params,{useMasterKey:true});
  }


});

Parse.Cloud.define("notifResetMessages", async (request) => {
  const user = request.user;
  if(!user){
    throw "denied";
  }
  user.set("messages",0);
  await user.save(null,{useMasterKey:true});

});

Parse.Cloud.define("setChatAsRead", async (request) => {
  const user = request.user;
  const chatId = request.params.chat;
  if(!user || !chatId){
    throw "denied";
  }

  const chat = new Parse.Object("Chat",{id:chatId});
  await chat.fetch({useMasterKey:true});

  if(chat.get("users").indexOf(user.id) >= 0){
    if(chat.get("lastposter") !== user.id){
      chat.set("read",true);
      await chat.save(null,{useMasterKey:true});
      return true;
    }
    return true;
  }
  throw "denied";
  

});

Parse.Cloud.define("getChats", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "denied";
  }

  const getChat = new Parse.Query("Chat");
  getChat.containedIn("users",[user.id]);
  getChat.limit(20);
  if(request.params.ids){
    getChat.containedIn("objectId",request.params.ids);
    getChat.limit(100);
  }
  else{
    if(request.params.date){
      getChat.lessThan("lastedit",request.params.date);
    }
  }
  getChat.descending("lastedit");
  
  const chatL = await getChat.find({useMasterKey:true});

  if(chatL.length < 1){
    return {"result":[]};
  }
  const idList = [];
  for(const chat of chatL){
    for(const userid of chat.get("users")){
      if(user.id!==userid){
        idList.push(userid);
        break
      }
    }
  }

  const getUsers = new Parse.Query("_User");
  getUsers.containedIn("objectId",idList);
  getUsers.exclude("email");
  const userList = await getUsers.find({useMasterKey:true});

  const hashList = [];

  for(let si = 0; si < chatL.length; si++){
    const lastChat = chatL[si];
    for(const us of userList){
      if(lastChat.get("users").indexOf(us.id) >= 0){
        hashList.push({"user":us,"chat":lastChat});
        break;
      }
    }
  }

  return {"result":hashList,"hasmore":hashList.length >= 20,"date":hashList[hashList.length-1].chat.get("lastedit")};

});

Parse.Cloud.define("getMessages", async (request) => {
  const user = request.user;
  const chatId = request.params.chat;
  if(!user || !chatId){
    throw "denied";
  }
  const chat = new Parse.Object("Chat",{id:chatId});
  await chat.fetch({useMasterKey:true});
  if(chat.get("users").indexOf(user.id) >= 0){
    const getMessages = new Parse.Query("Message");
    getMessages.equalTo("chat",chat.id);
    getMessages.descending("createdAt");
    if(request.params.date){
      getMessages.lessThan("createdAt",request.params.date);
    }
    getMessages.limit(20);
    const messages = await getMessages.find({sessionToken:user.getSessionToken()});
    if(messages.lessThan<1){
      return {"messages":[],"hasmore":false,"date":new Date()};
    } 
    return {"messages":messages,"hasmore":messages.length >= 20,"date":messages[messages.length-1].get("createdAt")};

  }
  throw "denied";
  


});



Parse.Cloud.define("changeEmail", async (request) => {
  const user = request.user;
  const pass = request.params.pass;
  const email = request.params.email;
  if(!user || !pass){
    throw "denied";
  }

  await Parse.User.verifyPassword(user.get("username"),pass);
  user.set("email",email)
  const newUser = await user.save(null,{useMasterKey:true});
  return {"user":newUser};

});


Parse.Cloud.define("changePassword", async (request) => {
  const user = request.user;
  const currentpass = request.params.currentpass;
  const newpass = request.params.newpass;
  if(!user || !currentpass || !newpass){
    throw "denied";
  }

  await Parse.User.verifyPassword(user.get("username"),currentpass);
  user.set("password",newpass)
  const newUser = await user.save(null,{useMasterKey:true});
  return {"user":newUser};

});

Parse.Cloud.define("removePostReportsAdmBlaBla", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var post = new Parse.Object("Post",{id:request.params.id});
    post.set("reportable",false);
    post.set("reportnumber",0);
    await post.save(null,{useMasterKey:true});
  }
  throw "denied";
});

Parse.Cloud.define("deletePostAdmBlaBla", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var post = new Parse.Object("Post",{id:request.params.id});
    await post.destroy({useMasterKey:true});
  }
  throw "denied";
});

Parse.Cloud.define("getReportedPostsBlaBla", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var q = new Parse.Query("Post");
    q.limit(50);
    q.equalTo("reportable",true);
    q.hint("reportable_reportnumber");
    q.descending("reportnumber");
    q.greaterThan("reportnumber",0);
    q.include("user");
    return await q.find({useMasterKey:true});
  }
  throw "denied";
  
  
});


Parse.Cloud.define("getUserBlaBlaPostsNA", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var id = request.params.id;
    if(!id){
      throw "denied";
    }
    const otherUser = new Parse.User({id:id});
    var q = new Parse.Query("Post");
    q.limit(50);
    q.descending("createdAt");
    q.include("user");
    q.hint("user_createdAt");
    q.equalTo("user",otherUser);
    return await q.find({useMasterKey:true});
  }
  throw "denied";

});


Parse.Cloud.define("rejectAccountTypeChangeRequest", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    const otherUser = new Parse.User({id:request.params.id});
    //await otherUser.fetch({useMasterKey:true});
    var today = new Date();
    var nextweek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);
    
    otherUser.set("switchdate",nextweek);
    //otherUser.set("reviewed",false);
    await otherUser.save(null,{useMasterKey:true});
  }
  throw "denied";
  
  
});

Parse.Cloud.define("acceptAccountTypeChangeRequest", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var li = request.params.li;
    if(!li){
      throw "denied";
    }
    const otherUser = new Parse.User({id:request.params.id});
    otherUser.set("accounttype",2);
    otherUser.set("reviewed",true);
    otherUser.set("content",li);
    await otherUser.save(null,{useMasterKey:true});
  }
  throw "denied";

});

Parse.Cloud.define("getPendingSwitchReqs", async (request) => {
  if(request.user===undefined){
    throw "denied";
  }
  if(request.user.get("N6GLd6ENxW")>0){
    var q = new Parse.Query("_User");
    q.equalTo("accounttype",2);
    q.hint("getPendingSwitchRequests");
    q.equalTo("reviewed",false);
    q.ascending("switchdate");
    q.limit(50);
    return await q.find({useMasterKey:true});
    
  }
  throw "denied";
  
  
});

Parse.Cloud.define("getSuggestsFromList", async (request) => {
  
  const user = request.user;
  if(!user){
    throw "denied";
  }

  let langtext = request.params.lang;
  langtext = langtext.substring(0, 2);
  

  const list = request.params.list;

  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.select("who");
  getFollow.descending("createdAt");
  getFollow.limit(1000);
  const fList = await getFollow.find({useMasterKey:true});

  var followList = [];

  for(var i = 0;i<fList.length;i++){
    followList.push(fList[i].get("who").id);
  }

  followList.push(user.id);
  var suggestList = [];

  if(list !== undefined){
    console.log("list defined");
    if(list.length > 0){
      console.log("list size büyük 0");
      for(var i = 0; i < list.length; i++){
        var tq = new Parse.Query("_User");
        tq.hint('userIndex101');
        tq.containedIn("content",[list[i]]);
        tq.notContainedIn("objectId",followList);
        tq.skip(Math.random() * (50));
        tq.limit(3);
        tq.equalTo("lang",langtext);
        tq.descending("createdAt");
        try{
          var res = await tq.find({useMasterKey:true});
          for(var ia = 0; ia < res.length; ia++){
            suggestList.push(res[ia]);
            followList.push(res[ia].id);
          }
        }catch(err){}
        
      }
      return {"profiles":suggestList};
    }
    else{
      console.log("list size küçük eşit 0");
      const kategoriList = ["h9LBH2LVNj9PVpsH9HT7BS6fP8ML3X","3Chefq52Ky5wBFbG8E74eRMksnqdFk","6N4Q6BfWsXC25vRNhAu5PkZaU9N69k","th2CCLbLhuXXgHFaqSq6r4yWL9m4rQ","yLSwFZHnSDzM399mxuPEhKTvNq2jBr","kC8vrjRNG7AxjP6xqUdWLkDn2NbCsh","JsJCapxsL74fVBmPa3FpMK4QkfeQYP","mwhrT4CauTx622t5r524GVwzb7Evvz","CjQ9Tbv7ZsJqTC4Yw2xmL4NEfh3GdN","5aT7qyvEVTEf3aTFNuvUwmR9HFwnVq","bcytkHHQPpUrBgAUdSD2E9FeTc4kew"]
      for(var i = 0; i < kategoriList.length; i++){
        var tq = new Parse.Query("_User");
        tq.containedIn("content",[kategoriList[i]]);
        tq.notContainedIn("objectId",followList);
        tq.skip(Math.random() * (50));
        tq.limit(3);
        tq.equalTo("lang",langtext);
        tq.hint('userIndex101');
        tq.descending("createdAt");
        try{
          var res = await tq.find({useMasterKey:true});
          for(var ia = 0; ia < res.length; ia++){
            suggestList.push(res[ia]);
            followList.push(res[ia].id);
          }
        }catch(err){}
        
      }
      return {"profiles":suggestList};
    }
  }
  else{
    console.log("list undefined");
    const kategoriList = ["h9LBH2LVNj9PVpsH9HT7BS6fP8ML3X","3Chefq52Ky5wBFbG8E74eRMksnqdFk","6N4Q6BfWsXC25vRNhAu5PkZaU9N69k","th2CCLbLhuXXgHFaqSq6r4yWL9m4rQ","yLSwFZHnSDzM399mxuPEhKTvNq2jBr","kC8vrjRNG7AxjP6xqUdWLkDn2NbCsh","JsJCapxsL74fVBmPa3FpMK4QkfeQYP","mwhrT4CauTx622t5r524GVwzb7Evvz","CjQ9Tbv7ZsJqTC4Yw2xmL4NEfh3GdN","5aT7qyvEVTEf3aTFNuvUwmR9HFwnVq","bcytkHHQPpUrBgAUdSD2E9FeTc4kew"]
    for(var i = 0; i < kategoriList.length; i++){
      var tq = new Parse.Query("_User");
      tq.containedIn("content",[kategoriList[i]]);
      tq.notContainedIn("objectId",followList);
      tq.skip(Math.random() * (50));
      tq.limit(3);
      tq.equalTo("lang",langtext);
      tq.hint('userIndex101');
      tq.descending("createdAt");
      try{
        var res = await tq.find({useMasterKey:true});
        for(var ia = 0; ia < res.length; ia++){
          suggestList.push(res[ia]);
          followList.push(res[ia].id);
        }
      }catch(err){
        console.log()
      }
      
    }
    return {"profiles":suggestList};
  }

});

Parse.Cloud.define("newRegisterCategoryChoose", async (request) => {
  const user = request.user;
  if(!user){
    throw "denied";
  }

  const list = request.params.list;
  if(!list){
    throw "denied";
  }

  var q = new Parse.Query("UserInterest");
  q.equalTo("user",user);
  var count = await q.count({useMasterKey:true});
  if(count > 0){
    throw "denied";
  }
  for(var i = 0; i < Math.max(list.length,featuredList.length); i++){
    let content = list[i];
    if(content){
      var interest = new UserInterest();
      interest.set("user",user);
      interest.set("content",content);
      if(featuredList.indexOf(content)>=0){
        interest.set("count",3);
      }
      else{
        interest.set("count",1);
      }
      interest.set("cid",user.id+list[i]);
      try{
        await interest.save(null,{useMasterKey:true});
      }catch(err){}
    }
    else{
      let content2 = featuredList[i];
      if(content2){
        var interest = new UserInterest();
        interest.set("user",user);
        interest.set("content",content2);
        interest.set("count",3);
        interest.set("cid",user.id+list[i]);
        try{
          await interest.save(null,{useMasterKey:true});
        }catch(err){}
      }
    }
  }

  

});

Parse.Cloud.define("commentText", async (request) => {

  const user = request.user;
  if(user===undefined){
      throw "5874";
  }
  if(request.params.post===undefined){
    throw "postUndefined";
  }
  var text = request.params.text;
  if(text!==undefined){
    text = text.trim().replace(/\n{2,}/g, '\n\n')
  }


  const post = new Parse.Object('Post', { id: request.params.post });

  const comment = new Comment();
  comment.set("user",user);
  comment.set("type","text");
  comment.set("post",post);
  comment.set("cuser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  comment.set("puser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  if(request.params.reply===undefined){
    comment.set("isreply","false");
    const parentComment = new Parse.Object('Comment', { id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr" });
    comment.set("parent",parentComment);
  }
  else{
    const parentComment = new Parse.Object('Comment', { id: request.params.reply });
    comment.set("isreply","true");
    comment.set("parent",parentComment);
  }
  comment.set("replycount",0);
  comment.set("vote",0);
  comment.set("reportable",true);
  comment.set("description",text);
  comment.set("reportnumber",0);
  comment.set("media",[]);
  return {"comment":await comment.save(null,{useMasterKey:true})};

});



Parse.Cloud.define("commentImage", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "5874";
  }

  if(request.params.post===undefined){
    throw "postUndefined";
  }
  var text = request.params.text;
  if(text!==undefined){
    text = text.trim().replace(/\n{2,}/g, '\n\n')
  }
  if(!text){
    text = "";
  }

  var mediaList = request.params.medialist;
  if(mediaList.length !== 1){
    throw "denied";
  }


  const post = new Parse.Object('Post', { id: request.params.post });

  const comment = new Comment();
  comment.set("user",user);
  
  comment.set("post",post);
  comment.set("cuser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  comment.set("puser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  if(request.params.reply===undefined){
    comment.set("isreply","false");
    const parentComment = new Parse.Object('Comment', { id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"});
    comment.set("parent",parentComment);

  }
  else{
    const newParent = new Parse.Object("Comment",{id:request.params.reply});
    comment.set("parent",newParent);
    comment.set("isreply","true");
  }
  comment.set("replycount",0);
  comment.set("vote",0);
  comment.set("reportable",true);
  comment.set("description",text);
  comment.set("reportnumber",0);

  let options = { percentage: 5, responseType: 'base64' };

  var itemList = [];

  for(var i = 0; i < mediaList.length; i++){
    const media = mediaList[i];
    if(media===undefined){
      throw "5858";
  
    }
    if(!media.name().substr(0, media.name().lastIndexOf(".")).endsWith(user.id)){
      throw "denied";
    }
    

    const thumbData = await media.getData();
    
    
    
    const tempImg = Buffer.from(thumbData, 'base64');
    const mimeInfo = await fileType.fromBuffer(tempImg);
    console.log(mimeInfo);
    if(!mimeInfo.mime.startsWith("image")){
      throw "denied";
    }

    var dimensions = sizeOf(tempImg);
    var ratioh = dimensions.height;
    var ratiow = dimensions.width;
  
  
    const thumbnail = await imageThumbnail(tempImg, options);
  
    var mainmedia = new Parse.File("image_"+user.id, { base64: tempImg.toString('base64') },mimeInfo.mime);
    var thumbfile = new Parse.File("thumbnail_"+user.id, { base64: thumbnail },mimeInfo.mime);
    

    var item = {"type":"image","width":ratiow,"height":ratioh,"media":mainmedia,"thumbnail":thumbfile};
    itemList.push(item);
  
  }
  comment.set("type","image");
  comment.set("media",itemList);
  return {"comment":await comment.save(null,{useMasterKey:true})};

});

Parse.Cloud.define("newVideoCode", async (request) => {

  if(request.master){

    const user = new Parse.User({id:request.params.user});
  
    if(user===undefined){
      throw "5874";
    }

    await user.fetch({useMasterKey:true});

    var text = request.params.text;
    if(text!==undefined){
      text = text.trim().replace(/\n{2,}/g, '\n\n')
    }

    if(text===undefined){
      text="";
    }

    var mediaList = request.params.medialist;
    if(mediaList.length !== 1){
      throw "denied";
    }

    const post = new Post();


    if(user.get("accounttype")===2){
      post.set("accounttype",2);
      post.set("private",false);
    }
    else{
      post.set("accounttype",1);
      post.set("private",user.get("private"));
    }
    post.set("user",user);
    post.set("commentable",true);
    post.set("commentnumber",0);
    post.set("likenumber",0);
    post.set("reportnumber",0);
    post.set("reportable",true);
    post.set("description",text);
    
    post.set("lang",user.get("lang"));
    var wordsList = []

    if(text.trim().length>0){
      var text1 = text;

      text1 = text1.replace(/[.,\/#!$%\^&\*;:{}?=\-_`~()]/g,"");
      text1 = text1.replace("@","");
      text1 = text1.toLowerCase();
      text1 = text1.replace(/\s{2,}/g," ");
      text1 = text1.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '')
      var wordArray = text1.split(" ");
  
  
      var i = 0;
      for(i=0;i<wordArray.length;i++){
        if(wordsList.indexOf(wordArray[i])<0){
          wordsList.push(wordArray[i]);
        }
      }
      wordsList = wordsList.slice(0, 99);
 
      var hashtagPattern = /#[a-z0-9]+/gi
      var hashtagList = text.toLowerCase().match(hashtagPattern);
      if(hashtagList!==null&&hashtagList!==undefined){
        var newHash = [];
        for(i=0;i<hashtagList.length;i++){
          if(newHash.indexOf(hashtagList[i].replace("#",""))<0){
            newHash.push(hashtagList[i].replace("#",""));
          }
        }
        newHash = newHash.slice(0, 19);
    
        var i = 0;
        for(i=0;i<newHash.length;i++){
          if(wordsList.indexOf(newHash[i])<0){
            wordsList.push(newHash[i]);
          }
        }
      }
    }

  
    if(user.get("accounttype")===2){
      if(user.get("content")!==undefined){
        for(var z = 0;z<user.get("content").length;z++){
          wordsList.push("c_"+user.get("content")[z]);
        }
      }
    }


    post.set("words",wordsList);

    var itemList = [];
    for(var i = 0; i < mediaList.length; i++){
      
      if(mediaList[i].audio){
        const audio = mediaList[i].audio;

        const media = mediaList[i].mainmedia;
        if(media===undefined){
          throw "5858";
        }

        const thumb = mediaList[i].thumbnail;
        if(thumb===undefined){
          throw "5858";
        }

        let imagev = await axios.get(media, {responseType: 'arraybuffer'});
        const tempVid = Buffer.from(imagev.data);

        let audiov = await axios.get(audio, {responseType: 'arraybuffer'});
        const tempAud = Buffer.from(audiov.data);

        const mimeInfo = await fileType.fromBuffer(tempVid);
        const mimeInfo21 = await fileType.fromBuffer(tempAud);
        console.log(mimeInfo);

        if(!mimeInfo.mime.startsWith("video/mp4")){
          throw "denied";
        }

        if(!mimeInfo21.mime.startsWith("video/mp4")){
          throw "denied";
        }

        let imagevt = await axios.get(thumb, {responseType: 'arraybuffer'});
        const tempIm = Buffer.from(imagevt.data);
  
        const mimeInfo1 = await fileType.fromBuffer(tempIm);
        console.log(mimeInfo1);

        if(!mimeInfo1.mime.startsWith("image")){
          throw "denied";
        }

        var dosyaSizeaa = tempIm.byteLength;
        var sizeKBaa = dosyaSizeaa/1024;
        if(sizeKBaa>65){
          let options = { percentage: 50, responseType: 'base64' };
          thumbData = await imageThumbnail(tempIm, options);
        }

        var tmpobj = tmp.fileSync();
        var tmpobjAud = tmp.fileSync();

        try {
          fs.writeFileSync(tmpobj.name, tempVid);
          fs.writeFileSync(tmpobjAud.name, tempAud);

          var videoInfo = await ffprobe(tmpobj.name, { path: ffprobeStatic.path });

          if(videoInfo.streams[0].duration>=60.5){
            tmpobj.removeCallback();
            throw "VideoTooLong";
        
          }
        
          const videoW = videoInfo.streams[0].width;
          const videoH = videoInfo.streams[0].height;

          var tmpdest2 = tmp.fileSync();
          var proc = new ffmpeg();
          proc.setFfmpegPath(pathToFfmpeg);
          try{
            await new Promise((resolve, reject) => {

              proc.addInput(tmpobj.name)
              .addInput(tmpobjAud.name)
              .on('start', function(ffmpegCommand) {
                /// log something maybe
              })
              .on('end', function() {
                /// encoding is complete, so callback or move on at this point
                resolve();

              })
              .on('error', function(err) {
                /// error handling
                reject(err);
              })
              .addInputOption('-y')
              .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0','-shortest'])
              .output(tmpdest2.name+'.mp4')
              .run();
            });

            var vw = videoW;
            if(videoW>640){
              vw = 640;
            }
            
            var tmpdest = tmp.fileSync();
            var proc2 = new ffmpeg();
            proc.setFfmpegPath(pathToFfmpeg);
            try{
              await new Promise((resolve, reject) => {

                  proc2.addInput(tmpdest2.name+'.mp4')
                  .on('start', function(ffmpegCommand) {
                    /// log something maybe
                  })
                  .on('end', function() {
                    /// encoding is complete, so callback or move on at this point
                    resolve();

                  })
                  .on('error', function(err) {
                    /// error handling
                    reject(err);
                  })
                  .addInputOption('-y')
                  .outputOptions(['-vcodec libx264','-vf scale='+vw+':-2', '-crf 28', '-movflags +faststart', '-acodec copy'])
                  .output(tmpdest.name+'.mp4')
                  .run();
              });

              var fileBase64 = fs.readFileSync(tmpdest.name+'.mp4').toString('base64');
              tmpobj.removeCallback();
              tmpobjAud.removeCallback();
              tmpdest2.removeCallback();
              tmpdest.removeCallback();
              var mainmedia = new Parse.File("video_"+user.id, { base64: fileBase64 },mimeInfo.mime);

              var thumbfile = new Parse.File("image_"+user.id, { base64: tempIm.toString('base64') },mimeInfo1.mime);

              let options = { percentage: 12, responseType: 'base64' };

              const thumbnail2 = await imageThumbnail(tempIm, options);

              var thumbfile2 = new Parse.File("thumbnail_"+user.id, { base64: thumbnail2 },mimeInfo1.mime);

              var item = {"type":"video","width":videoW,"height":videoH,"media":mainmedia,"thumbnail":thumbfile,"thumbnail2":thumbfile2};
              itemList.push(item);


            }catch(err){
              tmpobj.removeCallback();
              tmpobjAud.removeCallback();
              tmpdest2.removeCallback();
              tmpdest.removeCallback();
              throw err;
            }

          }catch(err){
            tmpobj.removeCallback();
            tmpobjAud.removeCallback();
            tmpdest2.removeCallback();
            throw err;
          }

        } catch(err) {
          tmpobj.removeCallback();
          tmpobjAud.removeCallback();
          console.error(err);
          throw err;
        }
      }
      else{
        const media = mediaList[i].mainmedia;
        if(media===undefined){
          throw "5858";
        }

        const thumb = mediaList[i].thumbnail;
        if(thumb===undefined){
          throw "5858";
        }

        let imagev = await axios.get(media, {responseType: 'arraybuffer'});
        const tempVid = Buffer.from(imagev.data);


        const mimeInfo = await fileType.fromBuffer(tempVid);
        console.log(mimeInfo);

        if(!mimeInfo.mime.startsWith("video/mp4")){
          throw "denied";
        }

        let imagevt = await axios.get(thumb, {responseType: 'arraybuffer'});
        const tempIm = Buffer.from(imagevt.data);
  
        const mimeInfo1 = await fileType.fromBuffer(tempIm);
        console.log(mimeInfo1);

        if(!mimeInfo1.mime.startsWith("image")){
          throw "denied";
        }

        var dosyaSizeaa = tempIm.byteLength;
        var sizeKBaa = dosyaSizeaa/1024;
        if(sizeKBaa>65){
          let options = { percentage: 50, responseType: 'base64' };
          thumbData = await imageThumbnail(tempIm, options);
        }

        var tmpobj = tmp.fileSync();
        console.log(tmpobj);

        try {
          fs.writeFileSync(tmpobj.name, tempVid);

          var videoInfo = await ffprobe(tmpobj.name, { path: ffprobeStatic.path });
          

          if(videoInfo.streams[0].duration>=60.5){
            tmpobj.removeCallback();
            throw "VideoTooLong";
        
          }
        
          const videoW = videoInfo.streams[0].width;
          const videoH = videoInfo.streams[0].height;

          var vw = videoW;
          if(videoW>640){
            vw = 640;
          }

          var tmpdest = tmp.fileSync();
          var proc = new ffmpeg();
          proc.setFfmpegPath(pathToFfmpeg);
          try{
            await new Promise((resolve, reject) => {
              proc.addInput(tmpobj.name)
              .on('start', function(ffmpegCommand) {
                /// log something maybe
              })
              .on('end', function() {
                /// encoding is complete, so callback or move on at this point
                resolve();

              })
              .on('error', function(err) {
                /// error handling
                reject(err);
              })
              .addInputOption('-y')
              .outputOptions(['-vcodec libx264','-vf scale='+vw+':-2', '-crf 28', '-movflags +faststart', '-acodec copy'])
              .output(tmpdest.name+'.mp4')
              .run();
            });
            
            var fileBase64 = fs.readFileSync(tmpdest.name+'.mp4').toString('base64');
            tmpdest.removeCallback();
            tmpobj.removeCallback();
            var mainmedia = new Parse.File("video_"+user.id, { base64: fileBase64 },mimeInfo.mime);

            var thumbfile = new Parse.File("image_"+user.id, { base64: tempIm.toString('base64') },mimeInfo1.mime);

            let options = { percentage: 12, responseType: 'base64' };

            const thumbnail2 = await imageThumbnail(tempIm, options);

            var thumbfile2 = new Parse.File("thumbnail_"+user.id, { base64: thumbnail2 },mimeInfo1.mime);

            var item = {"type":"video","width":videoW,"height":videoH,"media":mainmedia,"thumbnail":thumbfile,"thumbnail2":thumbfile2};
            itemList.push(item);

          }catch(err){
            tmpobj.removeCallback();
            tmpdest.removeCallback();
            throw err;
          }

        } catch(err) {
          tmpobj.removeCallback();
          console.error(err);
          throw err;
        }
      }
        
    }

    if(itemList.length > 0){
      post.set("type","video");
      post.set("media",itemList);
      return await post.save(null,{useMasterKey:true});
    }
    else{
      throw "error";
    }
    
  }
  else{

    const user = request.user;
    if(user===undefined){
      throw "5874";
    }
    var text = request.params.text;
    if(text!==undefined){
      text = text.trim().replace(/\n{2,}/g, '\n\n')
    }

    if(text===undefined){
      text="";
    }

    var mediaList = request.params.medialist;
    if(mediaList.length !== 1){
      throw "denied";
    }

    const post = new Post();


    if(user.get("accounttype")===2){
      if(user.get("reviewed")===true){
        post.set("accounttype",2);
        post.set("private",false);
      }
      else{
        post.set("accounttype",1);
        post.set("private",false);
      }
    }
    else{
      post.set("accounttype",1);
      post.set("private",user.get("private"));
    }
    post.set("user",user);
    post.set("commentable",true);
    post.set("commentnumber",0);
    post.set("likenumber",0);
    post.set("reportnumber",0);
    post.set("reportable",true);
    post.set("description",text);
    post.set("lang",user.get("lang"));
    var wordsList = []

    if(text.trim().length>0){
      var text1 = text;

      text1 = text1.replace(/[.,\/#!$%\^&\*;:{}?=\-_`~()]/g,"");
      text1 = text1.replace("@","");
      text1 = text1.toLowerCase();
      text1 = text1.replace(/\s{2,}/g," ");
      text1 = text1.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '')
      var wordArray = text1.split(" ");
  
  
      var i = 0;
      for(i=0;i<wordArray.length;i++){
        if(wordsList.indexOf(wordArray[i])<0){
          wordsList.push(wordArray[i]);
        }
      }
      wordsList = wordsList.slice(0, 99);
 
      var hashtagPattern = /#[a-z0-9]+/gi
      var hashtagList = text.toLowerCase().match(hashtagPattern);
      if(hashtagList!==null&&hashtagList!==undefined){
        var newHash = [];
        for(i=0;i<hashtagList.length;i++){
          if(newHash.indexOf(hashtagList[i].replace("#",""))<0){
            newHash.push(hashtagList[i].replace("#",""));
          }
        }
        newHash = newHash.slice(0, 19);
    
        var i = 0;
        for(i=0;i<newHash.length;i++){
          if(wordsList.indexOf(newHash[i])<0){
            wordsList.push(newHash[i]);
          }
        }
      }
    }

  
    if(user.get("accounttype")===2){
      if(user.get("reviewed")===true){
        if(user.get("content")!==undefined){
          for(var z = 0;z<user.get("content").length;z++){
            wordsList.push("c_"+user.get("content")[z]);
          }
        }
      }
    }


    post.set("words",wordsList);

    var itemList = [];

    for(var i = 0; i < mediaList.length; i++){

      const media = mediaList[i].mainmedia;
      if(media===undefined){
        throw "5858";
      }

      const thumb = mediaList[i].thumbnail;
      if(thumb===undefined){
        throw "5858";
      }

      if(!media.name().substr(0, media.name().lastIndexOf(".")).endsWith(user.id)){
        throw "denied";
      }
    
      if(!thumb.name().substr(0, thumb.name().lastIndexOf(".")).endsWith(user.id)){
        throw "denied";
      }

      const mediaData = await media.getData();

      const tempVid = Buffer.from(mediaData, 'base64');
      const mimeInfo = await fileType.fromBuffer(tempVid);
      console.log(mimeInfo);

      if(!mimeInfo.mime.startsWith("video/mp4")){
        throw "denied";
      }


      var thumbData = await thumb.getData();

      const tempIm = Buffer.from(thumbData, 'base64');

      const mimeInfo1 = await fileType.fromBuffer(tempIm);
      console.log(mimeInfo1);

      if(!mimeInfo1.mime.startsWith("image")){
        throw "denied";
      }

      var dosyaSizeaa = tempIm.byteLength;
      var sizeKBaa = dosyaSizeaa/1024;
      if(sizeKBaa>65){
        let options = { percentage: 50, responseType: 'base64' };
        thumbData = await imageThumbnail(tempIm, options);
      }

      var tmpobj = tmp.fileSync();
      console.log(tmpobj);

      try {
        fs.writeFileSync(tmpobj.name, tempVid);
        var videoInfo = await ffprobe(tmpobj.name, { path: ffprobeStatic.path });

        tmpobj.removeCallback();

        if(videoInfo.streams[0].duration>=60.5){
          throw "VideoTooLong";
        }
        const videoW = videoInfo.streams[0].width;
        const videoH = videoInfo.streams[0].height;

        var mainmedia = new Parse.File("video_"+user.id, { base64: mediaData },mimeInfo.mime);

        var thumbfile = new Parse.File("image_"+user.id, { base64: thumbData },mimeInfo1.mime);

        let options = { percentage: 12, responseType: 'base64' };

        const thumbnail2 = await imageThumbnail(tempIm, options);

        var thumbfile2 = new Parse.File("thumbnail_"+user.id, { base64: thumbnail2 },mimeInfo1.mime);

        var item = {"type":"video","width":videoW,"height":videoH,"media":mainmedia,"thumbnail":thumbfile,"thumbnail2":thumbfile2};
        itemList.push(item);

      } catch(err) {
        tmpobj.removeCallback();
        console.error(err);
        throw err;
      }

      if(itemList.length > 0){
        post.set("type","video");
        post.set("media",itemList);
        return await post.save(null,{useMasterKey:true});
      }
      else{
        throw "error";
      }

    }

  }

  

});

Parse.Cloud.define("newImageCode", async (request) => {

  if(request.master){
    const userId = request.params.user;
    if(userId===undefined){
      throw "5874";
    }
    const user = new Parse.User({id:userId});
    await user.fetch({useMasterKey:true});

    var text = request.params.text;
    if(text!==undefined){
      text = text.trim().replace(/\n{2,}/g, '\n\n')
    }

    if(text===undefined){
      text=" ";
    }

    var mediaList = request.params.medialist;
    if(mediaList.length > 4 || mediaList.length < 1){
      throw "denied";
    }

    const post = new Post();


    if(user.get("accounttype")===2){
      post.set("accounttype",2);
      post.set("private",false);
    }
    else{
      post.set("accounttype",1);
      post.set("private",user.get("private"));
    }
    post.set("user",user);
    post.set("commentable",true);
    post.set("commentnumber",0);
    post.set("likenumber",0);
    post.set("reportnumber",0);
    post.set("reportable",true);
    post.set("description",text);
    post.set("lang",user.get("lang"));
    var wordsList = []

    if(text.trim().length>0){
      var text1 = text;

      text1 = text1.replace(/[.,\/#!$%\^&\*;:{}?=\-_`~()]/g,"");
      text1 = text1.replace("@","");
      text1 = text1.toLowerCase();
      text1 = text1.replace(/\s{2,}/g," ");
      text1 = text1.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '')
      var wordArray = text1.split(" ");
  
  
      var i = 0;
      for(i=0;i<wordArray.length;i++){
        if(wordsList.indexOf(wordArray[i])<0){
          wordsList.push(wordArray[i]);
        }
      }
      wordsList = wordsList.slice(0, 99);
 
      var hashtagPattern = /#[a-z0-9]+/gi
      var hashtagList = text.toLowerCase().match(hashtagPattern);
      if(hashtagList!==null&&hashtagList!==undefined){
        var newHash = [];
        for(i=0;i<hashtagList.length;i++){
          if(newHash.indexOf(hashtagList[i].replace("#",""))<0){
            newHash.push(hashtagList[i].replace("#",""));
          }
        }
        newHash = newHash.slice(0, 19);
    
        var i = 0;
        for(i=0;i<newHash.length;i++){
          if(wordsList.indexOf(newHash[i])<0){
            wordsList.push(newHash[i]);
          }
        }
      }
    }

  
    if(user.get("accounttype")===2){
      if(user.get("content")!==undefined){
        for(var z = 0;z<user.get("content").length;z++){
          wordsList.push("c_"+user.get("content")[z]);
        }
      }
    }


    post.set("words",wordsList);
    let options = { percentage: 5, responseType: 'base64' };

    var itemList = [];

    for(var i = 0; i < mediaList.length; i++){
      const media = mediaList[i];
      if(media===undefined){
        throw "5858";
    
      }
      

      let image = await axios.get(media, {responseType: 'arraybuffer'});
      const tempImg = Buffer.from(image.data);

      const mimeInfo = await fileType.fromBuffer(tempImg);
      console.log(mimeInfo);
      if(!mimeInfo.mime.startsWith("image")){
        throw "denied";
      }

      var dimensions = sizeOf(tempImg);
      var ratioh = dimensions.height;
      var ratiow = dimensions.width;
    
    
      const thumbnail = await imageThumbnail(tempImg, options);
    
      var mainmedia = new Parse.File("image_"+user.id, { base64: tempImg.toString('base64') },mimeInfo.mime);
      var thumbfile = new Parse.File("thumbnail_"+user.id, { base64: thumbnail },mimeInfo.mime);
      

      var item = {"type":"image","width":ratiow,"height":ratioh,"media":mainmedia,"thumbnail":thumbfile};
      itemList.push(item);
    
    }
    post.set("type","image");
    post.set("media",itemList);
    return await post.save(null,{useMasterKey:true});
  }
  else{
    
    const user = request.user;
    if(user===undefined){
      throw "5874";
    }
    var text = request.params.text;
    if(text!==undefined){
      text = text.trim().replace(/\n{2,}/g, '\n\n')
    }

    if(text===undefined){
      text=" ";
    }

    var mediaList = request.params.medialist;
    if(mediaList.length > 4 || mediaList.length < 1){
      throw "denied";
    }

    const post = new Post();


    if(user.get("accounttype")===2){
      if(user.get("reviewed")===true){
        post.set("accounttype",2);
        post.set("private",false);
      }
      else{
        post.set("accounttype",1);
        post.set("private",false);
      }
    }
    else{
      post.set("accounttype",1);
      post.set("private",user.get("private"));
    }
    post.set("user",user);
    post.set("commentable",true);
    post.set("commentnumber",0);
    post.set("likenumber",0);
    post.set("reportnumber",0);
    post.set("reportable",true);
    post.set("description",text);
    post.set("lang",user.get("lang"));
    var wordsList = []

    if(text.trim().length>0){
      var text1 = text;

      text1 = text1.replace(/[.,\/#!$%\^&\*;:{}?=\-_`~()]/g,"");
      text1 = text1.replace("@","");
      text1 = text1.toLowerCase();
      text1 = text1.replace(/\s{2,}/g," ");
      text1 = text1.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '')
      var wordArray = text1.split(" ");
  
  
      var i = 0;
      for(i=0;i<wordArray.length;i++){
        if(wordsList.indexOf(wordArray[i])<0){
          wordsList.push(wordArray[i]);
        }
      }
      wordsList = wordsList.slice(0, 99);
 
      var hashtagPattern = /#[a-z0-9]+/gi
      var hashtagList = text.toLowerCase().match(hashtagPattern);
      if(hashtagList!==null&&hashtagList!==undefined){
        var newHash = [];
        for(i=0;i<hashtagList.length;i++){
          if(newHash.indexOf(hashtagList[i].replace("#",""))<0){
            newHash.push(hashtagList[i].replace("#",""));
          }
        }
        newHash = newHash.slice(0, 19);
    
        var i = 0;
        for(i=0;i<newHash.length;i++){
          if(wordsList.indexOf(newHash[i])<0){
            wordsList.push(newHash[i]);
          }
        }
      }
    }

  
    if(user.get("accounttype")===2){
      if(user.get("reviewed")===true){
        if(user.get("content")!==undefined){
          for(var z = 0;z<user.get("content").length;z++){
            wordsList.push("c_"+user.get("content")[z]);
          }
        }
      }
    }


    post.set("words",wordsList);
    let options = { percentage: 5, responseType: 'base64' };

    var itemList = [];

    for(var i = 0; i < mediaList.length; i++){
      const media = mediaList[i];
      if(media===undefined){
        throw "5858";
    
      }
      if(!media.name().substr(0, media.name().lastIndexOf(".")).endsWith(request.user.id)){
        throw "denied";
      }
    
    
      const thumbData = await media.getData();
    
    
    
      const tempImg = Buffer.from(thumbData, 'base64');
      const mimeInfo = await fileType.fromBuffer(tempImg);
      console.log(mimeInfo);
      if(!mimeInfo.mime.startsWith("image")){
        throw "denied";
      }

      var dimensions = sizeOf(tempImg);
      var ratioh = dimensions.height;
      var ratiow = dimensions.width;
    
    
      const thumbnail = await imageThumbnail(tempImg, options);
    
      var mainmedia = new Parse.File("image_"+user.id, { base64: thumbData },mimeInfo.mime);
      var thumbfile = new Parse.File("thumbnail_"+user.id, { base64: thumbnail },mimeInfo.mime);
      

      var item = {"type":"image","width":ratiow,"height":ratioh,"media":mainmedia,"thumbnail":thumbfile};
      itemList.push(item);
    
    }
    post.set("type","image");
    post.set("media",itemList);
    return await post.save(null,{useMasterKey:true});
    
  }


});




Parse.Cloud.define("saveUserDeviceToken", async (request) => {
  var token  = request.params.token;
  var user = request.user;
  var lang = request.params.lang;
  if(!lang){
    lang="en";
  }
  if(!user){
    throw "denied";
  }
  var query = new Parse.Query("DeviceToken");
  query.equalTo("token",token);
  query.equalTo("user",user);
  
  query.limit(1);
  var result = await query.count({useMasterKey:true});
  if(result<1){
    var dt = new DeviceToken();
    dt.set("user",user);
    dt.set("lang",lang);
    dt.set("token",token);
    await dt.save(null,{useMasterKey:true});
  }
  else{
    const dt = result[0];
    if(dt.get("lang")!==lang){
      dt.set("lang",lang);
      await dt.save(null,{useMasterKey:true});
    }
  }
  
});

Parse.Cloud.define("getSuggestionProfiles", async (request) => {

  var userId = request.params.userID;
  if(!userId){
    throw "denied";
  }

  var user = request.user;
  if(!user){
    throw "denied";
  }

  let langtext = request.params.lang;
  langtext = langtext.substring(0, 2);
  var query = new Parse.Query("_User");
  query.equalTo("objectId",userId);
  query.select("accounttype","content","following");
  query.limit(1);
  const resultList = await query.find({useMasterKey:true});

  if(resultList.length<1){
    throw "denied";
  }

  const otherUser = resultList[0];

  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.select("who");
  getFollow.descending("createdAt");
  getFollow.limit(1000);
  const fList = await getFollow.find({useMasterKey:true});

  var followList = [];

  for(var i = 0;i<fList.length;i++){
    followList.push(fList[i].get("who").id);
  }

  followList.push(user.id);
  followList.push(otherUser.id);

  if(otherUser.get("accounttype")===2){
    var tq = new Parse.Query("_User");
    tq.containedIn("content",otherUser.get("content"));
    tq.notContainedIn("objectId",followList);
    tq.skip(Math.floor(Math.random() * Math.floor(50)))
    tq.limit(3);
    tq.equalTo("lang",langtext);
    tq.hint('userIndex101');
    tq.descending("createdAt");
    return {"profiles":await tq.find({useMasterKey:true})};
  }
  else{
    const getFollow2 = new Parse.Query("Follow");
    getFollow2.equalTo("owner",otherUser);
    getFollow2.select("who");
    getFollow2.include("who");
    getFollow2.equalTo("lang",langtext);
    getFollow2.skip(Math.floor(Math.random() * Math.floor(otherUser.get("following"))))
    getFollow2.limit(3);
    const resL = await getFollow2.find({useMasterKey:true});
    var final = [];
    for(var i = 0; i < resL.length; i++){
      if(followList.indexOf(resL[i].get("who").id)<0){
        final.push(resL[i].get("who"));
      }
    }
    return {"profiles":final};
  }


});


Parse.Cloud.define("deleteNotifsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }


  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const getNotif1 = new Parse.Query("Notif");
  getNotif1.equalTo("owner",user);
  getNotif1.select("objectId");
  getNotif1.equalTo("to",otherUser);
  getNotif1.hint("owner_to");
  getNotif1.limit(1000);
  const results = await getNotif1.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteNotifsAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }

    
});
Parse.Cloud.define("deleteNotifsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }


  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const getNotif1 = new Parse.Query("Notif");
  getNotif1.equalTo("owner",otherUser);
  getNotif1.equalTo("to",user);
  getNotif1.hint("owner_to");
  getNotif1.select("objectId");
  getNotif1.limit(1000);
  const results = await getNotif1.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteNotifsAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }

    
});

Parse.Cloud.define("deleteFollowsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryFollow2 = new Parse.Query("Follow");
  queryFollow2.equalTo("who", user);
  queryFollow2.equalTo("owner", otherUser);
  queryFollow2.select("objectId");
  queryFollow2.limit(1000);
  const results = await queryFollow2.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteFollowsAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }

    
});
Parse.Cloud.define("deleteFollowsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryFollow2 = new Parse.Query("Follow");
  queryFollow2.equalTo("who", otherUser);
  queryFollow2.equalTo("owner", user);
  queryFollow2.limit(1000);
  queryFollow2.select("objectId");
  const results = await queryFollow2.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteFollowsAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }

    
});

Parse.Cloud.define("deleteFollowRequestsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryFollow2 = new Parse.Query("FollowRequest");
  queryFollow2.equalTo("who", otherUser);
  queryFollow2.equalTo("owner", user);
  queryFollow2.hint("owner_who");
  queryFollow2.select("objectId");
  queryFollow2.limit(1000);
  const results = await queryFollow2.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteFollowRequestsAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }

    
});
Parse.Cloud.define("deleteFollowRequestsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryFollow2 = new Parse.Query("FollowRequest");
  queryFollow2.equalTo("who", user);
  queryFollow2.select("objectId");
  queryFollow2.hint("owner_who");
  queryFollow2.equalTo("owner", otherUser);
  queryFollow2.limit(1000);
  const results = await queryFollow2.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteFollowRequestsAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }

    
});

Parse.Cloud.define("deleteLikesAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryLike = new Parse.Query("Like");
  queryLike.equalTo("puser", user);
  queryLike.hint("puser_owner");
  queryLike.select("objectId");
  queryLike.equalTo("owner", otherUser);
  queryLike.limit(1000);
  const results = await queryLike.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteLikesAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }

    
});
Parse.Cloud.define("deleteLikesAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryLike = new Parse.Query("Like");
  queryLike.equalTo("puser", otherUser);
  queryLike.select("objectId");
  queryLike.equalTo("owner", user);
  queryLike.hint("puser_owner");
  queryLike.limit(1000);
  const results = await queryLike.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteLikesAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }

    
});

Parse.Cloud.define("deleteSavedPostsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const querySavedPost = new Parse.Query("SavedPost");
  querySavedPost.equalTo("puser", otherUser);
  querySavedPost.select("objectId");
  querySavedPost.hint("owner_puser");
  querySavedPost.equalTo("owner", user);
  querySavedPost.limit(1000);
  const results = await querySavedPost.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteSavedPostsAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }
    
});
Parse.Cloud.define("deleteSavedPostsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const querySavedPost = new Parse.Query("SavedPost");
  querySavedPost.equalTo("puser", user);
  querySavedPost.select("objectId");
  querySavedPost.hint("owner_puser");
  querySavedPost.equalTo("owner", otherUser);
  querySavedPost.limit(1000);
  const results = await querySavedPost.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteSavedPostsAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }
    
});

Parse.Cloud.define("deleteCommentsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryComment = new Parse.Query("Comment");
  queryComment.equalTo("puser", user);
  queryComment.select("objectId");
  queryComment.equalTo("user",otherUser);
  queryComment.limit(1000);
  const results = await queryComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteCommensAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }
    
});
Parse.Cloud.define("deleteCommentsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryComment = new Parse.Query("Comment");
  queryComment.equalTo("puser", otherUser);
  queryComment.select("objectId");
  queryComment.equalTo("user", user);
  queryComment.limit(1000);
  const results = await queryComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteCommensAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }
    
});

Parse.Cloud.define("deleteSavedCommentsAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const querySavedComment = new Parse.Query("SavedComment");
  querySavedComment.equalTo("pauser", otherUser);
  querySavedComment.select("objectId");
  querySavedComment.hint("owner_pauser");
  querySavedComment.equalTo("owner", user);
  querySavedComment.limit(1000);
  const results = await querySavedComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteSavedCommentsAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }
    
});
Parse.Cloud.define("deleteSavedCommentsAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const querySavedComment = new Parse.Query("SavedComment");
  querySavedComment.equalTo("pauser", user);
  querySavedComment.select("objectId");
  querySavedComment.hint("owner_pauser");
  querySavedComment.equalTo("owner", otherUser);
  querySavedComment.limit(1000);
  const results = await querySavedComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteSavedCommentsAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }
    
});

Parse.Cloud.define("deleteCommentRepliesAfterBlockWhoToOwner", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryComment = new Parse.Query("Comment");
  queryComment.equalTo("cuser", otherUser);
  queryComment.select("objectId");
  queryComment.equalTo("user", user);
  queryComment.limit(1000);
  const results = await queryComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteCommentRepliesAfterBlockWhoToOwner", request.params,{useMasterKey:true});
  }
    
});
Parse.Cloud.define("deleteCommentRepliesAfterBlockOwnerToWho", async (request) => {

  if(!request.master){
    throw "denied";
  }



  const user = new Parse.User({id:request.params.owner});
  const otherUser = new Parse.User({id:request.params.who});

  const queryComment = new Parse.Query("Comment");
  queryComment.equalTo("cuser",user);
  queryComment.select("objectId");
  queryComment.equalTo("user", otherUser);
  queryComment.limit(1000);
  const results = await queryComment.find({useMasterKey:true});

  var bool = results.length > 999;

  for(var i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("deleteCommentRepliesAfterBlockOwnerToWho", request.params,{useMasterKey:true});
  }
    
});





Parse.Cloud.define("getRestOfTheDiscoverPost", async (request) => {
  const user = request.user;

  var text2 = request.params.text;
  if(text2===undefined){
    return {"posts:":[],"hasmore":false,"date":new Date()};
  }

  var text = [];
  for(var i = 0; i < text2.length; i++){
    text.push("c_"+text2[i]);
  }
  


  var langtext = request.params.lang;
  if(langtext===undefined || langtext === null){
    langtext = 'en';
  }

  var langList = [];
  var langListOnly = [];
  if(!langtext.startsWith("en")){
    langList.push("en");
  }
  langList.push(langtext.substring(0, 2));
  langListOnly.push(langtext.substring(0, 2));



  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("owner",user);
  getBlock.select("who");
  getBlock.descending("createdAt");
  getBlock.limit(1000);

  const bList = await getBlock.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("who"));
  }

  const getBlock2 = new Parse.Query("Block");
  getBlock2.equalTo("who",user);
  getBlock2.select("owner");
  getBlock2.descending("createdAt");
  getBlock2.limit(1000);

  const bList2 = await getBlock2.find({useMasterKey:true});

  for(i = 0;i<bList2.length;i++){
    bloList.push(bList2[i].get("owner"));
  }
  bloList.push(user);

  const getPosts = new Parse.Query("Post");

  
  


  if(request.params.date!==undefined){
    getPosts.lessThan("createdAt",request.params.date);
  } else {
    getPosts.skip(Math.floor(Math.random() * Math.floor(100)));
  }

  getPosts.notContainedIn("user",bloList);
  getPosts.include("user");
  getPosts.containedIn("lang",getLangList(text2[0],langtext.substring(0, 2)));
  if(request.params.seenList !== undefined && request.params.seenList !== null){
    if(request.params.seenList.length > 0){
      getPosts.notContainedIn("objectId",request.params.seenList);
    }
  }
  getPosts.exclude("words","updatedAt","lang","accounttype","private","reportable");
  getPosts.descending("createdAt");
  getPosts.equalTo("accounttype",2);
  getPosts.hint('getDiscoverPosts');
  getPosts.containsAll("words",text);
  getPosts.limit(10);
  const postList = await getPosts.find({useMasterKey:true});
  if(postList.length<1){
    return {"posts:":[],"hasmore":false,"date":new Date()};
  }


  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.select("post");
  getLikes.hint("owner_post");
  getLikes.containedIn("post",postList);

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }


  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.select("post");
  getSaves.hint("owner_post");
  getSaves.containedIn("post",postList);

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }





  var fL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":postList.length >= 10,"date":postList[postList.length-1].get("createdAt")}



});

Parse.Cloud.define("getDiscoverObjects", async (request) => {

  const user = request.user;
  if(!user){
    throw "denied";
  }

  var langtext = request.params.lang;
  if(langtext===undefined || langtext === null){
    langtext = 'en';
  }

  var langList = [];
  var langListOnly = [];
  if(!langtext.startsWith("en")){
    langList.push("en");
  }
  langList.push(langtext.substring(0, 2));
  langListOnly.push(langtext.substring(0, 2));



  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("who",user);
  getBlock.select("owner");
  getBlock.descending("createdAt");
  getBlock.limit(1000);
  const bList = await getBlock.find({useMasterKey:true});

  console.log("block list");
  


  /*const getFollow = new Parse.Query(Follow);
  getFollow.equalTo("owner",user);
  getFollow.select("who");
  getFollow.descending("createdAt");
  getFollow.limit(1000);
  const fList = await getFollow.find({useMasterKey:true});

  
  for(var i = 0; i < fList.length; i++){
    followList.push(fList[i].get("who"));
  }*/
  var followList = [];
  for(var i = 0; i < bList.length; i++){
    followList.push(bList[i].get("owner"));
  }
  followList.push(user);
  console.log("added follow list");


  

  const interestQuery = new Parse.Query("UserInterest");
  interestQuery.equalTo("user",user);
  const interestList = await interestQuery.find({useMasterKey:true});

  console.log("getted interest");
  var totalInterest = 0;
  for(var i = 0; i < interestList.length; i++){
    var interest = interestList[i];
    totalInterest = totalInterest + interest.get("count");
    //console.log(totalInterest);
  }
  console.log("getted interest after loop");
  var allPostList = [];

  var fetchedConten = [];

  await new Promise((resolve, reject) => {

    let triedtimes = 0;
    for(let i = 0; i < interestList.length; i++){

      var interest = interestList[i];
      var count = interest.get("count");
      var cont = interest.get("content");
      fetchedConten.push(cont);
      const getPosts = new Parse.Query("Post");
      getPosts.notContainedIn("user",followList);
      getPosts.include("user");
      getPosts.containedIn("lang",getLangList(interest.get("content"),langtext.substring(0, 2)));
      getPosts.exclude("words","updatedAt","lang","accounttype","private","reportable");
      getPosts.descending("createdAt");
      getPosts.equalTo("accounttype",2);
      getPosts.hint('getDiscoverPosts');
      getPosts.skip(Math.floor(Math.random() * 1000));
      getPosts.containsAll("words",["c_"+interest.get("content")]);
      getPosts.limit(Math.max(1,Math.min(8,Math.ceil((count * 45) / totalInterest))));
      getPosts.find({useMasterKey:true}).then((res) => {
        triedtimes++;
        allPostList = allPostList.concat(res);
        if(triedtimes === interestList.length){
          resolve();
        }
        
      }, (error) => {
        triedtimes++;
        if(triedtimes === interestList.length){
          resolve();
        }
      });
      
      
      
    }
  });
  console.log("await get interest posts");

  let tt2 = 0;
  await new Promise((resolve, reject) => {
    for(var i = 0; i < kategoriList.length; i++){
      if(fetchedConten.indexOf(kategoriList[i])<0){
  
        
        const getPosts = new Parse.Query("Post");
        getPosts.notContainedIn("user",followList);
        getPosts.include("user");
        getPosts.containedIn("lang",getLangList(kategoriList[i],langtext.substring(0, 2)));
        getPosts.exclude("words","updatedAt","lang","accounttype","private","reportable");
        getPosts.descending("createdAt");
        getPosts.equalTo("accounttype",2);
        getPosts.hint('getDiscoverPosts');
        getPosts.skip(Math.floor(Math.random() * 1000));
        getPosts.containsAll("words",["c_"+kategoriList[i]]);
        getPosts.limit(1);
        getPosts.find({useMasterKey:true}).then((res) => {
          tt2++;
          allPostList = allPostList.concat(res);
          if(tt2 === kategoriList.length){
            resolve();
          }
          
        }, (error) => {
          tt2++;
          if(tt2 === kategoriList.length){
            resolve();
          }
        });
      }
      else{
        tt2++;
        if(tt2 === kategoriList.length){
          resolve();
        }
      }
    }
  });
  
  console.log("await get rest interest posts");
  

  

  


  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.select("post");
  getLikes.hint("owner_post");
  getLikes.containedIn("post",allPostList);

  const likeList = await getLikes.find({useMasterKey:true});
  console.log("get likes");
  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }


  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.select("post");
  getSaves.hint("owner_post");
  getSaves.containedIn("post",allPostList);

  const saveList = await getSaves.find({useMasterKey:true});
  console.log("get saves");
  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }




  var fL = allPostList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":false,"date":new Date()};

});

Parse.Cloud.define("shareVideo", async (request) => {
  const user = request.user;
  if(user===undefined){
      throw "5874";

  }

  const media = request.params.medialist;
  if(media===undefined){
    throw "5858";
  }

  Parse.Cloud.run('newVideoCode',request.params, {sessionToken: user.getSessionToken() });

  return {"result":true};


});

Parse.Cloud.define("shareImage", async (request) => {
  const user = request.user;
  if(user===undefined){
      throw "5874";

  }
  const media = request.params.medialist;
  if(media===undefined){
    throw "5858";

  }




  Parse.Cloud.run('newImageCode',request.params, {sessionToken: user.getSessionToken() });

  return {"result":true};


});

Parse.Cloud.define("removeDeletedFollowNotifs", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var follow = new Parse.Object("Follow",{id:request.params.follow});

  const queryNotif = new Parse.Query("Notif");
  queryNotif.equalTo("follow", follow);
  queryNotif.hint("follow");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  var bool = results.length > 999;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("removeDeletedFollowNotifs",request.params,{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedCommentNotifs", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var comment = new Parse.Object("Comment",{id:request.params.comment});

  const queryNotif = new Parse.Query("Notif");
  queryNotif.equalTo("comment", comment);
  queryNotif.hint("comment");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  var bool = results.length > 999;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(bool){
    Parse.Cloud.run("removeDeletedCommentNotifs",request.params,{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedCommentSavedComment", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var comment = new Parse.Object("Comment",{id:request.params.comment});

  const queryNotif = new Parse.Query("SavedComment");
  queryNotif.equalTo("comment", comment);
  queryNotif.descending("createdAt");
  queryNotif.hint("comment_createdAt");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedCommentSavedComment", {"comment":request.params.comment},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedCommentVote", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var skip = 0;


  var comment = new Parse.Object("Comment",{id:request.params.comment});

  const queryNotif = new Parse.Query("CommentVote");
  queryNotif.equalTo("comment", comment);
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedCommentVote", {"comment":request.params.comment},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedCommentReport", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var comment = new Parse.Object("Comment",{id:request.params.comment});

  const queryNotif = new Parse.Query("ReportComment");
  queryNotif.equalTo("comment", comment);
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedCommentReport", {"comment":request.params.comment},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedCommentReply", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var comment = new Parse.Object("Comment",{id:request.params.comment});

  const queryNotif = new Parse.Query("Comment");
  queryNotif.equalTo("parent", comment);
  //queryNotif.descending("createdAt");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedCommentReply", {"comment":request.params.comment},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedPostComment", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var post = new Parse.Object("Post",{id:request.params.post});

  const queryNotif = new Parse.Query("Comment");
  queryNotif.equalTo("post", post);
  queryNotif.descending("createdAt");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedPostComment", {"post":request.params.post},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedPostSavedPost", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var post = new Parse.Object("Post",{id:request.params.post});

  const queryNotif = new Parse.Query("SavedPost");
  queryNotif.equalTo("post", post);
  queryNotif.descending("createdAt");
  queryNotif.select("objectId");
  queryNotif.hint("post_createdAt");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedPostSavedPost", {"post":request.params.post},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedLikeNotif", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var like = new Parse.Object("Like",{id:request.params.like});

  const queryNotif = new Parse.Query("Notif");
  queryNotif.equalTo("like", like);
  queryNotif.select("objectId");
  queryNotif.hint("like");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedLikeNotif", {"like":request.params.like},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedPostNotif", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var post = new Parse.Object("Post",{id:request.params.post});

  const queryNotif = new Parse.Query("Notif");
  queryNotif.equalTo("post", post);
  queryNotif.hint("post");
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedPostNotif", {"post":request.params.post},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedPostReport", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var post = new Parse.Object("Post",{id:request.params.post});

  const queryNotif = new Parse.Query("Report");
  queryNotif.equalTo("post", post);
  queryNotif.select("objectId");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedPostReport", {"post":request.params.post},{useMasterKey:true});
  }


});

Parse.Cloud.define("removeDeletedPostLike", async (request) => {
  if(!request.master){
    throw "denied";
  }

  var post = new Parse.Object("Post",{id:request.params.post});

  const queryNotif = new Parse.Query("Like");
  queryNotif.equalTo("post", post);
  //queryNotif.descending("createdAt");
  queryNotif.select("objectId");
  queryNotif.hint("post");
  queryNotif.limit(1000);
  const results = await queryNotif.find({useMasterKey:true});

  var i = 0;

  for(i = 0;i < results.length;i++){
    try{
      await results[i].destroy({useMasterKey:true});
    }catch(err){}

  }
  if(results.length===1000){
    Parse.Cloud.run("removeDeletedPostLike", {"post":request.params.post},{useMasterKey:true});
  }


});

Parse.Cloud.define("switchAccountType", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const type = request.params.type;
  
  const user = request.user;
  await user.fetch({useMasterKey:true});
  
  if(user.get("accounttype")===type){
    return {"user":user};
  }
    
  user.set("accounttype",type);
  user.set("reviewed",false);
  if(type === 2){
    user.set("private",false);
    user.set("switchdate",new Date());
  }
  return {"user":await user.save(null,{useMasterKey:true})};
  
});

Parse.Cloud.define("acceptAllFollowRequestsAfterProfileBecomePublic", async (request) => {
  if(!request.master){
    throw "denied";
  }

  const user = new Parse.User({id:request.params.user});

  const queryBlock = new Parse.Query("FollowRequest");
  queryBlock.equalTo("who", user);
  queryBlock.limit(1000);
  queryBlock.hint("who_createdAt");
  queryBlock.descending("createdAt");
  if(request.params.date!==undefined){
    queryBlock.lessThan("createdAt",request.params.date);
  }
  queryBlock.select("owner","objectId","createdAt");
  const resultCount = await queryBlock.find({useMasterKey:true});
    var count = 0;
    for(count = 0; count < resultCount.length; count++) {

        var xLike = resultCount[count];
        const otherUser = new Parse.User({id:xLike.get("owner").id});
        const follow = new Follow();
        follow.set("owner",otherUser);
        follow.set("own","true");
        follow.set("who",user);
        follow.set("cid",otherUser.id+user.id);
        try{
          await follow.save(null,{useMasterKey:true});
          await xLike.destroy({useMasterKey:true})
        }catch(err){
          try{
            await follow.save(null,{useMasterKey:true});
            await xLike.destroy({useMasterKey:true})
          }catch(err){

          }
        }



    }
    if(resultCount.length===1000){
      Parse.Cloud.run("acceptAllFollowRequestsAfterProfileBecomePublic", {"user":request.params.user,"date":resultCount[resultCount.length-1].get("createdAt")},{useMasterKey:true});
    }

});

Parse.Cloud.define("makePostsContentCreator", async (request) => {
  if(!request.master){
    throw "denied";
  }

  const user = new Parse.User({id:request.params.user});

  const queryBlock = new Parse.Query("Post");
  queryBlock.equalTo("user", user);
  queryBlock.descending("createdAt");
  if(request.params.date!==undefined){
    queryBlock.lessThan("createdAt",request.params.date);
  }
  queryBlock.limit(1000);
  queryBlock.hint("user_createdAt");
  queryBlock.select("objectId","createdAt");
  const resultCount = await queryBlock.find({useMasterKey:true});
    var count = 0;
    for(count = 0; count < resultCount.length; count++) {

        var xLike = resultCount[count];
        xLike.set("accounttype",2);
        try{
          await xLike.save(null,{useMasterKey:true});
        }catch(err){

        }


    }
    if(resultCount.length===1000){
      Parse.Cloud.run("makePostsContentCreator", {"user":request.params.user,"date":resultCount[resultCount.length-1].get("createdAt")},{useMasterKey:true});
    }

});

Parse.Cloud.define("makePostsPersonal", async (request) => {
  if(!request.master){
    throw "denied";
  }

  const user = new Parse.User({id:request.params.user});

  const queryBlock = new Parse.Query("Post");
  queryBlock.equalTo("user", user);
  queryBlock.limit(1000);
  if(request.params.date!==undefined){
    queryBlock.lessThan("createdAt",request.params.date);
  }
  queryBlock.hint("user_createdAt");
  queryBlock.descending("createdAt");
  queryBlock.select("objectId","createdAt");
  const resultCount = await queryBlock.find({useMasterKey:true});
    var count = 0;
    for(count = 0; count < resultCount.length; count++) {

        var xLike = resultCount[count];
        xLike.set("accounttype",1);
        try{
          await xLike.save(null,{useMasterKey:true});
        }catch(err){

        }


    }
    if(resultCount.length===1000){
      Parse.Cloud.run("makePostsPersonal", {"user":request.params.user,"date":resultCount[resultCount.length-1].get("createdAt")},{useMasterKey:true});
    }
});

Parse.Cloud.define("makePostsPublic", async (request) => {
  if(!request.master){
    throw "denied";
  }

  const user = new Parse.User({id:request.params.user});

  const queryBlock = new Parse.Query("Post");
  queryBlock.limit(1000);
  queryBlock.equalTo("user", user);
  queryBlock.descending("createdAt");
  queryBlock.hint("user_createdAt");
  if(request.params.date!==undefined){
    queryBlock.lessThan("createdAt",request.params.date);
  }
  queryBlock.select("objectId","createdAt");
  const resultCount = await queryBlock.find({useMasterKey:true});
    var count = 0;
    for(count = 0; count < resultCount.length; count++) {

        var xLike = resultCount[count];
        xLike.set("private",false);
        try{
          await xLike.save(null,{useMasterKey:true});
        }catch(err){

        }


    }
    if(resultCount.length===1000){
      Parse.Cloud.run("makePostsPublic", {"user":request.params.user,"date":resultCount[resultCount.length-1].get("createdAt")},{useMasterKey:true});
    }

});

Parse.Cloud.define("makePostsPrivate", async (request) => {
  if(!request.master){
    throw "denied";
  }

  const user = new Parse.User({id:request.params.user});

  const queryBlock = new Parse.Query("Post");
  queryBlock.equalTo("user", user);
  queryBlock.select("objectId","createdAt");
  queryBlock.descending("createdAt");
  if(request.params.date!==undefined){
    queryBlock.lessThan("createdAt",request.params.date);
  }
  queryBlock.hint("user_createdAt");
  queryBlock.limit(1000);
  const resultCount = await queryBlock.find({useMasterKey:true});
    var count = 0;
    for(count = 0; count < resultCount.length; count++) {

        var xLike = resultCount[count];
        xLike.set("private",true);
        try{
          await xLike.save(null,{useMasterKey:true});
        }catch(err){

        }


    }
    if(resultCount.length===1000){
      Parse.Cloud.run("makePostsPrivate", {"user":request.params.user,"date":resultCount[resultCount.length-1].get("createdAt")},{useMasterKey:true});
    }

});

Parse.Cloud.define("getNotifs", async (request) => {
  if(request.user===undefined){
    throw "";
  }


  const getNotif = new Parse.Query("Notif");
  getNotif.equalTo("to",request.user);
  getNotif.limit(50);
  getNotif.hint("to_createdAt");
  if(request.params.date!==undefined){
    getNotif.lessThan("createdAt",request.params.date);
  }
  getNotif.descending("createdAt");
  getNotif.include("owner")





  const results = await getNotif.find({useMasterKey:true});

  if(results.length<1){
    return {"notifs":results,"hasmore":false,"date":new Date()};
  }
  var fL = results.map(post => ({
    ...post.toJSON(),
    postid: post.get("post") ? post.get("post").id : "",
    commentid: post.get("comment") ? post.get("comment").id : "",
    __type:"Object",
    className:"Notif"
  }));

  return {"notifs":fL,"hasmore":results.length >= 50,"date":results[results.length-1].get("createdAt")};

});


Parse.Cloud.define("clearFiles", async (request) => {





  const getFiles = new Parse.Query("File");

  var extraTime = 1000*60*15; //1 hours
  var currentDate = new Date();

  var pushDate = new Date(currentDate.getTime() - extraTime);
  getFiles.limit(1000);
  getFiles.lessThan("createdAt",pushDate); //push date is 15 hours later than now
  const results = await getFiles.find({useMasterKey:true});

  const asdf = results.length;

  var count;
  for(count = 0; count < asdf; count++) {
    var xLike = results[count];
    const file = xLike.get("file");

    if(file){
      try{
        await file.destroy({ useMasterKey: true });
      }catch(error){
        try{
          await file.destroy({ useMasterKey: true });
        }catch(error){
          
        }
      }
    }
  }

  if(asdf===1000){
    Parse.Cloud.run('clearFiles');
  }


});

Parse.Cloud.define("getNotifObjects", async (request) => {

  const user = request.user;

  if(user===undefined){
    throw "denied";
  }

  if(request.params.id===undefined){
    throw "denied";
  }

  const comment = await Parse.Cloud.run('updateComment',{"id":request.params.id}, {sessionToken: user.getSessionToken() });
  const post = await Parse.Cloud.run('updatePost',{"id":comment.get("post").id}, {sessionToken: user.getSessionToken() });

  if(comment.get("isreply")==="true"){
    const parentComment = await Parse.Cloud.run('updateComment',{"id":comment.get("parent").id}, {sessionToken: user.getSessionToken() });
    return {"post":post,"parentcomment":parentComment,"comment":comment};
  }
  else{
    return {"post":post,"parentcomment":comment};
  }

});

Parse.Cloud.define("updatePost", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  if(request.params.id===undefined){
    throw "denied";
  }

  const getPost = new Parse.Query("Post");
  getPost.include("user");
  getPost.exclude("words");
  const post = await getPost.get(request.params.id,{useMasterKey:true});

  if(post.get("user").id!==user.id){
    const otherUser = new Parse.User({id:post.get("user").id});
    await otherUser.fetch({useMasterKey:true});


      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }
      if(otherUser.get("private")===true){

        const queryBlock12 = new Parse.Query("Follow");
        queryBlock12.equalTo("who", otherUser);
        queryBlock12.equalTo("owner", user);
        queryBlock12.limit(1);
        const resultCount12 = await queryBlock12.count({useMasterKey:true});
        if(resultCount12<1){
          throw "denied";
        }
      }



  }

  const postList = [];
  postList.push(post);

  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.equalTo("post",post);
  getLikes.hint("owner_post");
  getLikes.limit(1);

  const likeList = await getLikes.find({useMasterKey:true});



  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("cid", user.id+post.id);
  //getSaves.equalTo("post",post);
  getSaves.limit(1);

  const saveList = await getSaves.find({useMasterKey:true});



  const tpL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeList.length>0,
    saved2: saveList.length>0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));


  return tpL[0];

});

Parse.Cloud.define("updateComment", async (request) => {
  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  if(request.params.id===undefined){
    throw "denied";
  }


  const getComment = new Parse.Query("Comment");
  getComment.include("user");
  const comment = await getComment.get(request.params.id,{useMasterKey:true});
  const otherUser = new Parse.User({id:comment.get("user").id});

  if(otherUser.id!==user.id){

    const queryBlock = new Parse.Query("Block");
    queryBlock.equalTo("who", user);
    queryBlock.equalTo("owner", otherUser);
    queryBlock.limit(1);
    const resultCount = await queryBlock.count({useMasterKey:true});
    if(resultCount>0){
      throw "Denied";
    }

  }

  
  

  const otherUserPost = new Parse.User({id:comment.get("puser").id});
  

  if(user.id!==otherUserPost.id){
    await otherUserPost.fetch({useMasterKey:true});
    if(otherUserPost.get("private")===true){

      const queryBlock12 = new Parse.Query("Follow");
      queryBlock12.equalTo("who", otherUserPost);
      queryBlock12.equalTo("owner", user);
      queryBlock12.limit(1);
      const resultCount12 = await queryBlock12.count({useMasterKey:true});
      if(resultCount12<1){
        throw "denied";
      }
    }


    const queryBlock11 = new Parse.Query("Block");
    queryBlock11.equalTo("who", user);
    queryBlock11.equalTo("owner", otherUserPost);
    queryBlock11.limit(1);
    const resultCount11 = await queryBlock11.count({useMasterKey:true});
    if(resultCount11>0){
      throw "Denied";
    }
  }

  if(comment.get("isreply")==="true"){

    const otherUserParent = new Parse.User({id:comment.get("cuser").id});

    if(otherUserParent.id!==user.id){
      const queryBlock1 = new Parse.Query("Block");
      queryBlock1.equalTo("who", user);
      queryBlock1.equalTo("owner", otherUserParent);
      queryBlock1.limit(1);
      const resultCount1 = await queryBlock1.count({useMasterKey:true});
      if(resultCount1>0){
        throw "Denied";
      }
    }

  }




  const commentList = [];
  commentList.push(comment);

  const getVotes = new Parse.Query("CommentVote");
  getVotes.equalTo("owner",user);
  getVotes.equalTo("comment",comment);
  getVotes.limit(1);

  const voteList = await getVotes.find({useMasterKey:true});

  var upvoteListIDs = [];
  var downvoteListIDs = [];

  var i;
  for(i=0;i<voteList.length;i++){
    if(voteList[i].get("vote")>0){
      upvoteListIDs.push(voteList[i].get("comment").id);
    }
    else{
      downvoteListIDs.push(voteList[i].get("comment").id);
    }
  }



  const getSaves = new Parse.Query("SavedComment");
  getSaves.equalTo("cid",user.id+comment.id);
  //getSaves.equalTo("comment",comment);
  getSaves.limit(1);

  const saveList = await getSaves.find({useMasterKey:true});





  const tpL = commentList.map(comment => ({
    ...comment.toJSON(),
    upvote2: upvoteListIDs.length>0,
    downvote2: downvoteListIDs.length>0,
    saved2: saveList.length>0,
    vote2:comment.get("vote"),
    replycount2:comment.get("replycount"),
    __type:"Object",
    className:"Comment"
  }));




  return tpL[0];




});

Parse.Cloud.define("getFollowers", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const requestUser = request.user;

  const user = new Parse.User({id:request.params.id});


  if(user.id!==requestUser.id){
    const queryBlock = new Parse.Query("Block");
    queryBlock.equalTo("who", requestUser);
    queryBlock.equalTo("owner", user);
    queryBlock.limit(1);
    const coubt = await queryBlock.count({useMasterKey:true});
    if(coubt>0){
      throw "Denied";
    }

    await user.fetch({useMasterKey:true});

    if(user.get("private")===true){
      const queryBlock12 = new Parse.Query("Follow");
      queryBlock12.equalTo("who", user);
      queryBlock12.equalTo("owner", requestUser);
      queryBlock12.limit(1);
      const resultCount12 = await queryBlock12.count({useMasterKey:true});
      if(resultCount12<1){
        throw "denied";
      }
    }
  }

  const getBlock221 = new Parse.Query("Block");
  getBlock221.equalTo("who",requestUser);
  getBlock221.select("owner");
  getBlock221.descending("createdAt");
  getBlock221.limit(1000);

  const bList = await getBlock221.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("owner"));
  }



  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("who",user);
  getFollow.notContainedIn("owner",bloList);
  if(request.params.date!==undefined){
    getFollow.lessThan("createdAt",request.params.date);
  }
  getFollow.include("owner");
  getFollow.descending("createdAt");
  getFollow.limit(20);

  const followList = await getFollow.find({useMasterKey:true});
  if(followList.length<1){
    return {"followers":[],"hasmore":false,"date":new Date()};
  }
  var newList = [];

  var i = 0;
  for(i = 0;i<followList.length;i++){
    newList.push(followList[i].get("owner"));
  }


  const getFollowRequest = new Parse.Query("FollowRequest");
  getFollowRequest.equalTo("owner",requestUser);
  getFollowRequest.containedIn("who",newList);
  getFollowRequest.hint("owner_who");

  const followRequestList = await getFollowRequest.find({useMasterKey:true});

  var followRequestListIDs = [];

  var i;
  for(i=0;i<followRequestList.length;i++){
    followRequestListIDs.push(followRequestList[i].get("who").id);
  }

  const getFollow1 = new Parse.Query("Follow");
  getFollow1.equalTo("owner",requestUser);
  getFollow1.containedIn("who",newList);

  const followList1 = await getFollow1.find({useMasterKey:true});

  var followListIDs = [];

  var i;
  for(i=0;i<followList1.length;i++){
    followListIDs.push(followList1[i].get("who").id);
  }


  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("owner",requestUser);
  getBlock.containedIn("who",newList);

  const blockList = await getBlock.find({useMasterKey:true});

  var blockListIDs = [];

  var i;
  for(i=0;i<blockList.length;i++){
    blockListIDs.push(blockList[i].get("who").id);
  }



  var fL = newList.map(user => ({
    ...user.toJSON(),

    follow2:followListIDs.indexOf(user.id) >= 0,
    followrequest2:followRequestListIDs.indexOf(user.id) >= 0,
    block2:blockListIDs.indexOf(user.id) >= 0,
    __type:"Object",
    className:"_User"

  }));

  return {"followers":fL,"hasmore":followList.length>=20,"date":followList[followList.length-1].get("createdAt")};



});

Parse.Cloud.define("getFollowings", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const requestUser = request.user;

  const user = new Parse.User({id:request.params.id});

 

  if(user.id!==requestUser.id){
    const queryBlock = new Parse.Query("Block");
    queryBlock.equalTo("who", requestUser);
    queryBlock.equalTo("owner", user);
    queryBlock.limit(1);
    const coubt = await queryBlock.count({useMasterKey:true});
    if(coubt>0){
      throw "Denied";
    }

    await user.fetch({useMasterKey:true});

    if(user.get("private")===true){
      const queryBlock12 = new Parse.Query("Follow");
      queryBlock12.equalTo("who", user);
      queryBlock12.equalTo("owner", requestUser);
      queryBlock12.limit(1);
      const resultCount12 = await queryBlock12.count({useMasterKey:true});
      if(resultCount12<1){
        throw "denied";
      }
    }
  }

  const getBlock221 = new Parse.Query("Block");
  getBlock221.equalTo("who",requestUser);
  getBlock221.select("owner");
  getBlock221.descending("createdAt");
  getBlock221.limit(1000);

  const bList = await getBlock221.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("owner"));
  }




  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.notContainedIn("who",bloList);

  if(request.params.date!==undefined){
    getFollow.lessThan("createdAt",request.params.date);
  }
  getFollow.include("who");
  getFollow.descending("createdAt");
  getFollow.limit(20);

  const followList = await getFollow.find({useMasterKey:true});
  if(followList.length<1){
    return {"followings":[],"hasmore":false,"date":new Date()};
  }
  var newList = [];

  var i = 0;
  for(i = 0;i<followList.length;i++){
    newList.push(followList[i].get("who"));
  }

  if(requestUser.id===user.id){
    var fL = newList.map(user => ({
      ...user.toJSON(),
      follow2:true,
      __type:"Object",
      className:"_User"

    }));
    return {"followings":fL,"hasmore":followList.length>=20,"date":followList[followList.length-1].get("createdAt")};


  }
  else{

    const getFollowRequest = new Parse.Query("FollowRequest");
    getFollowRequest.equalTo("owner",requestUser);
    getFollowRequest.containedIn("who",newList);
    getFollowRequest.hint("owner_who");

    const followRequestList = await getFollowRequest.find({useMasterKey:true});

    var followRequestListIDs = [];

    var i;
    for(i=0;i<followRequestList.length;i++){
      followRequestListIDs.push(followRequestList[i].get("who").id);
    }

    const getFollow1 = new Parse.Query("Follow");
    getFollow1.equalTo("owner",requestUser);
    getFollow1.containedIn("who",newList);

    const followList1 = await getFollow1.find({useMasterKey:true});

    var followListIDs = [];

    var i;
    for(i=0;i<followList1.length;i++){
      followListIDs.push(followList1[i].get("who").id);
    }




    const getBlock = new Parse.Query("Block");
    getBlock.equalTo("owner",requestUser);
    getBlock.containedIn("who",newList);

    const blockList = await getBlock.find({useMasterKey:true});

    var blockListIDs = [];

    var i;
    for(i=0;i<blockList.length;i++){
      blockListIDs.push(blockList[i].get("who").id);
    }



    var fL = newList.map(user => ({
      ...user.toJSON(),

      follow2:followListIDs.indexOf(user.id) >= 0,
      followrequest2:followRequestListIDs.indexOf(user.id) >= 0,
      block2:blockListIDs.indexOf(user.id) >= 0,
      __type:"Object",
      className:"_User"

    }));
    return {"followings":fL,"hasmore":followList.length>=20,"date":followList[followList.length-1].get("createdAt")};


  }




});

Parse.Cloud.define("search", async (request) => {
  const user = request.user;

  var text = request.params.text;

  const userList = await Parse.Cloud.run('searchPerson',{"text":text}, {sessionToken: user.getSessionToken() });
  console.log(userList);

  const postList = await Parse.Cloud.run('searchPost',{"text":text}, {sessionToken: user.getSessionToken() });

  return [userList,postList];


});


Parse.Cloud.define("searchPost", async (request) => {
  const user = request.user;

  var text = request.params.text;
  if(text===undefined){
    return {"posts":[],"hasmore":false,"date":new Date()};
  }
  if(text.length===0){
    return {"posts":[],"hasmore":false,"date":new Date()};
  }



  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("owner",user);
  getBlock.select("who");
  getBlock.descending("createdAt");
  getBlock.limit(1000);

  const bList = await getBlock.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("who"));
  }



  const getBlock2 = new Parse.Query("Block");
  getBlock2.equalTo("who",user);
  getBlock2.select("owner");
  getBlock2.descending("createdAt");
  getBlock2.limit(1000);

  const bList2 = await getBlock2.find({useMasterKey:true});

  for(i = 0;i<bList2.length;i++){
    bloList.push(bList2[i].get("owner"));
  }

  const getPosts = new Parse.Query("Post");

  const text2 = text.replace(/[.,\/#!$%\^&\*;:{}?=\-_`~()]/g,"");
  const text3 = text2.toLowerCase();
  const text4 = text3.replace(/\s{2,}/g," ");
  const wordArray = text4.split(" ");
  getPosts.equalTo("private",false);
  getPosts.notContainedIn("user",bloList);
  getPosts.include("user");
  getPosts.hint("private_words_createdAt");
  getPosts.exclude("words");

  getPosts.containsAll("words",wordArray);

  if(request.params.date!==undefined){
    getPosts.lessThan("createdAt",request.params.date);
  }
  getPosts.descending("createdAt");
  getPosts.limit(10);

  const postList = await getPosts.find({useMasterKey:true});
  if(postList.length<1){
    return {"posts":[],"hasmore":false,"date":new Date()};
  }

  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.containedIn("post",postList);
  getLikes.hint("owner_post");

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }


  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("post",postList);
  getSaves.hint("owner_post");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }





  var fL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":postList.length>=10,"date":postList[postList.length-1].get("createdAt")};


});

Parse.Cloud.define("searchPerson", async (request) => {
  const user = request.user;

  var text = request.params.text;
  if(text===undefined){
    return {"users":[],"hasmore":false,"date":new Date()};
  }
  if(text.length===0){
    return {"users":[],"hasmore":false,"date":new Date()};
  }

  if(text === "lşokghkjlokjglhokghlojkghlopj"){
    const getPosts = new Parse.Query("_User");
    //getPosts.notContainedIn("objectId",bloList);
    //getPosts.containedIn("objectId",folList);
    //getPosts.startsWith("username",text);
    getPosts.descending("createdAt");
    getPosts.limit(50);
    const postList = await getPosts.find({useMasterKey:true});
    return {"users":postList,"hasmore":false,"date":new Date()};
  }

  text = text.toLowerCase();
  text = text.replace(" ","");
  text = text.replace(" ","");
  text = text.replace(" ","");
  text = text.replace(" ","");
  text = text.replace(" ","");
  




  var newList = [];



  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("who",user);
  getBlock.select("owner");
  getBlock.descending("createdAt");
  getBlock.limit(1000);

  const bList = await getBlock.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("owner").id);
  }
  bloList.push(user.id);

  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.select("who");
  getFollow.descending("createdAt");
  getFollow.limit(1000);

  const fList = await getFollow.find({useMasterKey:true});

  var folList = [];
  var i = 0;
  for(i = 0;i<fList.length;i++){
    folList.push(fList[i].get("who").id);
  }



  const getPosts = new Parse.Query("_User");
  getPosts.notContainedIn("objectId",bloList);
  getPosts.containedIn("objectId",folList);
  getPosts.startsWith("username",text);
  //getPosts.hint('userındex102');
  getPosts.limit(5);

  const postList = await getPosts.find({useMasterKey:true});



  var i = 0;
  for(i = 0;i<postList.length;i++){
    newList.push(postList[i]);
    bloList.push(postList[i].id);
  }

  const getPosts2 = new Parse.Query("_User");
  getPosts2.notContainedIn("objectId",bloList);
  getPosts2.containedIn("objectId",folList);
  getPosts2.startsWith("namesearch",text);
  //getPosts2.hint('userındex102');
  getPosts2.limit(10-newList.length);

  const postList2 = await getPosts2.find({useMasterKey:true});



  var i = 0;
  for(i = 0;i<postList2.length;i++){
    newList.push(postList2[i]);
    bloList.push(postList2[i].id);
  }



  const getPosts3 = new Parse.Query("_User");
  getPosts3.notContainedIn("objectId",bloList);
  getPosts3.startsWith("username",text);
  getPosts3.limit(15-newList.length);

  const postList3 = await getPosts3.find({useMasterKey:true});



  var i = 0;
  for(i = 0;i<postList3.length;i++){
    newList.push(postList3[i]);
    bloList.push(postList3[i].id);
  }

  const getPosts4 = new Parse.Query("_User");
  getPosts4.notContainedIn("objectId",bloList);
  getPosts4.startsWith("namesearch",text);
  getPosts4.limit(20-newList.length);

  const postList4 = await getPosts4.find({useMasterKey:true});



  var i = 0;
  for(i = 0;i<postList4.length;i++){
    newList.push(postList4[i]);
  }






  var fL = newList.map(post => ({
    ...post.toJSON(),
    searchText: text,
    __type:"Object",
    className:"_User"
  }));
  return {"users":fL};

});

Parse.Cloud.define("checkUsername", async (request) => {
  const username = request.params.username;

  if(!username){
    throw "denied";
  }

  if(username.length>25){
    throw "usernamemustbeshorterthan25";
  }
  if(username!==username.toLowerCase()){
    throw "usernamecantcontainuppercase";
  }
  if(!isNaN(username)){
    throw "usernamemustcontainletter";
  }

  if(username.match(/^[a-z0-9\_\.]+/i)){
    const query = new Parse.Query("_User");
    query.equalTo("username",username);
    query.limit(1);
    const count = await query.count({useMasterKey:true});
    if(count>0){
      throw "taken";
    }
    else{
      return "canTake";
    }
  }
  else{
    throw "usernameMustBeAlphaNumeric"
  }


});

Parse.Cloud.define("updateUsername", async (request) => {

  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  const username = request.params.username;

  if(!username){
    throw "denied";
  }

  if(username.length>25){
    throw "usernamemustbeshorterthan25";
  }
  if(username!==username.toLowerCase()){
    throw "usernamecantcontainuppercase";
  }
  if(!isNaN(username)){
    throw "usernamemustcontainletter";
  }

  if(username.match(/^[a-z0-9]+$/i)){
    user.set("username",username);
    return {"user":await user.save(null,{useMasterKey:true})};
  }
  else{
    throw "usernameMustBeAlphaNumeric"
  }


});

Parse.Cloud.define("getSavedComments", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;



  const queryFreq = new Parse.Query("SavedComment");
  queryFreq.equalTo("owner",user);
  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.hint("owner_createdAt");
  queryFreq.include("comment.user");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);


  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"comments":resultCount,"hasmore":false,"date":new Date()};
  }

  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("comment"));
  }

  const getVotes = new Parse.Query("CommentVote");
  getVotes.equalTo("owner",user);
  getVotes.containedIn("comment",newList);

  const voteList = await getVotes.find({useMasterKey:true});

  var upvoteListIDs = [];
  var downvoteListIDs = [];

  var i;
  for(i=0;i<voteList.length;i++){
    if(voteList[i].get("vote")>0){
      upvoteListIDs.push(voteList[i].get("comment").id);
    }
    else{
      downvoteListIDs.push(voteList[i].get("comment").id);
    }
  }







  var fL = newList.map(comment => ({
    ...comment.toJSON(),
    upvote2: upvoteListIDs.indexOf(comment.id) >= 0,
    downvote2: downvoteListIDs.indexOf(comment.id) >= 0,
    saved2: true,
    vote2:comment.get("vote"),
    replycount2:comment.get("replycount"),
    date:resultCount[resultCount.length-1].get("createdAt"),
    __type:"Object",
    className:"Comment"

  }));

  return {"comments":fL,"hasmore":resultCount>=10,"date":resultCount[resultCount.length-1].get("createdAt")};


});

Parse.Cloud.define("getSavedPosts", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("SavedPost");
  queryFreq.equalTo("owner", user);

  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.hint("owner_createdAt");
  queryFreq.include("post.user");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"posts":[],"hasmore":false,"date":new Date()};
  }
  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("post"));
  }

  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.containedIn("post",newList);
  getLikes.hint("owner_post");

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }



  var fL = newList.map(post => ({
    ...post.toJSON(),
    saved2: true,
    liked2: likeListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":resultCount.length>=10,"date":resultCount[resultCount.length-1].get("createdAt")};



});

Parse.Cloud.define("getOwnComments", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("Comment");
  queryFreq.equalTo("user", user);


  queryFreq.include("user");
  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"comments":[],"hasmore":false,"date":new Date()};

  }

  const getVotes = new Parse.Query("CommentVote");
  getVotes.equalTo("owner",user);
  getVotes.containedIn("comment",resultCount);

  const voteList = await getVotes.find({useMasterKey:true});

  var upvoteListIDs = [];
  var downvoteListIDs = [];

  var i;
  for(i=0;i<voteList.length;i++){
    if(voteList[i].get("vote")>0){
      upvoteListIDs.push(voteList[i].get("comment").id);
    }
    else{
      downvoteListIDs.push(voteList[i].get("comment").id);
    }
  }


  const getSaves = new Parse.Query("SavedComment");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("comment",resultCount);
  getSaves.hint("owner_comment");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("comment").id);
  }



  var fL = resultCount.map(comment => ({
    ...comment.toJSON(),
    upvote2: upvoteListIDs.indexOf(comment.id) >= 0,
    downvote2: downvoteListIDs.indexOf(comment.id) >= 0,
    saved2: saveListIDs.indexOf(comment.id) >= 0,
    vote2:comment.get("vote"),
    replycount2:comment.get("replycount"),
    __type:"Object",
    className:"Comment"
  }));

  return {"comments":fL,"hasmore":resultCount>=10,"date":resultCount[resultCount.length-1].get("createdAt")};



});

Parse.Cloud.define("getPostYouHaveLiked", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("Like");
  queryFreq.equalTo("owner", user);

  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.include("post.user");
  queryFreq.hint("owner_createdAt");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"posts":[],"hasmore":false,"date":new Date()};

  }
  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("post"));
  }

  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("post",newList);
  getSaves.hint("owner_post");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }



  var fL = newList.map(post => ({
    ...post.toJSON(),
    liked2: true,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":resultCount.length>=10,"date":resultCount[resultCount.length-1].get("createdAt")};


});

Parse.Cloud.define("getPendingFollowRequests", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("FollowRequest");
  queryFreq.equalTo("owner", user);

  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.hint("owner_createdAt");
  queryFreq.include("who");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"result":resultCount,"hasmore":false,"date":new Date()};
  }
  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("who"));
  }





  var fL = newList.map(user => ({
    ...user.toJSON(),
    followrequest2: true,
    __type:"Object",
    className:"_User"
  }));
  return {"result":fL,"hasmore":resultCount.length>=10,"date":resultCount[resultCount.length-1].get("createdAt")};


});

Parse.Cloud.define("getBlockedAccounts", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("Block");
  queryFreq.equalTo("owner", user);

  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.include("who");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"result":[],"hasmore":false,"date":new Date()};
  }

  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("who"));
  }



  var fL = newList.map(user => ({
    ...user.toJSON(),
    block2: true,
    __type:"Object",
    className:"_User"

  }));

  return {"result":fL,"hasmore":resultCount.length>=10,"date":resultCount[resultCount.length-1].get("createdAt")};




});

Parse.Cloud.define("getToMeFollowReqs", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;


  const queryFreq = new Parse.Query("FollowRequest");
  queryFreq.equalTo("who", user);

  if(request.params.date!==undefined){
    queryFreq.lessThan("createdAt",request.params.date);
  }
  queryFreq.hint("who_createdAt");
  queryFreq.include("owner");
  queryFreq.descending("createdAt");
  queryFreq.limit(10);
  const resultCount = await queryFreq.find({useMasterKey:true});
  if(resultCount.length<1){
    return {"result":[],"hasmore":false,"date":new Date()};
  }
  var newList = [];

  var i = 0;
  for(i = 0;i<resultCount.length;i++){
    newList.push(resultCount[i].get("owner"));
  }

  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.containedIn("who",newList);

  const followList = await getFollow.find({useMasterKey:true});

  var followListIDs = [];

  var i;
  for(i=0;i<followList.length;i++){
    followListIDs.push(followList[i].get("who").id);
  }

  const getFollowRequest = new Parse.Query("FollowRequest");
  getFollowRequest.equalTo("owner",user);
  getFollowRequest.containedIn("who",newList);
  getFollowRequest.hint("owner_who");

  const followRequestList = await getFollowRequest.find({useMasterKey:true});

  var followRequestListIDs = [];

  var i;
  for(i=0;i<followRequestList.length;i++){
    followRequestListIDs.push(followRequestList[i].get("who").id);
  }



  var fL = newList.map(user => ({
    ...user.toJSON(),
    tomefollowrequest2: true,
    follow2:followListIDs.indexOf(user.id) >= 0,
    followrequest2:followRequestListIDs.indexOf(user.id) >= 0,
    __type:"Object",
    className:"_User"

  }));

  return {"result":fL,"hasmore":resultCount.length>=10,"date":resultCount[resultCount.length-1].get("createdAt")};


});

Parse.Cloud.define("rejectFollowRequest", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  if(request.params.id===undefined){
    throw "";
  }
  const otherUser = new Parse.User({id:request.params.id});


  const query = new Parse.Query("FollowRequest");
  query.equalTo("owner",otherUser);
  query.equalTo("who",request.user);
  query.hint("owner_who");
  const results = await query.find({useMasterKey:true});

  var i=0;
  for(i=0;i<results.length;i++){
    var folreq = results[i];
    await folreq.destroy({useMasterKey:true});
  }




});

Parse.Cloud.define("acceptFollowRequest", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  if(request.params.id===undefined){
    throw "";
  }
  const otherUser = new Parse.User({id:request.params.id});


  const query = new Parse.Query("FollowRequest");
  query.equalTo("owner",otherUser);
  query.equalTo("who",request.user);
  query.hint("owner_who");
  const results = await query.find({useMasterKey:true});

  var i=0;
  for(i=0;i<results.length;i++){
    if(i==0){
      const follow = new Follow();
      follow.set("owner",otherUser);
      follow.set("own","true");
      follow.set("who",request.user);
      follow.set("cid",otherUser.id+request.user.id);
      try{
        await follow.save(null,{useMasterKey:true});
      }catch(err){}

    }
    var folreq = results[i];
    try{
      await folreq.destroy({useMasterKey:true});
    }catch(err){}

  }




});

Parse.Cloud.define("makeProfilePrivate", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  if(request.user.get("accounttype")!==2){
    request.user.set("private",true);
    return {"user":await request.user.save(null,{useMasterKey:true})};
  }
  else{
    throw "denied";
  }
  

});

Parse.Cloud.define("makeProfileUnprivate", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  request.user.set("private",false);
  return {"user":await request.user.save(null,{useMasterKey:true})};


});

Parse.Cloud.define("notifReset", async (request) => {
  if(request.user===undefined){
    throw "";
  }
  const user = request.user;
  user.set("notifcount",0);
  await user.save(null,{useMasterKey:true});

});

Parse.Cloud.define("updateOwnProfile", async (request) => {

  var user = request.user;


  var name = request.params.name;
  if(name!==undefined){
    name = name.trim().replace('\n', ' ');
    name = name.replace(/\s\s+/g, ' ');
    name = name.substring(0,25);

    user.set("namesurname",name);
    var searchname = name;
    searchname = searchname.toLowerCase();
    searchname = searchname.replace(" ","");
    user.set("namesearch",searchname);


  }

  if(name===undefined){
    throw "deniedMustName";
  }


  var bio = request.params.bio;
  if(bio!==undefined){
    //bio = bio.replace(/\s\s+/g, ' ');
    bio = bio.trim().replace(/\n{2,}/g, '\n\n');
    bio = bio.substring(0,250);
    user.set("biography",bio);

  }

  const pp = request.params.pp;
  const ppRemove = request.params.ppremove;

  if(ppRemove===true){
    user.set("haspp",false);
  }
  else{
    if(pp){

      const media = request.params.pp;

      if(!media.name().substr(0, media.name().lastIndexOf(".")).endsWith(request.user.id)){
        throw "denied";
      }
      const ppdata = await media.getData();

      const tempImg = Buffer.from(ppdata, 'base64');
      const mimeInfo = await fileType.fromBuffer(tempImg);
      console.log(mimeInfo);
      if(mimeInfo.mime.startsWith("image")){
        let options = { percentage: 15, responseType: 'base64' };
        const thumbnail = await imageThumbnail(tempImg, options);
        user.set("profilephotoprofile",new Parse.File("image_ppprofile.jpg", { base64: ppdata },mimeInfo.mime));
        user.set("profilephotoadapter",new Parse.File("thumbnail_ppadapter.jpg", { base64: thumbnail },mimeInfo.mime));
        user.set("haspp",true);
      }
      else{
        user.set("haspp",false);
      }
    }
  }

  return {"user":await user.save(null,{useMasterKey:true})};


});

Parse.Cloud.define("getOwnPosts", async (request) => {

  const user = request.user;


  const getPosts = new Parse.Query("Post");
  getPosts.equalTo("user",user);
  if(request.params.date!==undefined){
    getPosts.lessThan("createdAt",request.params.date);
  }
  getPosts.descending("createdAt");
  getPosts.hint("user_createdAt");
  getPosts.limit(39);
  getPosts.exclude("words");

  const postList = await getPosts.find({useMasterKey:true});
  if(postList.length<1){
    return {"posts":postList,"hasmore":false,"date":new Date()};
  }


  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.containedIn("post",postList);
  getLikes.hint("owner_post");

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }

  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("post",postList);
  getSaves.hint("owner_post");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }

  var fL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));

  return {"posts":fL,"hasmore":postList.length>=39,"date":postList[postList.length-1].get("createdAt")};


});

Parse.Cloud.define("getComments", async (request) => {

  const post = new Parse.Object('Post', { id: request.params.post });
  const user = request.user;


  await post.fetch({useMasterKey:true});

  if(post.get("commentable")!==true){
    throw "denied";
  }

  const otherUser = new Parse.User({id:post.get("user").id});
  await otherUser.fetch({useMasterKey:true});

  if(user.id!==otherUser.id){

    const queryBlock = new Parse.Query("Block");
    queryBlock.equalTo("who", user);
    queryBlock.equalTo("owner", otherUser);
    queryBlock.limit(1);
    const resultCount = await queryBlock.count({useMasterKey:true});
    if(resultCount>0){
      throw "Denied";
    }
    if(otherUser.get("private")===true){

      const queryBlock12 = new Parse.Query("Follow");
      queryBlock12.equalTo("who", otherUser);
      queryBlock12.equalTo("owner", user);
      queryBlock12.limit(1);
      const resultCount12 = await queryBlock12.count({useMasterKey:true});
      if(resultCount12<1){
        throw "denied";
      }
    }
  }


  const getBlock = new Parse.Query("Block");
  getBlock.equalTo("owner",user);
  getBlock.select("who");
  getBlock.descending("createdAt");
  getBlock.limit(1000);

  const bList = await getBlock.find({useMasterKey:true});

  var bloList = [];
  var i = 0;
  for(i = 0;i<bList.length;i++){
    bloList.push(bList[i].get("who"));
  }



  const getBlock2 = new Parse.Query("Block");
  getBlock2.equalTo("who",user);
  getBlock2.select("owner");
  getBlock2.descending("createdAt");
  getBlock2.limit(1000);

  const bList2 = await getBlock2.find({useMasterKey:true});

  for(i = 0;i<bList2.length;i++){
    bloList.push(bList2[i].get("owner"));
  }





  const getComment = new Parse.Query("Comment");
  getComment.limit(20);
  getComment.notContainedIn("user",bloList);
  getComment.include("user");
  getComment.equalTo("post",post);


  if(request.params.date!==undefined){
    getComment.greaterThan("createdAt",request.params.date);
  }
  getComment.ascending("createdAt");
  let parent;
  if(request.params.reply){
    const parcom = new Parse.Object("Comment",{id:request.params.reply});
    await parcom.fetch({useMasterKey:true});
    parent = parcom;
    if(parcom.get("post").id !== post.id){
      throw "denied";
    }
    otherUser2 = new Parse.User({id:parcom.get("user").id});
    if(user.id!==otherUser2.id){
      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", user);
      queryBlock2.equalTo("owner", otherUser2);
      queryBlock2.limit(1);
      const resultCount = await queryBlock2.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }
    }
    getComment.equalTo("parent",parcom);
    getComment.equalTo("isreply","true");
  }
  else{
    const parentComment = new Parse.Object('Comment', { id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr" });
    getComment.equalTo("parent",parentComment);
    getComment.equalTo("isreply","false");
  }



  const commentList = await getComment.find({useMasterKey:true});

  if(commentList.length<1){
    return {"comments":[],"hasmore":false,"date":new Date()};

  }


  const getVotes = new Parse.Query("CommentVote");
  getVotes.equalTo("owner",user);
  getVotes.containedIn("comment",commentList);

  const voteList = await getVotes.find({useMasterKey:true});

  var upvoteListIDs = [];
  var downvoteListIDs = [];

  var i;
  for(i=0;i<voteList.length;i++){
    if(voteList[i].get("vote")>0){
      upvoteListIDs.push(voteList[i].get("comment").id);
    }
    else{
      downvoteListIDs.push(voteList[i].get("comment").id);
    }
  }



  const getSaves = new Parse.Query("SavedComment");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("comment",commentList);
  getSaves.hint("owner_comment");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("comment").id);
  }



  var fL = commentList.map(comment => ({
    ...comment.toJSON(),
    upvote2: upvoteListIDs.indexOf(comment.id) >= 0,
    downvote2: downvoteListIDs.indexOf(comment.id) >= 0,
    saved2: saveListIDs.indexOf(comment.id) >= 0,
    vote2:comment.get("vote"),
    replycount2:comment.get("replycount"),
    __type:"Object",
    className:"Comment"
  }));
  
  return {"comments":fL,"hasmore":commentList.length>=20,"date":commentList[commentList.length-1].get("createdAt")};



});

Parse.Cloud.define("getGuestPosts", async (request) => {

  const user = request.user;

  const otherUser = new Parse.User({ id: request.params.userID });



  if(user.id===otherUser.id){
    throw denied;
  }
  if(user.id!==otherUser.id){

    const queryBlock = new Parse.Query("Block");
    queryBlock.equalTo("who", user);
    queryBlock.equalTo("owner", otherUser);
    queryBlock.limit(1);
    const resultCount = await queryBlock.count({useMasterKey:true});
    if(resultCount>0){
      throw "Denied";
    }
  }



  await otherUser.fetch({useMasterKey:true});

  if(otherUser.get("private")===true){

    const queryBlock12 = new Parse.Query("Follow");
    queryBlock12.equalTo("who", otherUser);
    queryBlock12.equalTo("owner", user);
    queryBlock12.limit(1);
    const resultCount12 = await queryBlock12.count({useMasterKey:true});
    if(resultCount12<1){
      throw "denied";
    }
  }




  const getPosts = new Parse.Query("Post");
  getPosts.equalTo("user",otherUser);
  if(request.params.date!==undefined){
    getPosts.lessThan("createdAt",request.params.date);
  }
  getPosts.hint("user_createdAt");
  getPosts.exclude("words");
  getPosts.descending("createdAt");
  getPosts.limit(39);

  const postList = await getPosts.find({useMasterKey:true});
  if(postList.length<1){
    return {"posts":[],"hasmore":false,"date":new Date()};
  }

  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.containedIn("post",postList);
  getLikes.hint("owner_post");

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }

  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("post",postList);
  getSaves.hint("owner_post");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }

  var fL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2:post.get("likenumber"),
    commentnumber2:post.get("commentnumber"),
    commentable2:post.get("commentable"),
    __type:"Object",
    className:"Post"

  }));

  return {"posts":fL,"hasmore":postList.length>=39,"date":postList[postList.length-1].get("createdAt")};


});

Parse.Cloud.define("getGuestProfile", async (request) => {

  const user = request.user;
  if(user.get("username")===request.params.username||user.id ===request.params.userID){
    throw "denied";
  }
  if(request.params.userID){
    const otherUser = new Parse.User({id:request.params.userID});




    if(user.id!==otherUser.id){

      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "denied";
      }
    }

    await otherUser.fetch({useMasterKey:true});
    var engel = false;
    var follow = false;

    var tmpL = [otherUser];


    const queryBlock1 = new Parse.Query("Block");
    queryBlock1.equalTo("who", otherUser);
    queryBlock1.equalTo("owner", user);
    queryBlock1.limit(1);
    const resultCount1 = await queryBlock1.count({useMasterKey:true});
    if(resultCount1>0){
      engel=true;
      const tpL = tmpL.map(user => ({
        ...user.toJSON(),
        block2: true,
        follow2: false,
        followrequest2:false,
        __type:"Object",
        className:"_User"

      }));

      return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};
      
    }

    const queryBlock12 = new Parse.Query("Follow");
    queryBlock12.equalTo("who", otherUser);
    queryBlock12.equalTo("owner", user);
    queryBlock12.limit(1);
    const resultCount12 = await queryBlock12.count({useMasterKey:true});
    if(resultCount12>0){

      const tpL = tmpL.map(user => ({
        ...user.toJSON(),
        block2: false,
        follow2: true,
        followrequest2:false,
        __type:"Object",
        className:"_User"
      }));

      return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};
      

    }
    var followRequest = false;

    if(follow===false){
      if(otherUser.get("private")===true){

        const queryBlock = new Parse.Query("FollowRequest");
        queryBlock.equalTo("who", otherUser);
        queryBlock.equalTo("owner", user);
        queryBlock.hint("owner_who");
        const resultCount = await queryBlock.find({useMasterKey:true});

        var uzunluk = resultCount.length;
        if(uzunluk>0){
          const tpL = tmpL.map(user => ({
            ...user.toJSON(),
            block2: false,
            follow2: false,
            followrequest2:true,
            __type:"Object",
            className:"_User"
          }));

          return {"user":tpL[0],"posts":{"posts":[],"hasmore":false,"date":new Date()}};
        }
      }
    }

    const tpL = tmpL.map(user => ({
      ...user.toJSON(),
      block2: false,
      follow2: false,
      followrequest2:false,
      __type:"Object",
      className:"_User"
    }));

    return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};
    


  }
  else{
    if(request.params.username){
      const getUser = new Parse.Query("_User");
      getUser.equalTo("username",request.params.username);
      getUser.limit(1);
      const resus = await getUser.find({useMasterKey:true});

      if(resus.length>0){
        const otherUser = resus[0];


        if(user.id!==otherUser.id){

          const queryBlock = new Parse.Query("Block");
          queryBlock.equalTo("who", user);
          queryBlock.equalTo("owner", otherUser);
          queryBlock.limit(1);
          const resultCount = await queryBlock.count({useMasterKey:true});
          if(resultCount>0){
            throw "denied";
          }
        }

        await otherUser.fetch({useMasterKey:true});
        var engel = false;
        var follow = false;
        var tmpL = [otherUser];
        const queryBlock1 = new Parse.Query("Block");
        queryBlock1.equalTo("who", otherUser);
        queryBlock1.equalTo("owner", user);
        queryBlock1.limit(1);
        const resultCount1 = await queryBlock1.count({useMasterKey:true});
        if(resultCount1>0){
          engel=true;
          const tpL = tmpL.map(user => ({
            ...user.toJSON(),
            block2: true,
            follow2: false,
            followrequest2:false,
            __type:"Object",
            className:"_User"
          }));

          return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};
        }


        const queryBlock12 = new Parse.Query("Follow");
        queryBlock12.equalTo("who", otherUser);
        queryBlock12.equalTo("owner", user);
        queryBlock12.limit(1);
        const resultCount12 = await queryBlock12.count({useMasterKey:true});
        if(resultCount12>0){

          const tpL = tmpL.map(user => ({
            ...user.toJSON(),
            block2: false,
            follow2: true,
            followrequest2:false,
            __type:"Object",
            className:"_User"
          }));

          return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};

        }
        var followRequest = false;

        if(follow===false){
          if(otherUser.get("private")===true){

            const queryBlock = new Parse.Query("FollowRequest");
            queryBlock.equalTo("who", otherUser);
            queryBlock.equalTo("owner", user);
            queryBlock.hint("owner_who");
            const resultCount = await queryBlock.find({useMasterKey:true});

            var uzunluk = resultCount.length;
            if(uzunluk>0){
              const tpL = tmpL.map(user => ({
                ...user.toJSON(),

                block2: false,
                follow2: false,
                followrequest2:true,
                __type:"Object",
                className:"_User"
              }));

              return {"user":tpL[0],"posts":{"posts":[],"hasmore":false,"date":new Date()}};
            }
          }
        }

        const tpL = tmpL.map(user => ({
          ...user.toJSON(),
          block2: false,
          follow2: false,
          followrequest2:false,
          __type:"Object",
          className:"_User"
        }));

        return {"user":tpL[0],"posts":await getPosts({"user":user,"otheruser":otherUser})};

      }
      else{
        throw "denied";
      }

    }
    else{
      throw "denied";
    }
  }

  async function getPosts(request){
    const user = request.user;
    const otherUser = request.otheruser;

    const getPosts = new Parse.Query("Post");
    getPosts.equalTo("user",otherUser);
    getPosts.exclude("words");
    getPosts.descending("createdAt");
    getPosts.limit(21);
    getPosts.hint("user_createdAt");

    const postList = await getPosts.find({useMasterKey:true});
    if(postList.length<1){
      return {"posts":[],"hasmore":false,"date":new Date()};
    }

    const getLikes = new Parse.Query("Like");
    getLikes.equalTo("owner",user);
    getLikes.containedIn("post",postList);
    getLikes.hint("owner_post");

    const likeList = await getLikes.find({useMasterKey:true});

    var likeListIDs = [];

    var i;
    for(i=0;i<likeList.length;i++){
      likeListIDs.push(likeList[i].get("post").id);
    }

    const getSaves = new Parse.Query("SavedPost");
    getSaves.equalTo("owner",user);
    getSaves.containedIn("post",postList);
    getSaves.hint("owner_post");
    const saveList = await getSaves.find({useMasterKey:true});

    var saveListIDs = [];

    var i;
    for(i=0;i<saveList.length;i++){
      saveListIDs.push(saveList[i].get("post").id);
    }

    var fL = postList.map(post => ({
      ...post.toJSON(),
      liked2: likeListIDs.indexOf(post.id) >= 0,
      saved2: saveListIDs.indexOf(post.id) >= 0,
      likenumber2:post.get("likenumber"),
      commentnumber2:post.get("commentnumber"),
      commentable2:post.get("commentable"),
      __type:"Object",
      className:"Post"
    }));
    
    return {"posts":fL,"hasmore":postList.length>=21,"date":postList[postList.length-1].get("createdAt")};

  }

});

Parse.Cloud.define("getHomeObjects", async (request) => {

  const user = request.user;



  const getFollow = new Parse.Query("Follow");
  getFollow.equalTo("owner",user);
  getFollow.select("who");
  getFollow.descending("createdAt");
  getFollow.limit(1000);
  const fList = await getFollow.find({useMasterKey:true});


  var followList = [];
  var i = 0;
  for(i = 0;i<fList.length;i++){
    followList.push(fList[i].get("who"));
  }
  followList.push(user);

  let seenL = [];
  if(request.params.seenList !== undefined && request.params.seenList !== null){
    if(request.params.seenList.length > 0){
      seenL = request.params.seenList;
    }
  }
  const getPosts = new Parse.Query("Post");
  getPosts.notContainedIn("objectId",seenL);
  getPosts.containedIn("user",followList);
  getPosts.include("user");
  if(request.params.date!==undefined){
    getPosts.lessThan("createdAt",request.params.date);
  }
  getPosts.exclude("words");
  getPosts.hint("user_createdAt");
  getPosts.descending("createdAt");
  getPosts.limit(20);

  const postList = await getPosts.find({useMasterKey:true});
  

  

  const getLikes = new Parse.Query("Like");
  getLikes.equalTo("owner",user);
  getLikes.containedIn("post",postList);
  getLikes.hint("owner_post");

  const likeList = await getLikes.find({useMasterKey:true});

  var likeListIDs = [];

  var i;
  for(i=0;i<likeList.length;i++){
    likeListIDs.push(likeList[i].get("post").id);
  }


  const getSaves = new Parse.Query("SavedPost");
  getSaves.equalTo("owner",user);
  getSaves.containedIn("post",postList);
  getSaves.hint("owner_post");

  const saveList = await getSaves.find({useMasterKey:true});

  var saveListIDs = [];

  var i;
  for(i=0;i<saveList.length;i++){
    saveListIDs.push(saveList[i].get("post").id);
  }
  var i;
  for(i=0;i<postList.length;i++){
    request.params.seenList.push(postList[i].id);
  }





  var fL = postList.map(post => ({
    ...post.toJSON(),
    liked2: likeListIDs.indexOf(post.id) >= 0,
    saved2: saveListIDs.indexOf(post.id) >= 0,
    likenumber2: post.get("likenumber"),
    commentnumber2: post.get("commentnumber"),
    commentable2: post.get("commentable"),
    __type:"Object",
    className:"Post"
  }));
  const suggestionPosts = await Parse.Cloud.run("getHomeDiscoverObjects",request.params,{sessionToken:user.getSessionToken()});
  if(postList.length>=20){
    return {"suggestions":suggestionPosts.posts,"posts":fL,"hasmore":postList.length>=20,"date":postList[postList.length-1].get("createdAt")};
  }
  else{
    const resu = await Parse.Cloud.run("getSuggestsFromList",request.params,{sessionToken:user.getSessionToken()});
    return {"suggestions":suggestionPosts.posts,"users":resu.profiles,"posts":fL,"hasmore":postList.length>=20,"date":postList[postList.length-1]?postList[postList.length-1].get("createdAt"):new Date()};
  }
  

});

Parse.Cloud.define("removeFollowRequest", async (request) => {

  const user = request.user;
  if(request.params.userID===user.id){
    throw "denied";
  }

  const otherUser = new Parse.User( { id: request.params.userID });


  await otherUser.fetch({useMasterKey:true});


  const queryBlock = new Parse.Query("FollowRequest");
  queryBlock.equalTo("who", otherUser);
  queryBlock.equalTo("owner", user);
  queryBlock.hint("owner_who");
  const resultCount = await queryBlock.find({useMasterKey:true});

  var uzunluk = resultCount.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = resultCount[count];
          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}



      }


  }


});

Parse.Cloud.define("sendFollowRequest", async (request) => {

  const user = request.user;
  if(request.params.userID===user.id){
    throw "denied";
  }

  const otherUser = new Parse.User({id:request.params.userID});


  const block = new FollowRequest();
  block.set("owner",user);
  block.set("who",otherUser);
  block.set("cid",user.id+otherUser.id);
  await block.save(null,{useMasterKey:true});

});

Parse.Cloud.define("unblock", async (request) => {

  const user = request.user;
  if(request.params.userID===user.id){
    throw "denied";
  }

  const otherUser = new Parse.User( { id: request.params.userID });


  await otherUser.fetch({useMasterKey:true});


  const queryBlock = new Parse.Query("Block");
  queryBlock.equalTo("who", otherUser);
  queryBlock.equalTo("owner", user);
  //queryBlock.lessThan("createdAt",new Date());
  const resultCount = await queryBlock.find({useMasterKey:true});

  var uzunluk = resultCount.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = resultCount[count];

          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}


      }


  }


});

Parse.Cloud.define("block", async (request) => {

  const user = request.user;
  if(request.params.userID===user.id){
    throw "denied";
  }
  const otherUser = new Parse.User({id:request.params.userID});


  const block = new Block();
  block.set("owner",user);
  block.set("cid",user.id+otherUser.id);
  block.set("who",otherUser);
  await block.save(null,{useMasterKey:true});

});

Parse.Cloud.define("unfollow", async (request) => {

  const user = request.user;
  if(user===undefined){
    throw "denied";
  }
  if(request.params.userID===user.id){
    throw "denied";
  }

  const otherUser = new Parse.User( { id: request.params.userID });



  const queryBlock = new Parse.Query("Follow");
  queryBlock.equalTo("who", otherUser);
  queryBlock.equalTo("owner", user);
  //queryBlock.lessThan("createdAt",new Date());
  const resultCount = await queryBlock.find({useMasterKey:true});

  var uzunluk = resultCount.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = resultCount[count];

          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}


      }


  }


});

Parse.Cloud.define("follow", async (request) => {



  const user = request.user;
  if(request.params.userID===user.id){
    throw "denied";
  }

  const otherUser = new Parse.User( { id: request.params.userID });



  const block = new Follow();
  block.set("owner",user);
  block.set("who",otherUser);
  block.set("cid",user.id+otherUser.id);
  block.set("own","false");
  await block.save(null,{useMasterKey:true});

});

Parse.Cloud.define("refreshOwnProfile", async (request) => {

  const user = request.user;
  if(user){
    return {"user":await user.fetch({useMasterKey:true})};
  }
  throw "denied";

});

Parse.Cloud.define("updateToken", async (request) => {

  const user = request.user;
  if(request.params.token===undefined){
    throw "";
  }
  if(user===undefined){
    throw "";

  }
  user.set("token",request.params.token);
  await user.save(null,{useMasterKey:true});
});

Parse.Cloud.define("register", async (request) => {

  let name = request.params.name;
  let username = request.params.username;
  const password = request.params.password;
  const email = request.params.email;


  if(name){
    name = name.trim().replace('\n', ' ');
    name = name.replace(/\s\s+/g, ' ');
    name = name.substring(0,25);
  }
  if(!name){
    throw "denied";
  }
  if(!username){
    throw "denied";
  }
  if(!email){
    throw "denied";
  }
  if(!password){
    throw "denied";
  }
  if(username.length>25){
    throw "usernamemustbeshorterthan25";
  }
  if(username!==username.toLowerCase()){
    throw "usernamecantcontainuppercase";
  }
  if(!isNaN(username)){
    throw "usernamemustcontainletter";
  }
  if(username.match(/^[a-z0-9\_\.]+/i)){
    if(!isEmailValid(email)){
      throw "invalidemail";
    }
    if(password.length<6){
      throw "passtooshort"
    }
    var user = new Parse.User();

    user.set("username", username);
    user.set("password", password);
    user.set("email", email);
    user.set("namesurname", name);
    var searchname = name;
    searchname = searchname.toLowerCase();
    while(searchname.includes(" ")){
      searchname = searchname.replace(" ","");
    }
    user.set("tb",0);
    user.set("namesearch",searchname);
    user.set("biography","");
    user.set("reviewed",false);
    user.set("accounttype",1);
    user.set("N6GLd6ENxW",0);
    user.set("reviewed",false);
    user.set("follower",0);
    user.set("following",0);
    user.set("private",false);
    user.set("haspp",false);

    await user.signUp(null,{useMasterKey:true});

    return "signUpSuccess";

  }
  else{
    throw "denied";
  }





  

});

Parse.Cloud.define("unsaveComment", async (request) => {

  const post = new Parse.Object('Comment', { id: request.params.postID });
  const user = request.user;


  const query = new Parse.Query("SavedComment");
  query.equalTo("comment",post);
  query.equalTo("owner", user);
  //query.lessThan("createdAt",new Date());
  const results = await query.find({useMasterKey:true});



  var uzunluk = results.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = results[count];

          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}


      }


  }
});

Parse.Cloud.define("saveComment", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Comment', { id: request.params.postID });



  const like = new SavedComment();
  like.set("owner",user);
  like.set("comment",post);
  like.set("cid",user.id+post.id);
  like.set("cuser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  like.set("puser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  like.set("pauser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  await like.save(null,{useMasterKey:true});






});

Parse.Cloud.define("reportComment", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Comment', { id: request.params.postID });

  const like = new ReportComment();
  like.set("comment",post);
  like.set("reason",request.params.reason);
  like.set("owner",user);
  like.set("cid",user.id+post.id);
  like.save(null,{useMasterKey:true});
  

});

Parse.Cloud.define("deleteComment", async (request) => {

  const user = request.user;

  const comment = new Parse.Object('Comment', { id: request.params.postID });

    await comment.fetch({useMasterKey:true});
    const otherUser = new Parse.User({id:comment.get("user").id});

    if(user.id===otherUser.id||comment.get("puser").id===user.id){

      await comment.destroy({useMasterKey:true});
      return "deleted";

    }
    else{
      throw "denied";
    }



});

Parse.Cloud.define("deletePost", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Post', { id: request.params.postID });

    await post.fetch({useMasterKey:true});
    const otherUser = new Parse.User({id:post.get("user").id});

    if(user.id===otherUser.id){
      await post.destroy({useMasterKey:true});
      return "deleted";
    }
    else{
      
      throw "denied";
    }




});

Parse.Cloud.define("unsavePost", async (request) => {

  const post = new Parse.Object('Post', { id: request.params.postID });
  const user = request.user;


  const query = new Parse.Query("SavedPost");
  query.equalTo("post", post);
  query.equalTo("owner", user);
  const results = await query.find({useMasterKey:true});



  var uzunluk = results.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = results[count];

          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}


      }


  }
});

Parse.Cloud.define("savePost", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Post', { id: request.params.postID });


  const like = new SavedPost();
  like.set("owner",user);
  like.set("post",post);
  like.set("cid",user.id+post.id);
  like.set("puser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  await like.save(null,{useMasterKey:true});

});

Parse.Cloud.define("reportPost", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Post', { id: request.params.postID });

  const like = new Report();
  like.set("post",post);
  like.set("reason",request.params.reason);
  like.set("owner",user);
  like.set("cid",user.id+post.id);
  like.save(null,{useMasterKey:true});

});

Parse.Cloud.define("likePost", async (request) => {

  let user;
  if(request.master){
    user = new Parse.User({id:request.params.userID});
  }
  else{
    user = request.user;
  }
  if(!user){
    throw "denied";
  }
  
  const post = new Parse.Object('Post', { id: request.params.postID });
  

  const like = new Like();
  like.set("owner",user);
  like.set("post",post);
  like.set("content","undefined");
  like.set("cid",user.id+post.id);
  like.set("puser",new Parse.User({id: "sGrgywq5ucsc9QznqkBZQD3vGKc4pr"}));
  await like.save(null,{useMasterKey:true});

});

Parse.Cloud.define("unlikePost", async (request) => {

  const post = new Parse.Object('Post', { id: request.params.postID });
  const user = request.user;


  const query = new Parse.Query("Like");
  query.equalTo("post", post);
  query.equalTo("owner", user);
  //query.lessThan("createdAt",new Date());
  const results = await query.find({useMasterKey:true});



  var uzunluk = results.length;
  if(uzunluk>0){

      //fazla like objelerini sil
      var count;
      for(count = 0; count < uzunluk; count++) {

          var xLike = results[count];

          try{
            await xLike.destroy({useMasterKey:true});
          }catch(err){}


      }


  }
});

Parse.Cloud.define("upvoteComment", async (request) => {

  const comment = new Parse.Object("Comment", { id: request.params.postID });

  const user = request.user;





  const getVoteQuery = new Parse.Query("CommentVote");
  getVoteQuery.equalTo("owner", user);
  getVoteQuery.equalTo("comment", comment);
  getVoteQuery.limit(1);
  const resultCount = await getVoteQuery.find({useMasterKey:true});

  if(resultCount.length>0){
    const vote = resultCount[0];
    vote.set("vote",1);
    await vote.save(null,{useMasterKey:true});
  }
  else{
    const vote = new CommentVote();
    vote.set("owner",user);
    vote.set("comment",comment);
    vote.set("vote",1);
    vote.set("cid",user.id+comment.id);
    await vote.save(null,{useMasterKey:true});
  }

});

Parse.Cloud.define("unvoteComment", async (request) => {

  const comment = new Parse.Object('Comment', { id: request.params.postID });

  const user = request.user;


  const getVoteQuery = new Parse.Query("CommentVote");
  getVoteQuery.equalTo("owner", user);
  getVoteQuery.equalTo("comment", comment);
  getVoteQuery.limit(1);
  const resultCount = await getVoteQuery.find({useMasterKey:true});

  if(resultCount.length>0){
    const vote = resultCount[0];
    await vote.destroy({useMasterKey:true});
  }

});

Parse.Cloud.define("downvoteComment", async (request) => {

  const comment = new Parse.Object('Comment', { id: request.params.postID });

  const user = request.user;





  const getVoteQuery = new Parse.Query("CommentVote");
  getVoteQuery.equalTo("owner", user);
  getVoteQuery.equalTo("comment", comment);
  getVoteQuery.limit(1);
  const resultCount = await getVoteQuery.find({useMasterKey:true});

  if(resultCount.length>0){
    const vote = resultCount[0];
    vote.set("vote",-1);
    await vote.save(null,{useMasterKey:true});
  }
  else{
    const vote = new CommentVote();
    vote.set("owner",user);
    vote.set("comment",comment);
    vote.set("vote",-1);
    vote.set("cid",user.id+comment.id);
    await vote.save(null,{useMasterKey:true});
  }






});


Parse.Cloud.define("enableDisableComment", async (request) => {

  const user = request.user;

  const post = new Parse.Object('Post', { id: request.params.postID });

  await post.fetch({useMasterKey:true});

  if(user.id===post.get("user").id){
    if(post.get("commentable")){
      post.set("commentable",false);
    }
    else{
      post.set("commentable",true);
    }
    await post.save(null,{useMasterKey:true});
  }
  else{
    throw "forbidden";
  }





});



Parse.Cloud.beforeSaveFile(async (request) => {
  if(!request.master){
      const file = request.file;

      var fileData = await file.getData();

      const tempIm = Buffer.from(fileData, 'base64');
      const mimeInfo1 = await fileType.fromBuffer(tempIm);
      console.log(mimeInfo1);

      if(!mimeInfo1.mime.startsWith("image")&&!mimeInfo1.mime.startsWith("video/mp4")){
        throw "4875";
      }
      var dosyaSize = tempIm.byteLength;
      var sizeKB = dosyaSize/1024;
      console.log(sizeKB);
      if(mimeInfo1.mime.startsWith("image")){

        if(sizeKB>600){

          let options = { percentage: 50, responseType: 'base64' };
          const thumbnail = await imageThumbnail(tempIm, options);
          const tempIm2 = Buffer.from(thumbnail, 'base64');
          var dosyaSize2 = tempIm2.byteLength;
          var sizeKB2 = dosyaSize2/1024;
          console.log(sizeKB2);
          if(sizeKB2>600){
            throw "74125";
          }
          fileData = thumbnail;


        }

        const newFile = new Parse.File("temp_"+request.user.id, { base64: fileData },mimeInfo1.mime);
        return newFile;



      }

      if(mimeInfo1.mime.startsWith("video")){
        if(sizeKB>8096){
          throw "74125";
        }
        else{
          const newFile = new Parse.File("temp_"+request.user.id, { base64: fileData },mimeInfo1.mime);
          return newFile;

        }

      }

      throw "denied";

  }



});

Parse.Cloud.beforeSave(Parse.Installation, (request) => {
  request.object.set("user", request.user);
  request.object.set("tcode",request.user.getSessionToken().substr(request.user.getSessionToken().length - 6))
});

Parse.Cloud.beforeSave("Block", async (request) => {
  if(!request.original){
    const otherUser = request.object.get("who");
    const user = request.object.get("owner");

    if(user.id===otherUser.id){
      throw  "denied";
    }

    request.object.set("cid",user.id+otherUser.id);


  }

});

Parse.Cloud.beforeSave("Comment", async (request) => {

  if(!request.original){
    const user = new Parse.User( { id: request.object.get("user").id });
    const post = new Parse.Object( "Post", { id: request.object.get("post").id });

    /*const timeCheck = new Parse.Query(CommentObje);
    timeCheck.equalTo("user",user);
    timeCheck.equalTo("post",post);
    timeCheck.descending("createdAt");
    timeCheck.limit(1);
    const tc = await timeCheck.find({useMasterKey:true});
    if(tc.length>0){
      if(((new Date) - tc[0].get("createdAt")) < (30 * 1000)){
        throw "justPosted";
      }
    }*/

    const comment = request.object;


    await post.fetch({useMasterKey:true});




    if(post.get("commentable")===false){
      throw "CommentsDisabled";
    }
    const otherUser = new Parse.User({id:post.get("user").id});
    request.object.set("puser",post.get("user"));
    if(user.id!==otherUser.id){
      
      if(otherUser.get("private")===true){

          const queryBlock12 = new Parse.Query("Follow");
          queryBlock12.equalTo("who", otherUser);
          queryBlock12.equalTo("owner", user);
          queryBlock12.limit(1);
          const resultCount12 = await queryBlock12.count({useMasterKey:true});
          if(resultCount12<1){
            throw "denied";
          }
      }
      const getBlock = new Parse.Query("Block");
      getBlock.equalTo("owner",otherUser);
      getBlock.equalTo("who",user);
      getBlock.limit(1);

      const result = await getBlock.count({useMasterKey:true});

      if(result>0){
        throw "denied";
      }

      const getBlock2 = new Parse.Query("Block");
      getBlock2.equalTo("owner",user);
      getBlock2.equalTo("who",otherUser);
      getBlock2.limit(1);

      const result2 = await getBlock2.count({useMasterKey:true});
      if(result2>0){
        throw "denied";
      }
    }




    if(comment.get("isreply")==="true"){
      const parent = new Parse.Object("Comment", { id: request.object.get("parent").id });
      await parent.fetch({useMasterKey:true});
      request.object.set("cuser",parent.get("user"));

      const otherUser2 = new Parse.User({id:parent.get("user").id});
      if(otherUser2.id!==user.id){
        const getBlock3 = new Parse.Query("Block");
        getBlock3.equalTo("owner",otherUser2);
        getBlock3.equalTo("who",user);
        getBlock3.limit(1);

        const result3 = await getBlock3.count({useMasterKey:true});

        if(result3>0){
          throw "denied";
        }

        const getBlock24 = new Parse.Query("Block");
        getBlock24.equalTo("owner",user);
        getBlock24.equalTo("who",otherUser2);
        getBlock24.limit(1);

        const result24 = await getBlock24.count({useMasterKey:true});
        if(result24>0){
          throw "denied";
        }
      }




    }


  }

});

Parse.Cloud.beforeSave("CommentVote", async (request) => {

    const vote = request.object;
    const user = vote.get("owner");
    const comment = vote.get("comment");
    vote.set("cid",user.id+comment.id);
    
});

Parse.Cloud.beforeSave("Follow", async (request) => {
  if(!request.original){
    const downvote = request.object;
    const user = new Parse.User({id:downvote.get("owner").id});

    const otherUser = new Parse.User({id:downvote.get("who").id});

    await otherUser.fetch({useMasterKey:true});
    if(otherUser.get("private")===true){
      if(downvote.get("own")!=="true"){
        throw "denied";
      }
    }

    if(user.id!==otherUser.id){

      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", user);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }
    }
    if(user.id===otherUser.id){
      throw "denied";
    }


    request.object.set("cid",user.id+otherUser.id);
  }


});

Parse.Cloud.beforeSave("FollowRequest", async (request) => {
  if(!request.original){
    const downvote = request.object;
    const user = new Parse.User({id:downvote.get("owner").id});

    const otherUser = new Parse.User({id:downvote.get("who").id});

    await otherUser.fetch({useMasterKey:true});
    if(otherUser.get("private")===false){
      throw "denied";
    }

    if(user.id!==otherUser.id){

      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", user);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }
    }
    if(user.id===otherUser.id){
      throw "denied";
    }

    

    request.object.set("cid",user.id+otherUser.id);
  }


});

Parse.Cloud.beforeSave("Like", async (request) => {
  if(!request.original){
    const downvote = request.object;
    const user = new Parse.User({id:downvote.get("owner").id});

    const post = new Parse.Object("Post",{id:downvote.get("post").id});
    await post.fetch({useMasterKey:true});

    request.object.set("cid",user.id+post.id);

    const otherUser = new Parse.User({id:post.get("user").id});

    


    if(user.id!==otherUser.id){
      request.object.set("puser",post.get("user"));
      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      await otherUser.fetch({useMasterKey:true});
      if(otherUser.get("private")===true){
        const getDownvotes = new Parse.Query("Follow");
        getDownvotes.equalTo("who", otherUser);
        getDownvotes.equalTo("owner", user);
        getDownvotes.limit(1);
        const c = await getDownvotes.count({useMasterKey:true});
        if(c<1){
          throw "Denied";
        }
      }


      
    }
    await user.fetch({useMasterKey:true});
    var words = post.get("words");
    for(var i = 0; i < words.length; i++){
      var st = words[i];
      if(st.startsWith("c_") && st.length > 30){
        if(user.get("tb")!==0){
          request.object.set("content",st.replace("c_","")+"_tbnot");
        }
        else{
          request.object.set("content",st.replace("c_",""));
        }
        break;
      }
    }



  }



});



Parse.Cloud.beforeSave("Notif", async (request) => {
  if(!request.original){
    const notif = request.object;
  
    const user = new Parse.User({id:notif.get("owner").id});

    const otherUser = new Parse.User({id:notif.get("to").id});

    const type = notif.get("type");

    if(user.id!==otherUser.id){

      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", user);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }

      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      
    }
    if(user.id===otherUser.id){
      throw "denied";
    }
    if(type==="mentionpost"){
      const othUser = notif.get("puser");
      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", othUser);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }
      await othUser.fetch({useMasterKey:true});
      if(othUser.get("private")===true){
        const getDownvotes = new Parse.Query("Follow");
        getDownvotes.equalTo("who", othUser);
        getDownvotes.equalTo("owner", otherUser);
        getDownvotes.limit(1);
        const c = await getDownvotes.count({useMasterKey:true});
        if(c<1){
          throw "Denied";
        }
      }
    }
    if(type==="mentioncomment"){
      const othUser = notif.get("puser");
      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", othUser);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }

      const othUser2 = notif.get("cuser");
      const queryBlock22 = new Parse.Query("Block");
      queryBlock22.equalTo("who", otherUser);
      queryBlock22.equalTo("owner", othUser2);
      queryBlock22.limit(1);
      const resultCount22 = await queryBlock22.count({useMasterKey:true});
      if(resultCount22>0){
        throw "Denied";
      }

      await othUser.fetch({useMasterKey:true});
      if(othUser.get("private")===true){
        const getDownvotes = new Parse.Query("Follow");
        getDownvotes.equalTo("who", otherUser);
        getDownvotes.equalTo("owner", othUser);
        getDownvotes.limit(1);
        const c = await getDownvotes.count({useMasterKey:true});
        if(c<1){
          throw "Denied";
        }
      }

    }

  }

});


Parse.Cloud.beforeSave("SavedComment", async (request) => {
  if(!request.original){
    const user = new Parse.User( { id: request.object.get("owner").id });
    const comment = new Parse.Object("Comment", { id: request.object.get("comment").id });
    await comment.fetch({useMasterKey:true});

    const otherUser = new Parse.User({id:comment.get("user").id});


    request.object.set("cid",user.id+comment.id);
    if(otherUser.id!==user.id){

      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", user);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }
      request.object.set("cuser",otherUser);
    }



    if(comment.get("isreply")==="true"){
      const parentComment = new Parse.Object("Comment", { id: comment.get("parent").id });
      await parentComment.fetch({useMasterKey:true});
      request.object.set("pauser",parentComment.get("user"));
      const otherUser2 = new Parse.User({id:parentComment.get("user").id});
      if(otherUser2.id !== user.id){


        const queryBlock3 = new Parse.Query("Block");
        queryBlock3.equalTo("who", user);
        queryBlock3.equalTo("owner", otherUser2);
        queryBlock3.limit(1);
        const resultCount3 = await queryBlock3.count({useMasterKey:true});
        if(resultCount3>0){
          throw "Denied";
        }

        const queryBlock24 = new Parse.Query("Block");
        queryBlock24.equalTo("who", otherUser2);
        queryBlock24.equalTo("owner", user);
        queryBlock24.limit(1);
        const resultCount24 = await queryBlock24.count({useMasterKey:true});
        if(resultCount24>0){
          throw "Denied";
        }
      }

    }
    

    const post = new Parse.Object("Post", { id: comment.get("post").id });
    await post.fetch({useMasterKey:true});

    const otherUser3 = new Parse.User({id:post.get("user").id});
    if(otherUser3.id!==user.id){
      request.object.set("puser",post.get("user"));
      const queryBlock34 = new Parse.Query("Block");
      queryBlock34.equalTo("who", user);
      queryBlock34.equalTo("owner", otherUser3);
      queryBlock34.limit(1);
      const resultCount34 = await queryBlock34.count({useMasterKey:true});
      if(resultCount34>0){
        throw "Denied";
      }

      const queryBlock244 = new Parse.Query("Block");
      queryBlock244.equalTo("who", otherUser3);
      queryBlock244.equalTo("owner", user);
      queryBlock244.limit(1);
      const resultCount244 = await queryBlock244.count({useMasterKey:true});
      if(resultCount244>0){
        throw "Denied";
      }

    }
  }


});

Parse.Cloud.beforeSave("ReportComment", async (request) => {
  if(!request.original){
    var report = request.object;
    var comment = report.get("comment");
    await comment.fetch({useMasterKey:true});
    if(comment.get("reportable")!==true){
      throw "unreportable";
    }
  }
});

Parse.Cloud.beforeSave("Report", async (request) => {
  if(!request.original){
    var report = request.object;
    var post = report.get("post");
    await post.fetch({useMasterKey:true});
    if(post.get("reportable")!==true){
      throw "unreportable";
    }
  }
});

Parse.Cloud.beforeSave("SavedPost", async (request) => {
  if(!request.original){
    const user = new Parse.User( { id: request.object.get("owner").id });
    const comment = new Parse.Object("Post", { id: request.object.get("post").id });
    await comment.fetch({useMasterKey:true});

    const otherUser = new Parse.User({id:comment.get("user").id});


    request.object.set("cid",user.id+comment.id);

    if(otherUser.id!==user.id){
      request.object.set("puser",comment.get("user"));
      const queryBlock = new Parse.Query("Block");
      queryBlock.equalTo("who", user);
      queryBlock.equalTo("owner", otherUser);
      queryBlock.limit(1);
      const resultCount = await queryBlock.count({useMasterKey:true});
      if(resultCount>0){
        throw "Denied";
      }

      const queryBlock2 = new Parse.Query("Block");
      queryBlock2.equalTo("who", otherUser);
      queryBlock2.equalTo("owner", user);
      queryBlock2.limit(1);
      const resultCount2 = await queryBlock2.count({useMasterKey:true});
      if(resultCount2>0){
        throw "Denied";
      }

      if(otherUser.get("private")===true){

        const queryBlock12 = new Parse.Query("Follow");
        queryBlock12.equalTo("who", otherUser);
        queryBlock12.equalTo("owner", user);
        queryBlock12.limit(1);
        const resultCount12 = await queryBlock12.count({useMasterKey:true});
        if(resultCount12<1){
          throw "denied";
        }
      }
    }


  }

});


Parse.Cloud.beforeSave("Message", async (request) => {
  if(!request.original){

    const user = request.user;
    if(!user){
      throw "denied";
    }
    const message = request.object;
    message.unset("message2");
    message.unset("type");
    message.unset("isuri");
    message.unset("uri");
    message.set("owner",user.id);
    
    const preMedia = message.get("media");
    if(preMedia){
      if(message.get("message").trim().length<1){
        message.set("message","_message_media_only_");
      }
      let fileData = await preMedia.getData();
      const tempIm = Buffer.from(fileData, 'base64');
      const mimeInfo1 = await fileType.fromBuffer(tempIm);
      if(mimeInfo1.mime.startsWith("image")){
        const newFile = new Parse.File("image_"+request.user.id, { base64: fileData },mimeInfo1.mime);
        await newFile.save({useMasterKey:true});
        message.set("media",newFile);
      }
      else{
        message.unset("media");
      }
    }
    
    

    const chat = new Parse.Object("Chat",{id:message.get("chat")});
    await chat.fetch({useMasterKey:true});

    const userList = chat.get("users");
    if(userList.indexOf(user.id)<0){
      throw "denied";
    }
    const groupACL = new Parse.ACL();
    for(const objecta of userList){
      groupACL.setReadAccess(new Parse.User({id:objecta}), true);
    }
    //groupACL.setWriteAccess(userList[i], true);
    
    message.setACL(groupACL);
    return message;

  }
});



Parse.Cloud.afterSave("Notif", async (request) => {
  
  main(request);

  async function main(request) {
    if(!request.original){

      const notif = request.object;
      if(notif.get("own")===undefined || notif.get("own")==="false"){
        const user = notif.get("owner");
        const otherUser = notif.get("to");
  
        otherUser.increment("notifcount");
        try{
          await otherUser.save(null,{useMasterKey:true});
        }catch(error){}
  
        await user.fetch({useMasterKey:true});
  
        let ppurl = "empty";
        if(user.get("profilephotoprofile")!==undefined){
          ppurl = user.get("profilephotoprofile").url();
        }
  
        const getIns = new Parse.Query("DeviceToken");
        getIns.equalTo("user",otherUser);
        const insList = await getIns.find({useMasterKey:true});
  
  
  
        const notifType = notif.get("type");
        if(notifType==="likedpost"||notifType==="mentionpost"){
          for(var i = 0;i<insList.length;i++){
            var message = {
            data: {
              type: ''+notif.get("type"),
              postid:""+notif.get("post").id,
              username: ""+user.get("username"),
              name: ""+user.get("namesurname"),
              image: ""+ppurl,
              to:otherUser.id+""
            },
            token: ""+insList[i].get("token")
            };
            try{
              await admin.messaging().send(message);
            }catch(err){
              try{
                await insList[i].destroy({useMasterKey:true});
              }catch(err){}
            }
          }
  
        }
        if(notifType==="commentpost"||notifType==="replycomment"||notifType==="mentioncomment"){
          for(var i = 0;i<insList.length;i++){
            var message = {
            data: {
              type: ''+notif.get("type"),
              commentid:""+notif.get("comment").id,
              username: ""+user.get("username"),
              name: ""+user.get("namesurname"),
              image: ""+ppurl,
              to:otherUser.id+""
            },
            token: ""+insList[i].get("token")
            };
            try{
              await admin.messaging().send(message);
            }catch(err){
              try{
                await insList[i].destroy({useMasterKey:true});
              }catch(err){}
            }
          }
  
        }
        if(notif.get("type")==="followedyou"){
          for(var i = 0;i<insList.length;i++){
            var message = {
            data: {
              type: ""+notif.get("type"),
              username: ""+user.get("username"),
              name: ""+user.get("namesurname"),
              image: ""+ppurl,
              to:otherUser.id+""
            },
            token: ""+insList[i].get("token")
            };
            try{
              await admin.messaging().send(message);
            }catch(err){
              try{
                await insList[i].destroy({useMasterKey:true});
              }catch(err){}
            }
          }
  
  
  
        }
  
      }
      else{
        if(notif.get("type")==="followedyou"){
          const otherUser = notif.get("owner");
          const user = notif.get("to");
          await user.fetch({useMasterKey:true});
          let ppurl = "";
          if(user.get("profilephotoprofile")!==undefined){
            ppurl = user.get("profilephotoprofile").url();
          }
  
          const getIns = new Parse.Query("DeviceToken");
          getIns.equalTo("user",otherUser);
          const insList = await getIns.find({useMasterKey:true});
          for(var i = 0;i<insList.length;i++){
            var message = {
            data: {
              type: 'acceptedfollowrequest',
              username: ""+user.get("username"),
              name: ""+user.get("namesurname"),
              image: ""+ppurl,
              to:otherUser.id+""
            },
            token: ""+insList[i].get("token")
            };
            try{
              await admin.messaging().send(message);
            }catch(err){
              try{
                await insList[i].destroy({useMasterKey:true});
              }catch(err){}
            }
          }
  
  
  
        }
      }
  
  
    }
  };
});

Parse.Cloud.afterSaveFile(async (request) => {
  main(request);
  async function main(request) {
    if(!request.master){
      const file2 = request.file;
      const file = new Parse.Object('File');
      file.set('file', file2);
      file.save(null,{useMasterKey:true});
    }
  }

});

Parse.Cloud.afterSave(Parse.User, async (request) => {
  
  main(request);
  async function main(request) {
    if(request.original){
      if(request.object.get("private")===false&&request.original.get("private")===true){
        Parse.Cloud.run("acceptAllFollowRequestsAfterProfileBecomePublic", {"user":request.object.id},{useMasterKey:true});
        Parse.Cloud.run("makePostsPublic", {"user":request.object.id},{useMasterKey:true});
      }
      if(request.object.get("private")===true&&request.original.get("private")===false){
        Parse.Cloud.run("makePostsPrivate", {"user":request.object.id},{useMasterKey:true});
      }
      if(request.object.get("accounttype")===2&&request.original.get("accounttype")!==2){
        //Parse.Cloud.run("makePostsContentCreator", {"user":request.object.id},{useMasterKey:true});
      }
      if(request.object.get("accounttype")!==2&&request.original.get("accounttype")===2){
        Parse.Cloud.run("makePostsPersonal", {"user":request.object.id},{useMasterKey:true});
      }
      if(request.object.get("haspp")===false&&request.original.get("haspp")===true){
        //profile fotosu kaldırıldı
  
  
        var image = request.original.get("profilephotoprofile");
        if(image){
          try{
            await image.destroy({ useMasterKey: true });
          }catch(error){
            try{
              await image.destroy({ useMasterKey: true });
            }catch(error){
              
            }
          }
        }
  
        var image2 = request.original.get("profilephotoadapter");
  
        if(image2){
          try{
            await image2.destroy({ useMasterKey: true });
          }catch(error){
            try{
              await image2.destroy({ useMasterKey: true });
            }catch(error){
              
            }
          }
        }
  
        
  
  
      }
      if(request.object.get("haspp")===true&&request.original.get("haspp")===true){
        if(request.object.get("profilephotoprofile").name()!==request.original.get("profilephotoprofile").name()){
  
          var image = request.original.get("profilephotoprofile");
          if(image){
            try{
              await image.destroy({ useMasterKey: true });
            }catch(error){
              try{
                await image.destroy({ useMasterKey: true });
              }catch(error){
                
              }
            }
          }
          
  
  
          var image2 = request.original.get("profilephotoadapter");
  
          if(image2){
            try{
              await image2.destroy({ useMasterKey: true });
            }catch(error){
              try{
                await image2.destroy({ useMasterKey: true });
              }catch(error){
                
              }
            }
          }
        }
        //profile fotosu kaldırıldı
      }
    }
  }
});

Parse.Cloud.afterSave("Block", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){

      const block = request.object;
    
      Parse.Cloud.run("deleteNotifsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteNotifsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteFollowsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteFollowsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteFollowRequestsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteFollowRequestsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteLikesAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteLikesAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteSavedPostsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteSavedPostsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteCommentsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteCommentsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteSavedCommentsAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteSavedCommentsAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("deleteCommentRepliesAfterBlockWhoToOwner", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
      Parse.Cloud.run("deleteCommentRepliesAfterBlockOwnerToWho", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});
  
      Parse.Cloud.run("removeChatsAfterBlock", {"owner":block.get("owner").id,"who":block.get("who").id},{useMasterKey:true});

    }
  }
});

Parse.Cloud.afterSave("CommentVote", async (request) => {
  
  main(request);
  async function main(request) {
    const commentVote = request.object;
    const comment = new Parse.Object("Comment",{id:commentVote.get("comment").id});
  
    if(!request.original){
  
      comment.increment("vote",commentVote.get("vote"));
      try{
        await comment.save(null,{useMasterKey:true});
      }catch(error){}
  
  
    }
    else{
      comment.increment("vote",commentVote.get("vote")-request.original.get("vote"));
      try{
        await comment.save(null,{useMasterKey:true});
      }catch(error){}
  
    }
  }
});

Parse.Cloud.afterSave("Follow", async (request) => {
  main(request);
  async function main(request) {
    if(!request.original){
      const follow = request.object;
  
      const otherUser = new Parse.User({id:follow.get("who").id});
      const user = new Parse.User({id:follow.get("owner").id});
      user.increment("following");
      try{
        await user.save(null,{useMasterKey:true});
      }catch(error){}
  
      otherUser.increment("follower");
      try{
        await otherUser.save(null,{useMasterKey:true});
      }catch(error){}
  
      if(user.id!==otherUser.id){
  
  
        const notif = new Notif();
        notif.set("type","followedyou");
        if(follow.get("own")===undefined){
          notif.set("own","false");
        }
        else{
          notif.set("own",follow.get("own"));
        }
        notif.set("owner",user);
        notif.set("follow",follow)
        notif.set("to",otherUser);
        try{
          await notif.save(null,{useMasterKey:true});
        }catch(error){}
      }
  
  
    }
  }
  
});

Parse.Cloud.afterSave("FollowRequest", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){
      const followRequest = request.object;
  
      const otherUser = new Parse.User({id:followRequest.get("who").id});
      const user = new Parse.User({id:followRequest.get("owner").id});
  
  
  
      otherUser.increment("followreqcount");
      otherUser.increment("notifcount");
      try{
        otherUser.save(null,{useMasterKey:true});
      }catch(error){}
      await user.fetch({useMasterKey:true});
  
      let ppurl = "empty";
      if(user.get("profilephotoprofile")!==undefined){
        ppurl = user.get("profilephotoprofile").url();
      }
  
      const getIns = new Parse.Query("DeviceToken");
      getIns.equalTo("user",otherUser);
      const insList = await getIns.find({useMasterKey:true});
  
      for(var i = 0; i < insList.length; i++){
        var message = {
          data: {
            type: 'followrequest',
            username: ""+user.get("username"),
            name: ""+user.get("namesurname"),
            image: ""+ppurl,
            to:otherUser.id+""
          },
            token: ""+insList[i].get("token")
          };
          try{
            await admin.messaging().send(message);
          }catch(err){
            try{
              await insList[i].destroy({useMasterKey:true});
            }catch(err){}
          }
      }
      
  
  
    }
  }
});

Parse.Cloud.afterSave("Like", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){
      const like = request.object;
  
      const post = new Parse.Object("Post",{id:like.get("post").id});
      const user = new Parse.User({id:like.get("owner").id});
      await post.fetch({useMasterKey:true});
  
      const otherUser = new Parse.User({id:post.get("user").id});
  
      post.increment("likenumber");
      try{
        await post.save(null,{useMasterKey:true});
      }catch(error){}
  
  
  
      if(user.id!==otherUser.id){
  
  
        const notif = new Notif();
        notif.set("type","likedpost");
        notif.set("owner",user);
        notif.set("like",like);
        notif.set("post",post);
        if(post.get("type")==="image"){
          var media = post.get("media")[0];
          if(media.thumbnail!==undefined){
            notif.set("mainmedia",media.thumbnail);
  
          }
        }
        if(post.get("type")==="video"){
          var media = post.get("media")[0];
          if(media.thumbnail2!==undefined){
            notif.set("mainmedia",media.thumbnail2);
          }
        }
        if(post.get("description")!=null){
          notif.set("description",post.get("description").substring(0,200));
        }
        notif.set("to",otherUser);
        try{
          await notif.save(null,{useMasterKey:true});
        }catch(error){}
      }
  
      if(like.get("content") !== "undefined"){
        if(!like.get("content").endsWith('tbnot')){
          var getInterest = new Parse.Query("UserInterest");
          getInterest.equalTo("cid",like.get("owner").id+like.get("content")); 
          getInterest.limit(1);
          var inL = await getInterest.find({useMasterKey:true});
          if(inL.length>0){
            var interest = inL[0];
            interest.increment("count");
            try{
              await interest.save(null,{useMasterKey:true});
            }catch(error){}
      
          }
          else{
            var interest = new UserInterest();
            interest.set("user",like.get("owner"));
            interest.set("content",like.get("content"));
            interest.set("count",1);
            interest.set("cid",like.get("owner").id+like.get("content"));
            try{
              await interest.save(null,{useMasterKey:true});
            }catch(err){}
          }
  
          var getInterest = new Parse.Query("ExtraUserInfo");
          getInterest.equalTo("user",like.get("owner")); 
          getInterest.limit(1);
          var inLa = await getInterest.find({useMasterKey:true});
          if(inLa.length>0){
            var extraInfo = inLa[0];
            let lastlikes = extraInfo.get("lastlikes");
            let newLikes = [];
            newLikes.push(like.get("content"));
            for(const lik of lastlikes){
              if(newLikes.length<3){
                if(newLikes.indexOf(lik) < 0){
                  newLikes.push(lik);
                }
              }
            }
            
            extraInfo.set("lastlikes",newLikes);
            try{
              await extraInfo.save(null,{useMasterKey:true});
            }catch(err){}
      
          }
          else{
            var extraInfo = new ExtraUserInfo();
            extraInfo.set("user",like.get("owner"));
            extraInfo.set("lastlikes",[like.get("content")]);
            try{
              await extraInfo.save(null,{useMasterKey:true});
            }catch(err){}
          }
        }
      }
    }
  }
});

Parse.Cloud.afterSave("Post", async (request) => {
  main(request);
  async function main(request){
    if(!request.original){


      const post = request.object;
  
      
      const user = new Parse.User({id:post.get("user").id});
  
      const getIns = new Parse.Query("DeviceToken");
      getIns.equalTo("user",user);
      const insList = await getIns.find({useMasterKey:true});
  
  
     
  
      for(var i = 0; i < insList.length; i++){
        var message = {
          data: {
            type: 'postUploadComplete',
          image:""+post.get("media")[0].thumbnail.url(),
          postid:""+post.id,
          to:user.id+""
          },
            token: ""+insList[i].get("token")
          };
          try{
            await admin.messaging().send(message);
          }catch(err){
            try{
              await insList[i].destroy({useMasterKey:true});
            }catch(err){}
          }
      }
  
      //var pattern = /(^|[^\w])@([\w\_\.]+)/i;
  
      var mentionList = post.get("description").toLowerCase().match(/@[a-z0-9_\.]+/gi);
      if(mentionList.length>0){
  
        var i = 0;
        var newList = [];
        for(i=0;i<mentionList.length;i++){
          if(newList.indexOf(mentionList[i].replace("@","").trim())<0){
            newList.push(mentionList[i].replace("@","").trim());
          }
        }
        newList = newList.slice(0, 19);
        const getMents = new Parse.Query("_User");
        getMents.containedIn("username",newList);
        getMents.find({useMasterKey:true}).then((mentList) => {
          // The object was deleted from the Parse Cloud.
          if(mentList.length>0){
            var i = 0;
            var finalList = [];
            for(i=0;i<mentList.length;i++){
                const notif = new Notif();
                notif.set("type","mentionpost");
                notif.set("owner",user);
                
                notif.set("puser",post.get("user"));
                notif.set("post",post);
                if(post.get("type")==="image"){
                  var media = post.get("media")[0];
                  if(media.thumbnail!==undefined){
                    notif.set("mainmedia",media.thumbnail);
                  }
                }
                if(post.get("type")==="video"){
                  var media = post.get("media")[0];
                  if(media.thumbnail2!==undefined){
                    notif.set("mainmedia",media.thumbnail2);
  
                  }
                }
                if(post.get("description")!=null){
                  notif.set("description",post.get("description").substring(0,200));
                }
                notif.set("to",mentList[i]);
                try{
                  //notif.save(null,{useMasterKey:true});
                }catch(error){}
                finalList.push(notif);
            }
            Parse.Object.saveAll(finalList,{useMasterKey:true});
          }
  
        }, (error) => {
          // The delete failed.
          // error is a Parse.Error with an error code and message.
        });
      }
  
  
  
    }
    else{
      const post = request.object;
      if(request.object.get("reportable")===false&&request.original.get("reportable")===true){
        Parse.Cloud.run("removeDeletedPostReport", {"post":post.id},{useMasterKey:true});
      }
    }
  }
});

Parse.Cloud.afterSave("Comment", async (request) => {

  
  main(request);
  async function main(request) {
    if(!request.original){

      const query = new Parse.Query("Post");
      const post = await query.get(request.object.get("post").id,{useMasterKey:true});
  
      post.increment("commentnumber");
      try{
        await post.save(null,{useMasterKey:true});
      }catch(error){}
  
      const comment = request.object;
  
      const otherUserID = post.get("user").id;
      const otherUser = new Parse.User({id : otherUserID});
  
      user = new Parse.User({id:comment.get("user").id});
      if(user.id!==otherUserID&&comment.get("isreply")==="false"){
  
  
        const notif = new Notif();
        notif.set("type","commentpost");
        notif.set("owner",user);
        notif.set("comment",comment);
        notif.set("post",post);
        notif.set("to",otherUser);
        if(post.get("type")==="image"){
          var media = post.get("media")[0];
          if(media.thumbnail!==undefined){
            notif.set("mainmedia",media.thumbnail);
          }
          
        }
        if(post.get("type")==="video"){
          var media = post.get("media")[0];
          if(media.thumbnail2!==undefined){
            notif.set("mainmedia",media.thumbnail2);
          }
          
        }
  
        if(comment.get("description")!=null){
          notif.set("description",comment.get("description").substring(0,200));
        }
        try{
          await notif.save(null,{useMasterKey:true});
        }catch(error){}
      }
      var resUserId = "";
      if(comment.get("isreply")==="true"){
        const parentComment = new Parse.Object("Comment",{id:comment.get("parent").id});
        parentComment.increment("replycount");
        try{
          parentComment.save(null,{useMasterKey:true});
        }catch(error){}
        await parentComment.fetch({useMasterKey:true});
        const o2user = new Parse.User({id:parentComment.get("user").id});
  
        if(user.id!==o2user.id){
          const notif = new Notif();
          notif.set("type","replycomment");
          notif.set("owner",user);
          notif.set("comment",comment);
          notif.set("post",post);
          notif.set("to",o2user);
          resUserId = o2user.id;
          if(comment.get("description")!=null){
            notif.set("description",comment.get("description").substring(0,200));
          }
          try{
            await notif.save(null,{useMasterKey:true});
          }catch(error){}
        }
  
      }
  
      var pattern = /(^|[^\w])@([\w\_\.]+)/i;
  
  
      var mentionList = request.object.get("description").toLowerCase().match(pattern);
      if(mentionList.length>0){
  
        var i = 0;
        var newList = [];
        for(i=0;i<mentionList.length;i++){
          if(newList.indexOf(mentionList[i].replace("@",""))<0){
            newList.push(mentionList[i].replace("@",""));
          }
        }
  
        const getMents = new Parse.Query("_User");
        getMents.containedIn("username",newList);
        getMents.limit(20);
        const mentList = await getMents.find({useMasterKey:true});
  
          if(mentList.length>0){
            var i = 0;
            var finalList = [];
            for(i=0;i<mentList.length;i++){
              if(mentList[i].id !== resUserId){
                const notif = new Notif();
                notif.set("type","mentioncomment");
                notif.set("owner",user);
                notif.set("comment",comment);
                notif.set("puser",comment.get("puser"));
                notif.set("cuser",comment.get("cuser"));
                notif.set("post",post);
                notif.set("to",mentList[i]);
                if(post.get("type")==="image"){
                  var media = post.get("media")[0];
                  if(media.thumbnail!==undefined){
                    notif.set("mainmedia",media.thumbnail);
  
                  }
                }
                if(post.get("type")==="video"){
                  var media = post.get("media")[0];
                  if(media.thumbnail2!==undefined){
                    notif.set("mainmedia",media.thumbnail2);
  
                  }
                }
  
                if(comment.get("description")!=null){
                  notif.set("description",comment.get("description").substring(0,200));
                }
                try{
                  //notif.save(null,{useMasterKey:true});
                }catch(error){}
                finalList.push(notif);
              }
            }
            await Parse.Object.saveAll(finalList,{useMasterKey:true});
          }
      }
  
  
  
    }
  }

});

Parse.Cloud.afterSave("Report", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){
      const follow = request.object;
  
      const post = new Parse.Object("Post",{id:follow.get("post").id});
      post.increment("reportnumber");
      await post.save(null,{useMasterKey:true});
  
    }
  }
});

Parse.Cloud.afterSave("ReportComment", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){
      const follow = request.object;
  
      const post = new Parse.Object("Comment",{id:follow.get("comment").id});
      const user = new Parse.User({id:follow.get("owner").id});
      post.increment("reportnumber");
      await post.save(null,{useMasterKey:true});
      
    }
  }
});


Parse.Cloud.afterSave("Message", async (request) => {
  
  main(request);
  async function main(request) {
    if(!request.original){
      
      const message = request.object;
      const owner = message.get("owner");

      const chat = new Parse.Object("Chat",{id:message.get("chat")});
      chat.set("lastposter",owner);
      chat.set("lastedit",message.get("createdAt"));
      chat.set("read",false);
      chat.set("lastmessage",message.get("message"));
      try{
        await chat.save(null,{useMasterKey:true});
      } catch(err){}
      
    }
  }
});

Parse.Cloud.afterSave("Chat", async (request) => {
  
  main(request);
  async function main(request) {
    
      
      const chat = request.object;
      const owner = chat.get("lastposter");

      const userList = chat.get("users")
      
      for(const objecta of userList){
        if(objecta!==owner){
          const otherUser = new Parse.User({id:objecta});
          otherUser.increment("messages");
          //otherUser.increment("notifcount");
          await otherUser.save(null,{useMasterKey:true});
          
          const user = new Parse.User({id:owner});
          await user.fetch({useMasterKey:true});
          let ppurl = "";
          if(user.get("profilephotoprofile")!==undefined){
            ppurl = user.get("profilephotoprofile").url();
          }
          const getIns = new Parse.Query("DeviceToken");
          getIns.equalTo("user",otherUser);
          const insList = await getIns.find({useMasterKey:true});
          
          for(const tokens of insList){
            var message = {
             data: {
                type: 'sendyouamessage',
                fromwho: ""+owner,
                username: ""+user.get("username"),
                name: ""+user.get("namesurname"),
                image: ""+ppurl,
                message: ""+chat.get("lastmessage"),
                to:otherUser.id+""
              },
                token: ""+tokens.get("token")
              };
              try{
                await admin.messaging().send(message);
              }catch(err){
                console.log(err);
                try{
                  await tokens.destroy({useMasterKey:true});
                }catch(err){}
              }
          }
        }
      }
    
  }
});

