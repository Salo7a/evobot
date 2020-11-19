const { play } = require("../include/play");
const ytdl = require("ytdl-core");
const scdl = require("soundcloud-downloader");
const mongoose = require('mongoose')
const PlaylistSchema = require('../include/PlaylistSchema')
const Playlist = mongoose.model('Playlist', PlaylistSchema, 'Playlist')
const {findPlaylist, FindOrCreate} = require("../include/PlaylistFunctions")
let YOUTUBE_API_KEY, SOUNDCLOUD_CLIENT_ID,connectionString;
try {
  const config = require("../config.json");
  YOUTUBE_API_KEY = config.YOUTUBE_API_KEY;
  SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;
  connectionString = config.connectionString;
} catch (error) {
  YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
  connectionString = process.env.connectionString;
}
const connector = mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true })
module.exports = {
  name: "Add To Playlist",
  cooldown: 3,
  aliases: ["listadd"],
  description: "Adds Songs To A Custom Playlist",
  async execute(message, args) {
    const { channel } = message.member.voice;
    const videoPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
    let list = await FindOrCreate(args[0]);
    if (!list ) return message.reply("Playlist Doesn't Exist And Couldn't Be Created").catch(console.error);
    // Start the playlist if playlist url was provided
    let num = 0;
    for (let i = 1; i < args.length; i++) {
      if (videoPattern.test(args[i]) || scRegex.test(args[i])){
        let songInfo = null;
        let song = null;
        if (videoPattern.test(args[i])) {
          try {
            songInfo = await ytdl.getInfo(args[i]);
            song = {
              title: songInfo.videoDetails.title,
              url: songInfo.videoDetails.video_url,
              duration: songInfo.videoDetails.lengthSeconds
            };
          } catch (error) {
            console.error(error);
            message.reply(error.message).catch(console.error);
          }
        } else if (scRegex.test(args[i])) {
          try {
            const trackInfo = await scdl.getInfo(args[i], SOUNDCLOUD_CLIENT_ID);
            song = {
              title: trackInfo.title,
              url: trackInfo.permalink_url,
              duration: Math.ceil(trackInfo.duration / 1000)
            };
          } catch (error) {
            console.error(error);
            message.reply(error.message).catch(console.error);
          }
        }
        if (song){
          list.Songs.push(song.url);
          list.SongsNames.push(song.title);
          list.SongsDuration.push(song.duration);
          num++;
        }

      }
    }
    await list.save();
    message.reply(`${num} Songs Saved Successfully To ${args[0]} Playlist`)
  }
};
