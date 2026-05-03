import React, { useState } from "react";
import axios from "axios";

const TripPlanner = () => {
	const [prompt, setPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [trip, setTrip] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setTrip(null);

		try {
			const response = await axios.post("/api/itinerary/generate", { prompt });
			setTrip(response.data);
		} catch (err) {
			setError("Failed to generate itinerary. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
			<h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
				AI Trip Planner
			</h1>

			<form onSubmit={handleSubmit} className="mb-6">
				<label
					htmlFor="prompt"
					className="block text-lg font-medium text-gray-700 mb-2"
				>
					Describe your dream trip:
				</label>
				<textarea
					id="prompt"
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="e.g., I want a 5-day trip visiting Paris, Rome, and Barcelona with a budget of $2000"
					className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
					required
				/>
				<button
					type="submit"
					disabled={loading}
					className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
				>
					{loading ? "Planning..." : "Plan My Trip"}
				</button>
			</form>

			{loading && (
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-lg text-gray-600">Crafting your perfect trip...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			{trip && (
				<div>
					<h2 className="text-2xl font-bold mb-4 text-gray-800">
						{trip.tripTitle}
					</h2>
					<p className="text-gray-600 mb-6">Total Days: {trip.totalDays}</p>

					<div className="space-y-6">
						{trip.itinerary.map((day, index) => (
							<div key={index} className="flex">
								<div className="flex flex-col items-center mr-4">
									<div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
										{day.day}
									</div>
									{index < trip.itinerary.length - 1 && (
										<div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
									)}
								</div>
								<div className="flex-1 pb-6">
									<h3 className="text-xl font-semibold text-gray-800">
										{day.city}
									</h3>
									<p className="text-gray-600 mb-3">{day.description}</p>
									{day.propertyId && (
										<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<h4 className="font-medium text-gray-800 mb-2">
												Suggested Stay
											</h4>
											<p className="text-gray-700 mb-2">{day.propertyTitle}</p>
											<a
												href={`/listings/${day.propertyId}`}
												className="inline-block bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700 transition duration-200"
											>
												View Listing
											</a>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default TripPlanner;
