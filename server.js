// IMPORTING THE REQUIRED FILE DIRECTORIES IN THE WORK SPACE
import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
import userModel from './src/models/user.js';
import eventModel from './src/models/Event.js';
import connectDb from './src/config/database.js';
import { connect } from "mongoose";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import user from "./src/models/user.js";

// CREATING AN INSTANCE OF THE BOT
const bot = new Telegraf(process.env.BOT_TOKEN);

// ESTABLISHING CONNECTION WITH THE OPENAI KEY API
// const openai = new OpenAI({
//       apiKey: process.env['OPENAI_API_KEY'],
// });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// CONNECTION WITH THE DATABASE ~ MONGODB
try {
      connectDb();
      console.log("CONNECTION TO THE DATABASE IS SUCCESSFUL! WAITING FOR FURTHER INSTRUCTIONS.");
} catch(err) {
      console.log(err);
      process.kill(process.pid, 'SIGTERM'); // Killing the process and ensuring a proper shut down of the bot.
}

// HIGHER ORDER ~ Priority value is highest.
// INITIATING THE BOT USING THE START COMMAND 
bot.start(async(ctx) => {

      // SAVING THE USER INFORMATION FROM THE CONTEXT 
      const from = ctx.update.message.from;

      //  ERROR HANDLING 
      try {
            await userModel.findOneAndUpdate({
                  telegramID: from.id // A telegram id will be created and if created it will be updated further.
            },

            {     // Defining the database Schema and inserting the values within the fields.
                  $setOnInsert: {
                        firstName: from.first_name,
                        lastName: from.last_name,
                        isBot: from.is_bot,
                        username: from.username
                  }
            },
      
            {
                  upsert: true,
                  new: true
            }); // This creates the model only when the user has initiated the conversation with the bot. This method uses a parameter called 'upsert' that will be checking  which is created if it's not there and if its there then it will be simply updated.

                  // STATING THE REPLY FROM THE BOT -> USER
                  await ctx.reply(
                        `Hey there! ${from.first_name}😁, Welcome to this chat💭. I will be your host and guide in writing all your social-media posts✍🏻.\nLet me know what are you upto or what have you already done and I will be considering everything while creating the best post for you🧭.\nLet's get viral on social media.🧲`
                  );
      } catch(err) {
            // LOGGING THE ERROR 
            console.log(err);
            await ctx.reply(
                  `Well ${from.first_name} I am having trouble chatting with you right now 🤧! Developer is sleeping 🥴.`
            )
      }


      //  DEBUG CONSOLE 
      console.log('ctx', ctx);
      console.log('form', from);

});

// INTERMEDIATE ORDER ~ Priority is somewhat equal as generate command
bot.command('help', async(ctx) => {
      // SAVING THE USER INFORMATION FROM THE CONTEXT 
      const from = ctx.update.message.from;

      ctx.reply(`Hello ${from.first_name} 👋. I am here to guide you though tough times 🫡. I know its hard to think and write for your each and every social-media posts 🤔. Well your personal bot is here, just follow these steps to use me properly: \n
      STEP 1 : Type the command /start to initiate me 😏. \n
      STEP 2 : Once I am ready you can start sharing your thoughts and I will write it down in my personal diary ✍️.\n
      STEP 3 : Once you are all caught up just type the command /generate 🚀.\n
      STEP 4 : Grab a candy and just get ready to copy and paste 😉.`)
});


// HIGHER ORDER ~ Priority value high then messages
// CREATING CUSTOM COMMANDS FOR THE BOT 
// GENERATE COMMAND : /generate FOR GENERATING THE POST DETAILS FOR THE USER 
bot.command('generate', async(ctx) => {

      const from = ctx.update.message.from;

      // ADDING A MESSAGE GENERATING MESSAGE 
      const { message_id: waitingMessageID } = await ctx.reply(
            `On it boss 😏! Grab a candy 🍭 while I am  generating  the post for you.`
      );

      // ADDING THE STICKER
      const { message_id: loadingSticker } = await ctx.replyWithSticker(
            `CAACAgIAAxkBAAIBYGZDsLbepeKXHkr-0R3a3HK_guyPAAIcBAACfvLFDAABz3iuNXl3qzUE`
      );

      // SETTING THE TIME-FRAME FOR THE EVENTS
      const start_of_the_day = new Date();
      start_of_the_day.setHours(0,0,0,0); // Signifies the start of the day i.e, 12 midnight.

      const end_of_the_day = new Date();
      end_of_the_day.setHours(23,59,59,999); // Signifies the end of the day i.e, before completing one full 24hrs cycle.


      // * FETCHING THE USER EVENTS AND SEND IT TO THE OPENAI API SERVER FOR GENERATION ~ Only events occurred in a single day will be counted and sent to the sever.
      const events = await eventModel.find({
            telegramID: from.id,
            createdAt: {
                  $gte: start_of_the_day,
                  $lte: end_of_the_day
            }
      });

      // CHECKING IF THE EVENTS ARE PROVIDED OR NOT BY THE USER
      if ( events.length === 0 ) {
            await ctx.deleteMessage(waitingMessageID);
            await ctx.deleteMessage(loadingSticker);

            await ctx.reply(`${from.first_name} you are all caught up for today ✅.\n I am all free nothing to generate for now🥱. \nType your thoughts and I will get to work again 🚀!`);
            return;
      }

      console.log('events', events);

      //  * GOOGLE GEMINI-API REPLY , RESPONSE WILL BE GENERATED TO THE USER THROUGH THE BOT - > USER.
      async function run() {
                  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

                  // PREVIOUS PROMPT
                  const prompt = `Write like human, for humans. Craft four engaging social media posts tailored for linkedin, facebook,  X and instagram audiences. Use simple language. Use given time labels just to understand the order of the events, please also do not mention the time of the events. Ensure that none of the events are missed. Combine all the events given into every single post. Each post should creatively highlight the all the events. Ensure the tone is conversational, impactful and use relevant emojis to make the post more eye catching. Focus on engaging the respective platform's audience, encouraging interactions, and focusing on driving interests on the event using proper and appropriate hashtags for making the post more seen around the world: 
                  ${events.map((event) => event.text).join(', ')}`;

            
                  try {
                        const result = await model.generateContent(prompt);
                        const response = await result.response;

                        // * STORING THE TOKEN COUNT.
                        await userModel.findOneAndUpdate({
                              telegramID: from.id,

                        }, {
                              $inc: {
                                    promptTokenCount: response.usageMetadata.promptTokenCount,
                                    candidatesTokenCount: response.usageMetadata.candidatesTokenCount
                              }
                        });

                        if (response && response.text) {
                              const text = response.text();
                              if (text) {
                                    // REPLYING BY THE BOT -> USER
                                    await ctx.deleteMessage(waitingMessageID);
                                    await ctx.deleteMessage(loadingSticker);
                                    ctx.reply(text);

                                    // LOGGING THE CONSOLE
                                    console.log(response);
                                    console.log(result);
                              } else {
                                    // Handle the case where the response text is empty
                                    ctx.reply(`Sorry ${from.first_name} I am unable to fetch the required results at this current moment 😓`);
                              }   
                        } else {
                              // Handle the case where the response is not available
                              ctx.reply(`Sorry ${from.first_name}, the developer screwed it up somewhere 😬. Wait and comeback again 🛐!`);
                        } 
                  } catch (error) {
                        // Handle any errors that occur during the API call
                        ctx.reply(`Uff! Fatal error encountered and developer walked away 🛠️☠️!`);
                  }
            }
            // INITIATING THE ASYNC FUNCTION THROUGH THE run() FUNCTION.
            run();
});

// GETTING THE STICKER 
bot.on(message('sticker'), (ctx) => {
      console.log('sticker', ctx.update.message);
});

// LOWER ORDER ~ Priority value is less then the commands
// TRAINING THE BOT FOR RECEIVING COMMANDS FROM THE USER
bot.on(message('text'), async(ctx) => {
      const from = ctx.update.message.from;
      const message = ctx.update.message.text;

      try {
            await eventModel.create({
                  text: message,
                  telegramID: from.id
            });

            // STATING THE REPLY FROM BOT -> USER
            await ctx.reply(`Got it good job 🤝. \n Just keep texting me and I will write everything down in my personal dairy 📒! \nWhenever you are ready to generate just type the command : /generate.`);

      } catch(err) {
            console.log(err);
            await ctx.reply(
                  `Well ${from.first_name} I am having trouble chatting with you right now 🤧! Developer is sleeping 🥴.`
            );
      }

      // DEBUGGING 
      console.log(ctx);

});


// LAUNCHING THE BOT 
bot.launch();

// GRACEFUL SHUTDOWN
process.once('SIGINT', ()=> bot.stop('SIGINT'));
process.once('SIGTERM', ()=> bot.stop('SIGTERM'));