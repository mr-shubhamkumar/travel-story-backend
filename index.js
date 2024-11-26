require("dotenv").config();
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const express = require("express");
const { authenticateToken } = require("./utilities");
const User = require("./models/usermodel");
const TravelStory = require("./models/travelStory.model");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");

require("./db/database_connection");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors({ origin: "*" }));

// Create Account
app.post("/create-account", async (req, res) => {
  const { fullname, email, password } = req.body;
  if (!fullname || !email || !password) {
    return res
      .status(400)
      .json({ error: true, message: "all fields are required" });
  }

  const isUser = await User.findOne({ email });
  if (isUser) {
    return res
      .status(400)
      .json({ error: true, message: "User Already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    fullname,
    email,
    password: hashedPassword,
  });

  await user.save();

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "72h",
    }
  );
  return res.status(201).json({
    error: false,
    user: { fullName: user.fullname, email: user.email },
    accessToken,
    message: "Registration Successful",
  });
});

// Login
app.post("/login-account", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email or Password required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User Not found!" });
  }

  const isPsswordValid = await bcrypt.compare(password, user.password);
  if (!isPsswordValid) {
    return res.status(400).json({ message: "Invalid Credentials" });
  }
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "72h",
    }
  );
  return res.json({
    error: false,
    message: "login Successful",
    user: { fullName: user.fullname, email: user.email },
    accessToken,
  });
});

// Get User
app.get("/get-user", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const isUser = await User.findOne({ _id: userId });

  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: isUser,
    message: "",
  });
});

// Route All Travel Stories
app.post("/image-upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: true, message: "No image uploaded" });
    }

    const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Delete image from uploads folder
app.delete("/delete-image", async (req, res) => {
  const { imageUrl } = req.query;

  if (!imageUrl) {
    return res
      .status(400)
      .json({ error: true, message: "ImageUrl parameter is require" });
  }

  try {
    // Extract the filename form the imageUrl
    const filename = path.basename(imageUrl);

    // Define the file path
    const filePath = path.join(__dirname, "uploads", filename);

    // check if the file exists
    if (fs.existsSync(filePath)) {
      // delete the file from  the uploads folder
      fs.unlinkSync(filePath);
      res.status(200).json({ message: "Image deleted successfully" });
    } else {
      res.status(200).json({ error: true, message: "Image not found" });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});
// Server static files from the uploads and assets directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Add Travel Story
app.post("/add-travel-story", authenticateToken, async (req, res) => {
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  // Validate required fields
  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    return res.status(400).json({
      error: true,
      message: "All fields are required",
    });
  }

  // Convert visitedDate from millisecond to date oject
  const parsedVisitedDate = new Date(parseInt(visitedDate));
  try {
    const travelStory = TravelStory({
      title,
      story,
      visitedLocation,
      userId,
      imageUrl,
      visitedDate: parsedVisitedDate,
    });

    await travelStory.save();
    res.status(201).json({ story: travelStory, message: "Added Successfully" });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

// Get all Travel Story
app.get("/get-all-stories", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const travelStories = await TravelStory.find({ userId: userId }).sort({
      isFavourite: -1,
    });
    res.status(200).json({ stories: travelStories });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

//  Edit Travel story
app.put("/edit-stories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  // Convert visitedDate from millisecond to date oject
  const parsedVisitedDate = new Date(parseInt(visitedDate));

  try {
    // find the travel story by id end ensure it belong to the authenticated user
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });

    if (!travelStory) {
      return res
        .status(404)
        .json({ error: true, message: "Travel story not found" });
    }

    const placeholderImgUrl = `http://localhost:3000/assets/noimage.jpg`;

    travelStory.title = title;
    travelStory.story = story;
    travelStory.visitedDate = visitedDate;
    travelStory.imageUrl = imageUrl;
    travelStory.visitedLocation = visitedLocation;

    await travelStory.save();
    res
      .status(200)
      .json({ story: travelStory, message: "Update Successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Delete a travel story
app.delete("/delete-stories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    // find the travel story by id end ensure it belong to the authenticated user
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });

    if (!travelStory) {
      return res
        .status(404)
        .json({ error: true, message: "Travel story not found" });
    }

    // Delete the travel story
    await travelStory.deleteOne({ _id: id, userId: userId });

    // extract the filename from the imageurl

    const imageUrl = travelStory.imageUrl;
    const filename = path.basename(imageUrl);

    // define the file path
    const filePath = path.join(__dirname, "uploads", filename);

    // delete the image file from the uploads folders
    fs.unlink(filePath, (err) => {
      if (err) {
        console.log("Failed to delete image file:");
      }
    });

    res.status(200).json({ message: "travel story deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

//  Update isFavorite
app.put("/update-is-favourite/:id", authenticateToken, async (req, res) => {
  console.log(req.body);

  const { id } = req.params;
  const { isFavourite } = req.body;
  const { userId } = req.user;

  try {
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });

    if (!travelStory) {
      return res
        .status(404)
        .json({ error: true, message: "Travel story not found" });
    }

    travelStory.isFavourite = isFavourite;

    await travelStory.save();
    res
      .status(200)
      .json({ story: travelStory, message: "isFavourite Update successfully" });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

// Search travel stories
app.get("/search", authenticateToken, async (req, res) => {
  const { query } = req.query;
  const { userId } = req.user;

  if (!query) {
    res.status(404).json({ error: true, message: "query is required" });
  }

  try {
    const searchResults = await TravelStory.find({
      userId: userId,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { story: { $regex: query, $options: "i" } },
        { visitedLocation: { $regex: query, $options: "i" } },
      ],
    }).sort({ isFavourite: -1 });

    res.status(200).json({ stories: searchResults });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

// Filter travel story by date range
app.get("/travel-stories/filter", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const { userId } = req.user;

  try {
    const start = new Date(parseInt(startDate));
    const end = new Date(parseInt(endDate));
    // find travel stories that belong to the authenticated user
    const filteredStories = await TravelStory.find({
      userId: userId,
      visitedDate: { $gte: start, $lte: end },
    }).sort({ isFavourite: -1 });
    res.status(200).json({ stories: filteredStories });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
