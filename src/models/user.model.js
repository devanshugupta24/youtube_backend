import mongoose , {Schema} from "mongoose"
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username:{
            type:String,
            required: true,
            unique: true,
            lowercase: true,
            trim : true,
            index: true,
        },
        email:{
            type:String,
            required: true, 
            unique: true,
            lowercase: true,
            trim : true,
        },
        fullName:{
            type:String,
            required: true,
            trim : true,
            index: true,
        },
        avatar:{
            type:String,   //cloudinary url
            required: true,
        },
        coverImage:{
            type:String,     //cloudinary url
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,'Password is required']
        },
        refreshToken:{
            type:String,
        }
    },
    {
        timestamps:true
    }
)

userSchema.pre("save",async function (next) {                                  //bcryption of password whenever there is change in the password
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next()
}) 
 
userSchema.methods.isPasswordCorrect = async function(password){                       //created custom hook for comparing original password with bcrypted password 
    return await bcrypt.compare(password,this.password)
}

// userSchema.methods.generateAccessToken= function(){                         //created custom hooks to generate access token 
//     return jwt.sign(
//         {
//             _id:this._id,
//             email:this.email,
//             username:this.username,
//             fullName:this.fullNamed,
            

//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         {
//             expiresIn: process.env.ACCESS_TOKEN_EXPIRY
//         },
       
//     )
// }

userSchema.methods.generateAccessToken = function () {
    try {
      return jwt.sign(
        {
          _id: this._id,
          email: this.email,
          username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
      );
    } catch (err) {
      console.error("Error generating access token:", err);
      throw new Error("Failed to generate access token");
    }
  };
  

userSchema.methods.generateRefreshToken=function(){                              //created custom hooks to generate refresh token 
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)