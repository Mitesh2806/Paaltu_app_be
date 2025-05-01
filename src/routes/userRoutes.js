// routes/userRoutes.js
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import protectRoute from '../middleware/auth.middleware.js';
import User from '../models/User.js';

const router = express.Router();

// — Multer setup: keep file in memory buffer —
const upload = multer({ storage: multer.memoryStorage() });

// — Helper: upload a Buffer to ImgBB and return the public URL —
async function uploadBufferToImgBB(buffer, apiKey) {
  const form = new FormData();
  form.append('image', buffer.toString('base64'));
  form.append('name', 'profile-image');

  const res = await fetch('https://api.imgbb.com/1/upload?key=0aec06918a9326fc94e8f28387c4b600', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ImgBB upload failed: ${errText}`);
  }

  const { data } = await res.json();
  return data.url;
}

// — PUT /api/user/update —
// Expects multipart/form-data with optional file field "profileImage"
// and text field "address". Authenticated users only.
router.put(
  '/update',
  protectRoute,
  upload.single('profileImage'),
  async (req, res) => {
    try {
      // req.user.id should be set by protectRoute
      const userId = req.user.id;
      const { address } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 1) If a new image was uploaded, push it to ImgBB
      if (req.file) {
        const IMGBB_KEY = process.env.IMGBB_API_KEY;
        if (!IMGBB_KEY) {
          return res
            .status(500)
            .json({ error: 'Missing IMGBB_API_KEY in environment' });
        }

        // convert buffer → URL
        const imageUrl = await uploadBufferToImgBB(
          req.file.buffer,
          IMGBB_KEY
        );
        user.profileImage = imageUrl;
      }

      // 2) Only update address if provided
      if (address !== undefined) {
        user.address = address;
      }

      await user.save();
      return res.json({ message: 'Profile updated', user });
    } catch (err) {
      console.error('Error in /api/user/update:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
