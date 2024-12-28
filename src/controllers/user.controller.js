import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/APIError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken"



const generateAccessAndRefreshToken= async (userId)=>{
    try {
        const user=await User.findById(userId)
       // console.log("user is correct")
        const accessToken=user.generateAccessToken()
        //console.log("AT is correct")
        const refreshToken=user.generateRefreshToken()
        //console.log("RT is correct")

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


const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400,"unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user=User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}= await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})


const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, " invalid password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{}," Password changed successfully"))
})


const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user," current user fetched successfully"))
})


const updateAccountDetails= asyncHandler(async(req,res)=>{
    const {fullName,email}= req.body
    if(!fullName && !email){
        throw new ApiError(400,"All fields are required")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400," avatar file is missing")
    }
    const avatar =await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar on cloudinary")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar updates successfully"))
})


const updateUserCoverImage= asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400," cover image file is missing")
    }
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image on cloudinary")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updates successfully"))
})


const getUserChannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([
        {
            $match:{    //used to take only username from User to next stage
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{    //used to connect id of user with channel of subscription model
                from:"subscriptions",
                localField:"_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{     //used to connect id of user with subscriberb of subscription model
                from:"subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as:"subscriberdTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
           $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1 
           }
        }
    ])


    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json( new ApiResponse(200,channel[0],"user channel fetched successfully"))

 })


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
    
} 