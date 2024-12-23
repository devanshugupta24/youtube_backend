import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/APIError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/APIResponse.js";


const registerUser=asyncHandler (async (req,res)=>{
     // get user details from frontend
     // validation -not empty
     // check if user already exists: username,email
     // check for images, check for avatar
     // upload them to cloudinary, avatar
     // create user object - create entry in db 
     // remove password and refresh token field from response
     // check for user creation 
     // return response


// get user details from frontend
    const { fullName, email, username,password } = req.body
    console.log("email" , email)

// validation -not empty
    if(
        [fullName,email,username,password].some((field)=>   // if(fullName.trim() ==="") throw new ApiError(400,"full name is required")
        field?.trim()==="")                                 // if(email.trim()==="") throw new ApiError(400,"email is required")
    ){                                                      // to make it short we used if([.....some]) it means if any of the field exists then after trimming field.trim ==="" then throw new error
        throw new ApiError(400,"All fields are required")
    }

// check if user already exists: username,email
    const existedUser=User.findOne({
        $or: [{username},{email}]  //used to search in User whether same username or email exists
    })

    if(existedUser){  //if same username or email exists
        throw new ApiError(409,"Email or Username already exists")
    }

// check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

// upload them to cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, " avatar is required")
    }
 
// create user object - create entry in db 

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:User.toLowerCase()
    })

// remove password and refresh token field from response

    const createdUser= await User.findById(user._id).select(  // .findById is used to check whether user is created or not as mongoose gives unique id to every entry 
        "-password -refreshToken"  //.select by default selects all the entity so we use -password to deselect that entity
    )

// check for user creation

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

// return response

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
    
})

export {
    registerUser,
} 