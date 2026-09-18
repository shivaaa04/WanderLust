//video1- basic setup
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const ejs = require("ejs");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError.js");
const listingSchema = require("./schema.js");
const reviewSchema = require("./schema.js");
const Review = require("./models/review.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

const port = 3000;

const mongo_url = "mongodb://127.0.0.1:27017/wanderlust";

main()
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("Error connecting to MongoDB:", err));

async function main() {
  await mongoose.connect(mongo_url);
}

// ------------------------------------------------------------------------
// // video2- model listing
// app.get('/testlisting', async (req, res) => {
  //   let sampleListing = new Listing({
    //     title: 'My New Villa',
    //     description: 'This is my new villa in Bali. It has 4 bedrooms and 2 bathrooms. It is located in the heart of Bali.',
    //     image: 'https://unsplash.com/photos/breaking-ocean-wave-with-golden-light-zHE3Jq5ZNV0',
    //     price: 500,
//     location: 'Bali',
//     country: 'Indonesia'
//   });

//   await sampleListing.save();
//   console.log('Sample listing created');
//   res.send('Sample listing created!');
// });

// ------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Hello World");
});


const validateListing = (req, res, next) => {
  let {error} = listingSchema.validate(req.body);
  if(error){
    let errMsg = error.details.map(el => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }else{
    next();
  }
}

const validateReview = (req, res, next) => {
  let {error} = reviewSchema.validate(req.body);
  if(error){
    let errMsg = error.details.map(el => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }else{
    next();
  }
}
// index route
app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  }),
);

// ------------------------------------------------------------------------
//new route
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

//show route
app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", { listing });
  }),
);

//create route
app.post(
  "/listings",
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
  })
);
//------------------------------------------------------------------------
// edit route
app.get(
  "/listings/:id/edit",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  }),
);

//update route
app.put(
  "/listings/:id",
  validateListing,
  wrapAsync(async (req, res) => {
    if (!req.body.listing.title) {
      throw new ExpressError(400, "Send valid data");
    }
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, req.body.listing);
    res.redirect(`/listings/${id}`);
  }),
);

// --------------------------------------------------------------------------------
// video- delete route
app.delete(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
  }),
);

// ------------------------------------------------------------------------
// create review route
app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);

  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();

  console.log("new review saved");
  res.redirect(`/listings/${listing._id}`);
}));

// -------------------------------------------------------------------------------------------
//delete review route
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req, res) => {
  let {id, reviewId} = req.params;
  await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
  await Review.findByIdAndDelete(reviewId);
  res.redirect(`/listings/${id}`);
}));


// --------------------------------------------------------------------------------------------------
app.all("/{*splat}", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});


app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { err});
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
