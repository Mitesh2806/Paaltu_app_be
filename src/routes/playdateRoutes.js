import express from 'express';
import Playdate from "../models/Playdate.js";
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();
router.post("/create", protectRoute, async(req, res) => {
    try {
      const { title, duration, access, location, attractions, image, date } = req.body;

      
      if (typeof duration !== 'number') {
        return res.status(400).json({ 
          error: "Invalid duration format",
          message: "Duration must be a number"
        });
      }
      
      // Validate required fields
      const requiredFields = ['title', 'duration', 'access', 'location', 'image', 'date'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: "Missing required fields",
          missingFields 
        });
      }
  
      // Handle image upload
      let imageUrl;
      try {
        const uploadImageResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadImageResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }
  
      // Create new playdate
      const newplaydate = new Playdate({
        title,
        duration,
        access,
        date: new Date(date),
        location,
        attractions: Array.isArray(attractions) ? attractions : [attractions],
        image: imageUrl,
        poster: req.user._id
      });
  
      await newplaydate.save();
      res.status(201).json(newplaydate);
  
    } catch (error) {
      console.error("Error in /create:", error);
      res.status(500).json({ 
        error: "Internal Server Error",
        message: error.message 
      });
    }
  });

router.get("/", protectRoute, async(req, res) => {
    try {
        const playdates = await Playdate.find().sort({createdAt: -1}).populate("poster", "username profileImage");
        res.send(playdates);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});
router.get("/:id", async(req, res) => {
    try {
        const playdate = await Playdate.findById(req.params.id).populate("poster", "username profileImage");
        if(!playdate) {
            return res.status(404).json({error: "Playdate not found"});
        }
        res.status(200).json(playdate);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// PUT /api/playdates/:id/join
router.put('/:id/join', protectRoute, async (req, res) => {
    try {
      const playdate = await Playdate.findById(req.params.id);
      
      if (!playdate) {
        return res.status(404).json({ error: 'Playdate not found' });
      }
  
      // Check if user already joined
      if (playdate.participants.includes(req.user._id)) {
        return res.status(400).json({ error: 'User already joined' });
      }
  
      // Add user to participants
      playdate.participants.push(req.user._id);
      await playdate.save();
  
      res.json(playdate);
    } catch (error) {
      console.error('Error joining playdate:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

router.delete("/:id", protectRoute, async(req, res) => {
    try {
        const playdate = await Playdate.findById(req.params.id);
        if(!playdate) {
            return res.status(404).json({error: "Playdate not found"});
        }
        if(playdate.poster.toString() !== req.user._id.toString()) {
            return res.status(401).json({error: "You are not authorized to delete this playdate"});

        }
        if(playdate.image && playdate.image.includes("cloudinary")){
            try {
                const publicId = playdate.image.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId);
                
            } catch (deleteError) {
                console.log("Error deleting image", deleteError);
              
            }
        }
        await playdate.deleteOne();
        res.status(200).json({message: "Playdate deleted successfully"});
        
    } catch (error) {
        console.log("Error deleting book", error);

        
    }
});

router.get("/poster",protectRoute, async(req, res)=>{
    try {
        const playdatesByPoster = await Playdate.find({user: req.user._id}).sort({createdAt:-1});
        res.json(playdatesByPoster);

    } catch (error) {

        console.error("Get user playdates error:", error.message);
        res.status(500).json({message:"Server Error"});
    }
})
export default router;