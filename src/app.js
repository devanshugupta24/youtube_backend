import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))  //to limit the amount of json file received 
app.use(express.urlencoded({extended:true,limit:"16kb"}))   //to tell server if any url has some symbols encoded then please samaj jana
app.use(express.static("public"))   //is we want to store some temp images etc in seerver then store it in public folder
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter)

// http://localhost:8000/api/v1/users/register

export {app}