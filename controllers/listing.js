const Listing = require("../models/listing.js");
const asyncWrap = require("../utils/wrapAsync.js");
const mapToken = process.env.MAP_TOKEN;
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

module.exports.index = asyncWrap(async (req, res) => {
	let query = {};
	let { q, category } = req.query;

	if (q) {
		// If query is longer than 3 words, try AI Smart Search
		if (q.split(" ").length > 3 && process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("v8v8v8")) {
			try {
				const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
				const prompt = `Convert this natural language travel search into a MongoDB query object for a 'Listing' model.
				Model Schema: { title: String, description: String, price: Number, location: String, country: String, category: String }
				Search: "${q}"
				Return ONLY the JSON query object. Example: {"price": {"$lte": 5000}, "location": "Paris"}`;
				
				const result = await model.generateContent(prompt);
				const aiQueryText = result.response.text().replace(/```json|```/g, "").trim();
				query = JSON.parse(aiQueryText);
				console.log("AI Smart Search Query:", query);
			} catch (err) {
				console.error("AI Search Error, falling back to regex:", err);
				const regex = new RegExp(q, "i");
				query = {
					$or: [{ title: regex }, { description: regex }, { category: regex }, { location: regex }, { country: regex }],
				};
			}
		} else {
			const regex = new RegExp(q, "i");
			query = {
				$or: [{ title: regex }, { description: regex }, { category: regex }, { location: regex }, { country: regex }],
			};
		}
	}
	if (category) {
		query.category = category;
	}
	const allListings = await Listing.find(query);
	res.render("listings/index.ejs", { allListings, searchQuery: q });
});

module.exports.renderListingForm = (req, res) => {
	res.render("listings/new.ejs");
};
module.exports.showListing = asyncWrap(async (req, res) => {
	let { id } = req.params;
	const listing = await Listing.findById(id)
		.populate({ path: "reviews", populate: { path: "author" } })
		.populate("owner");
	if (!listing) {
		req.flash("error", "Listing you are looking for does not exist!");
		return res.redirect("/listings");
	}

	let reviewSummary = "";
	if (listing.reviews.length > 0 && process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("v8v8v8")) {
		try {
			const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
			const reviewsText = listing.reviews.map((r) => r.comment).join(". ");
			const prompt = `Summarize these user reviews for a vacation rental into 3 bullet points (Pros/Cons).
			Reviews: "${reviewsText}"
			Stay objective and concise.`;

			const result = await model.generateContent(prompt);
			reviewSummary = result.response.text();
		} catch (err) {
			console.error("AI Review Summary Error:", err);
		}
	}

	res.render("listings/show.ejs", { listing, reviewSummary });
});
module.exports.createListing = asyncWrap(async (req, res, next) => {
	console.log(req.body);
	let response = await geocodingClient
		.forwardGeocode({
			query: req.body.listing.location,
			limit: 1,
		})
		.send();
	let url = req.file.path;
	let filename = req.file.filename;
	const newListing = new Listing(req.body.listing);
	newListing.owner = req.user._id;
	newListing.image = { url, filename };
	newListing.geometry = response.body.features[0].geometry;
	await newListing.save();
	req.flash("success", "New Listing Created!");
	res.redirect("/listings");
});
module.exports.renderEditForm = asyncWrap(async (req, res) => {
	let { id } = req.params;
	const listing = await Listing.findById(id);
	if (!listing) {
		req.flash("error", "Listing you are looking for does not exist!");
		return res.redirect("/listings");
	}
	let originalImage = listing.image.url;
	originalImage = originalImage.replace("/upload", "/upload/h_300,w_250");
	res.render("listings/edit.ejs", { listing, originalImage });
});
module.exports.updateListing = asyncWrap(async (req, res) => {
	let { id } = req.params;
	let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
	if (typeof req.file !== "undefined") {
		let url = req.file.path;
		let filename = req.file.filename;
		listing.image = { url, filename };
		await listing.save();
	}
	req.flash("success", "Listing Updated!");
	res.redirect(`/listings/${id}`);
});
module.exports.deleteListing = asyncWrap(async (req, res) => {
	let { id } = req.params;
	let deletedListing = await Listing.findByIdAndDelete(id);
	req.flash("success", "Listing Deleted!");
	console.log(`Deleted listing: ${deletedListing}`);
	res.redirect("/listings");
});

module.exports.renderTripPlanner = (req, res) => {
	res.render("tripPlanner.ejs");
};
