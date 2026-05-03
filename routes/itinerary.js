const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post("/generate", async (req, res) => {
	try {
		const { prompt } = req.body;

		if (!prompt || !prompt.trim()) {
			return res.status(400).json({
				error: "Prompt is required",
				message: "Please enter a trip description.",
			});
		}

		if (
			!process.env.GOOGLE_API_KEY ||
			process.env.GOOGLE_API_KEY.includes("v8v8v8")
		) {
			return res.status(401).json({
				error: "Invalid API Key",
				message: "Please provide a valid GOOGLE_API_KEY in your .env file.",
			});
		}

		const listings = await Listing.find(
			{},
			"_id title location price category geometry"
		).limit(10);

		if (!listings.length) {
			return res.status(404).json({
				error: "No listings found",
				message: "Add some listings before generating an itinerary.",
			});
		}

		const listingMap = new Map(
			listings.map((l) => [String(l._id), l])
		);

		const listingText = listings
			.map(
				(l) =>
					`ID: ${l._id}, Title: ${l.title}, Location: ${l.location}, Price: ${l.price}, Category: ${l.category}`
			)
			.join("\n");

		const systemPrompt = `
You are a professional travel planner.

User request:
"${prompt}"

You must create a trip using ONLY the listings below.
Each day must recommend exactly one property from the list.

Available listings:
${listingText}

Rules:
1. propertyId must be one of the exact IDs provided above.
2. propertyTitle must exactly match the chosen listing title.
3. Return ONLY valid JSON.
4. Do not include markdown, code fences, notes, or explanation.
5. Keep itinerary practical and well-structured.

Return JSON in this exact shape:
{
  "tripTitle": "A catchy trip title",
  "totalDays": 3,
  "itinerary": [
    {
      "day": 1,
      "city": "City name",
      "description": "Short activity plan",
      "propertyId": "exact_listing_id",
      "propertyTitle": "exact_listing_title"
    }
  ]
}
`.trim();

		let text = null;
		let lastError = null;

		// Recommended models for stability and latest features
		const modelsToTry = [
			"gemini-1.5-flash-latest",
			"gemini-1.5-pro-latest",
			"gemini-2.0-flash",
			"gemini-pro"
		];

		for (const modelName of modelsToTry) {
			try {
				const model = genAI.getGenerativeModel({ model: modelName });

				const result = await model.generateContent({
					contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
					generationConfig: {
						responseMimeType: "application/json",
					},
				});

				text = result.response.text();
				if (text) {
					console.log(`Successfully generated itinerary using model: ${modelName}`);
					break;
				}
			} catch (err) {
				lastError = err;
				console.log(`Failed with model ${modelName}:`, err.message || err);

				const msg = String(err?.message || err);
				const isQuotaError =
					msg.includes("429") ||
					msg.toLowerCase().includes("quota") ||
					msg.toLowerCase().includes("rate limit");

				// If it's a structural or auth error, don't keep trying more models
				if (!isQuotaError && !msg.includes("404") && !msg.includes("503")) {
					throw err;
				}
			}
		}

		if (!text) {
			const fallbackDays = listings.slice(0, Math.min(3, listings.length)).map((listing, index) => ({
				day: index + 1,
				city: listing.location || "Destination",
				description: `Enjoy a curated stay and explore the best local experiences around ${listing.location || "the destination"}.`,
				propertyId: String(listing._id),
				propertyTitle: listing.title,
				geometry: listing.geometry || null,
			}));

			return res.status(200).json({
				tripTitle: "Sample WanderLust Getaway",
				totalDays: fallbackDays.length,
				itinerary: fallbackDays,
				fallback: true,
				message: "Live AI itinerary is temporarily unavailable due to API quota limits. A sample itinerary has been generated instead.",
			});
		}

		let itinerary;
		try {
			itinerary = JSON.parse(text);
		} catch (parseError) {
			console.error("Gemini returned invalid JSON:", text);
			return res.status(500).json({
				error: "Invalid AI response",
				message: "The itinerary service returned malformed JSON.",
			});
		}

		if (
			!itinerary ||
			!Array.isArray(itinerary.itinerary) ||
			!itinerary.itinerary.length
		) {
			return res.status(500).json({
				error: "Invalid itinerary structure",
				message: "The AI response did not include a usable itinerary.",
			});
		}

		const enrichedItinerary = itinerary.itinerary.map((day, index) => {
			const propertyId = String(day.propertyId || "");
			const listing = listingMap.get(propertyId);

			if (!mongoose.Types.ObjectId.isValid(propertyId) || !listing) {
				const fallbackListing = listings[index % listings.length];
				return {
					day: index + 1,
					city: day.city || fallbackListing.location || "Destination",
					description:
						day.description ||
						`Explore ${fallbackListing.location || "the city"} and enjoy a comfortable stay.`,
					propertyId: String(fallbackListing._id),
					propertyTitle: fallbackListing.title,
					geometry: fallbackListing.geometry || null,
				};
			}

			return {
				day: Number(day.day) || index + 1,
				city: day.city || listing.location || "Destination",
				description:
					day.description ||
					`Explore ${listing.location || "the city"} and enjoy your stay.`,
				propertyId,
				propertyTitle: listing.title,
				geometry: listing.geometry || null,
			};
		});

		return res.json({
			tripTitle: itinerary.tripTitle || "Custom WanderLust Journey",
			totalDays: Number(itinerary.totalDays) || enrichedItinerary.length,
			itinerary: enrichedItinerary,
		});
	} catch (error) {
		console.error("Error generating itinerary:", error);

		const msg = String(error?.message || error);
		const isQuotaError =
			msg.includes("429") ||
			msg.toLowerCase().includes("quota") ||
			msg.toLowerCase().includes("rate limit");

		if (isQuotaError) {
			return res.status(503).json({
				error: "AI quota exceeded",
				message:
					"Gemini API quota is exhausted or unavailable for this project. Please check your API billing/quota settings or try again later.",
			});
		}

		return res.status(500).json({
			error: "Failed to generate itinerary",
			message: error.message || "Unknown error",
		});
	}
});

module.exports = router;