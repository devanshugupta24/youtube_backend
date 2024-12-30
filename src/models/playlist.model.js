import mongoose,{Schema} from "mongoose";

const playlistSchema=new Schema({
    video:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ], 
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})

export const Playlist=mongoose.model("Playlist",playlistSchema)