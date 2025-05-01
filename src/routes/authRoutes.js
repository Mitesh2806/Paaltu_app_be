import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';






const router = express.Router();
const generateToken = (userId)=>{
   return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "10d"});
}

router.post("/register", async(req, res) => {
  try {
    const {email, username, password} = req.body;
    if(!email || !username || !password) {
      return res.status(400).json({error: "All fields are required"});
    }
    if(password.length < 6) {
      return res.status(400).json({error: "Password must be at least 6 characters"});
    }
    if(username.length < 3) {
      return res.status(400).json({error: "Username must be at least 3 characters"});
    }
    const existingEmail = await User.findOne({email});
    if(existingEmail) {
      return res.status(400).json({error: "Email already exists"});
    }
    const existingUsername = await User.findOne({username});
    if(existingUsername) {
      return res.status(400).json({error: "Username already exists"});
    }

    const profileImage ="https://i.postimg.cc/9FqkDfMd/149071.png";


    const user = new User({
      email,
      username,
      password,
      profileImage
    });
    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
        }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
    
  }
});

router.post("/login", async(req, res) => {
    try {
       const {email, password} = req.body;
       if(!email || !password) {
           return res.status(400).json({error: "All fields are required"});
       }
       const user = await User.findOne({email});
       if(!user) {
           return res.status(400).json({error: "User does not exist"});
       }
       const isPasswordCorrect = await user.comparePassword(password);
       if(!isPasswordCorrect) {
           return res.status(400).json({error: "Invalid credentials"});
       }

       const token = generateToken(user._id);
       res.status(200).json({
           token,
           user: {
               id: user._id,
               username: user.username,
               email: user.email,
               profileImage: user.profileImage
           }
       });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
        
    }
});

export default router;