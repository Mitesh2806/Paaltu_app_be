import cron from "cron";
import https from "https";
import "dotenv/config";

const job = new cron.CronJob("*/14 * * * *", function(){
        https.get(process.env.API_URL, (res)=>{
            if(res.statusCode === 200){
                console.log("API is up and running");
            }else{
                console.log("API is down");
            }
        })
        .on("error", (err)=>{
            console.log("Error while sending request", err);
        })
    });

    export default job;