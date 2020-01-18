const login = require("facebook-chat-api");
const fetch = require("node-fetch")
require('dotenv').config();

const credentials = {
    email: process.env.FB_EMAIL,
    password: process.env.FB_PASSWORD
}

// extract time and covert it to us standard
const formatTime = (t) =>{
    t = t.split(':');
    const hours = parseInt(t[0]);
    let suffix = hours >= 12 ? "PM":"AM"; 
    return (((hours + 11) % 12 + 1) + ":" + t[1] + suffix); 
}

// return array containing schedule for today and tomorrow
function extractHoursForEachDay(day, refe = "today") {
    let full = ""
    if (refe == "today"){
        full += "Here's the schedule for today\n"
    }
    else{
        full += "Here's the schedule for tomorrow\n"
    }
    for (let item of day){
        let start = formatTime(item.Start.match(/[0-2][0-9][:][0-5][0-9]/)[0])
        let end = formatTime(item.End.match(/[0-2][0-9][:][0-5][0-9]/)[0])
        let finAdd = `Taken ${start} - ${end}\n`
        if (full.includes(finAdd) == false) {
            full += `Taken ${start} - ${end}\n`
        }
    }
    return full
}

login(credentials, (err, api) => {

    if(err) return console.error(err);

    api.setOptions({
        logLevel: "warn",   
        listenEvents: true,
        forceLogin: true
      });
    
    // fetch field data from server
    let testing = fetch('http://134.209.214.62/')
    .then(res => res.json())
    .then((json) => {
        let listOfschByDay = []
        for (let days in json) {
            let toLoop = json[days]
            if (days == "today") {
                todayFullSchedule = extractHoursForEachDay(toLoop);
                listOfschByDay.push([todayFullSchedule])
            } else if (days == "tomorow") {
                tomorowFullSchedule = extractHoursForEachDay(toLoop, "tomorrow");
                listOfschByDay.push([tomorowFullSchedule])
            }
        }
    return listOfschByDay
    });
    // Listen for incoming messages and send schedule
    api.listenMqtt( async (err, message) => {
        let response = await testing
        if (message.body) {
            if (message.body.includes("@Buckley Bot")) {
                api.getUserInfo(message.senderID, (err, usr)=>{

                    if (message.senderID) {
                        let tmp = usr[message.senderID].name
                        api.sendMessage(`Hello ${tmp.split(" ")[0]} 👋`, message.threadID);
                        setTimeout(() => {  
                            api.sendMessage(response[1][0], message.threadID);
                         }, 500);
                    }
                })
            }
        }
    });
});