const login = require("facebook-chat-api");
const fetch = require("node-fetch")
const chrono = require("chrono-node");
const { DateTime } = require("luxon");
require('dotenv').config();

const credentials = {
    email: process.env.FB_EMAIL,
    password: process.env.FB_PASSWORD
}

function convertDate(d){
    var parts = d.split(" ");
    var months = {Jan: "01",Feb: "02",Mar: "03",Apr: "04",May: "05",Jun: "06",Jul: "07",Aug: "08",Sep: "09",Oct: "10",Nov: "11",Dec: "12"};
    return parts[3]+"-"+months[parts[1]]+"-"+parts[2];
}
   


async function getFieldAvailability( date ,roomID = "2163" ) {
    const response = await fetch("https://ems.drexel.edu/EMSwebapp/ServerApi.aspx/GetLocationDetailsAvailability", 
        {"credentials":"include",
        "headers":{"accept":"application/json, text/javascript, */*; q=0.01",
        "accept-language":"en-US,en;q=0.9,fr;q=0.8",
        "content-type":"application/json; charset=UTF-8",
        "dea-csrftoken":"db0881df-692a-4c4b-a14b-e1fe5fba7d91",
        "sec-fetch-mode":"cors","sec-fetch-site":"same-origin",
        "x-requested-with":"XMLHttpRequest"},
        "referrer":"https://ems.drexel.edu/EMSwebapp/BrowseForSpace.aspx",
        "referrerPolicy":"no-referrer-when-downgrade",
        "body":`{\"roomId\":${roomID},\"start\":\"${date}T04:00:00.000Z\",\"end\":\"${date}T04:00:00.000Z\"}`,
        "method":"POST","mode":"cors"});
        
    let jsons = await response.json();
    console.log(jsons);
    
    let bookings = JSON.parse(JSON.parse(jsons.d).JsonData).bookings
    console.log(bookings);
    
    // let requested = []
    let formatedDate = DateTime.fromISO(date).toFormat('LLL dd')
    let message = `Here is the schedule for ${formatedDate}\n`
    for (const booking of bookings) {
        let start = formatTime(booking.Start.match(/[0-2][0-9][:][0-5][0-9]/)[0])
        let end = formatTime(booking.End.match(/[0-2][0-9][:][0-5][0-9]/)[0])
        let finAdd = `Taken ${start} - ${end}\n`
        if (booking.Start.includes(date)){
            if (message.includes(finAdd) == false) {
                message += `Taken ${start} - ${end}\n`
            }
        }
    }
    return message
}

// extract time and covert it to us standard
const formatTime = (t) =>{
    t = t.split(':');
    const hours = parseInt(t[0]);
    let suffix = hours >= 12 ? "PM":"AM"; 
    return (((hours + 11) % 12 + 1) + ":" + t[1] + suffix); 
}

// return array containing schedule for today and tomorrow
// function extractHoursForEachDay(day, refe = "today") {
//     let full = ""
//     if (refe == "today"){
//         full += "Here's the schedule for today\n"
//     }
//     else{
//         full += "Here's the schedule for tomorrow\n"
//     }
//     for (let item of day){
//         let start = formatTime(item.Start.match(/[0-2][0-9][:][0-5][0-9]/)[0])
//         let end = formatTime(item.End.match(/[0-2][0-9][:][0-5][0-9]/)[0])
//         let finAdd = `Taken ${start} - ${end}\n`
//         if (full.includes(finAdd) == false) {
//             full += `Taken ${start} - ${end}\n`
//         }
//     }
//     return full
// }

login(credentials, (err, api) => {

    if(err) return console.error(err);

    api.setOptions({
        logLevel: "warn",   
        listenEvents: true,
        forceLogin: true
      });
    
    // fetch field data from server
    // let testing = fetch('http://134.209.214.62/')
    // .then(res => res.json())
    // .then((json) => {
    //     let listOfschByDay = []
    //     for (let days in json) {
    //         let toLoop = json[days]
    //         if (days == "today") {
    //             todayFullSchedule = extractHoursForEachDay(toLoop);
    //             listOfschByDay.push([todayFullSchedule])
    //         } else if (days == "tomorow") {
    //             tomorowFullSchedule = extractHoursForEachDay(toLoop, "tomorrow");
    //             listOfschByDay.push([tomorowFullSchedule])
    //         }
            
    //     }
    // return listOfschByDay
    // });
    // Listen for incoming messages and send schedule
    api.listenMqtt( async (err, message) => {
        // let response = await testing
        if (message.body) {
            if (message.body.includes("@Buckley Bot")) {
                api.getUserInfo(message.senderID, (err, usr)=>{
                    if (message.senderID) {
                        let tmp = usr[message.senderID].name
                        if (chrono.parseDate(message.body) != null) {
                            let extractedDate = chrono.parseDate(message.body)
                            let d = convertDate(extractedDate.toString())
                            api.sendMessage(`Hello ${tmp.split(" ")[0]} 👋`, message.threadID);
                            setTimeout(async () => {  
                                api.sendMessage(await getFieldAvailability(d), message.threadID);
                            }, 500);
                            
                        }else{
                            let execpMsg = `🤷 ! ${tmp.split(" ")[0]} I didn't quite get the day you're looking for`
                            let exMsg = "As an exemple you could ask \"@Buckley Bot what the schedule for next Monday\""
                            setTimeout(async () => {  
                                api.sendMessage(execpMsg , message.threadID);
                            }, 500);
                            setTimeout(async () => {  
                                api.sendMessage(exMsg, message.threadID);
                            }, 600);

                        }
                    }
                })
            }
        }
    });
});