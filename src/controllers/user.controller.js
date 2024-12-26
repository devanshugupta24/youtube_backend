import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/APIError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/APIResponse.js";



const generateAccessAndRefreshToken= async (userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken  //saving refresh token in database
        await  user.save({validateBeforeSave: false})

        return {accessToken,refreshToken }

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")      
    }
}


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
    //console.log("email" , email)

// validation -not empty
    if(
        [fullName,email,username,password].some((field)=>   // if(fullName.trim() ==="") throw new ApiError(400,"full name is required")
        field?.trim()==="")                                 // if(email.trim()==="") throw new ApiError(400,"email is required")
    ){                                                      // to make it short we used if([.....some]) it means if any of the field exists then after trimming field.trim ==="" then throw new error
        throw new ApiError(400,"All fields are required")
    }

// check if user already exists: username,email
    const existedUser=await User.findOne({
        $or: [{username},{email}]  //used to search in User whether same username or email exists
    })

    if(existedUser){  //if same username or email exists
        throw new ApiError(409,"Email or Username already exists")
    }
   //  console.log(req.files)

// check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)
    && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }


    if(!avatarLocalPath){       
        throw new ApiError(400,"Avatar file is required")
    }

// upload them to cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){

        throw new ApiError(400, "Avatar upload failed");
    }
  
// create user object - create entry in db 

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
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


const loginUser=asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation of username and email -not empty
    //check if the username is already registered or not 
    //password check
    //access and refresh token 
    //return response


//get user details from frontend
    const {email,password,username} = req.body

//validation of username and email -not empty
    if(!(username||email)){
        throw new ApiError(400,"username or email is required")
    }

//check if the username or email  is already registered or not 
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user doesn't exist ")
    }

//password check
    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"password incorrect")
    }

//access and refresh token
   const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id)

//return response
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

//sending cookies
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )

})


const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )


    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
    
})

export {
    registerUser,
    loginUser,
    logoutUser
} 