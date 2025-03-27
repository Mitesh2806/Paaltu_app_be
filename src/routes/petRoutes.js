import express from 'express';
import Pet from '../models/Pet.js';
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();


router.post("/add", protectRoute, async (req, res) => {
    try {
      const { name, breed, sex, age, weight, image, description } = req.body;
  
      if (!name || !breed || !sex || !age || !weight || !image) {
        return res.status(400).json({ error: "All fields are required" });
      }
      let imageUrl
      // Upload image to Cloudinary
      const uploadImageResponse = await cloudinary.uploader.upload(image);
     imageUrl = uploadImageResponse.secure_url;
  
      // Create the pet
      const newPet = new Pet({
        name,
        breed,
        sex,
        age,
        weight,
        image: imageUrl,
        description,
      });
      await newPet.save();
  
      // Add pet to the user’s pets array
      const user = req.user; // because protectRoute sets req.user
      user.pets.push(newPet._id);
      await user.save();
  
      res.status(201).json(newPet);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  


router.get("/:id", async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id)
            .populate("poster", "username profileImage");
        if (!pet) {
            return res.status(404).json({ error: "Pet not found" });
        }
        res.status(200).json(pet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.delete("/:id", protectRoute, async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);
        if (!pet) {
            return res.status(404).json({ error: "Pet not found" });
        }
       
        if (pet.poster.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this pet" });
        }
       
        if (pet.image && pet.image.includes("cloudinary")) {
            try {
                const publicId = pet.image.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.log("Error deleting image", deleteError);
            }
        }
        await pet.deleteOne();
        res.status(200).json({ message: "Pet deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
