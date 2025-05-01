import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
const router = express.Router();

const generateToken = (userId) => {
   return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "10d"});
}

router.post("/register", async(req, res) => {
  try {
    const {email, username, password} = req.body;
    
    // Validation
    if(!email || !username || !password) {
      return res.status(400).json({message: "All fields are required"});
    }
    if(password.length < 6) {
      return res.status(400).json({message: "Password must be at least 6 characters"});
    }
    if(username.length < 3) {
      return res.status(400).json({message: "Username must be at least 3 characters"});
    }
    
    // Check for existing user
    const existingEmail = await User.findOne({email});
    if(existingEmail) {
      return res.status(400).json({message: "Email already exists"});
    }
    
    const existingUsername = await User.findOne({username});
    if(existingUsername) {
      return res.status(400).json({message: "Username already exists"});
    }
    
    // Create new user
    const profileImage = "https://i.postimg.cc/9FqkDfMd/149071.png";
    const user = new User({
      email,
      username,
      password,
      profileImage
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    // Send response
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
    console.error("Registration error:", error);
    res.status(500).json({message: "Internal Server Error"});
  }
});

router.post("/login", async(req, res) => {
    try {
       const {email, password} = req.body;
       
       // Validation
       if(!email || !password) {
           return res.status(400).json({message: "All fields are required"});
       }
       
       // Find user
       const user = await User.findOne({email});
       if(!user) {
           return res.status(400).json({message: "Invalid email or password"});
       }
       
       // Check password
       const isPasswordCorrect = await user.comparePassword(password);
       if(!isPasswordCorrect) {
           return res.status(400).json({message: "Invalid email or password"});
       }
       
       // Generate token
       const token = generateToken(user._id);
       
       // Send response
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
        console.error("Login error:", error);
        res.status(500).json({message: "Internal Server Error"});
    }
});

export default router;