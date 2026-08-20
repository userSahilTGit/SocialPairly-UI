import React from 'react';
import GlassCard from '../components/GlassCard';

const EventDashboard = () => {
  // Mock data representing the masked payload from backend
  const matchData = {
    screenId: "SP-BAY-2048-07",
    ageRange: "28-32",
    area: "San Francisco Bay Area",
    education: "Graduate Degree",
    goals: "Seeking meaningful, long-term connection"
  };

  const handleReaction = (tokens, reactionType) => {
    // Implement Axios POST to /api/reactions/send here
  };

  return (
    <div className="min-h-screen p-8 flex flex-col md:flex-row gap-8 justify-center items-start">
      {/* Left Column: Photos */}
      <div className="w-full md:w-1/2 max-w-lg">
        <div className="w-full h-96 bg-gray-300 rounded-2xl shadow-glass overflow-hidden mb-4">
           {/* Primary Photo Wrapper */}
           <div className="w-full h-full bg-spIndigo opacity-20 flex items-center justify-center">Photo 1</div>
        </div>
        <p className="text-center text-spNavy font-semibold">Profile 4 of 15</p>
      </div>

      {/* Right Column: Masked Data & Reactions */}
      <div className="w-full md:w-1/2 max-w-lg">
        <GlassCard>
          <h3 className="text-2xl font-bold text-spViolet mb-4">{matchData.screenId}</h3>
          
          <div className="space-y-4 text-spNavy mb-8">
            <p><strong>Age Range:</strong> {matchData.ageRange}</p>
            <p><strong>Area:</strong> {matchData.area}</p>
            <p><strong>Education:</strong> {matchData.education}</p>
            <p><strong>Goals:</strong> {matchData.goals}</p>
          </div>

          {/* Token-Based Reactions */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => handleReaction(1, 'Wave')} className="px-4 py-2 bg-spLavender text-spViolet rounded-full font-semibold hover:bg-spViolet hover:text-white transition">👋 Wave (1)</button>
            <button onClick={() => handleReaction(2, 'Spark')} className="px-4 py-2 bg-spLavender text-spViolet rounded-full font-semibold hover:bg-spViolet hover:text-white transition">✨ Spark (2)</button>
            <button onClick={() => handleReaction(3, 'Heart')} className="px-4 py-2 bg-spLavender text-spRose rounded-full font-semibold hover:bg-spRose hover:text-white transition">❤️ Heart (3)</button>
            <button onClick={() => handleReaction(4, 'Coffee')} className="px-4 py-2 bg-spLavender text-spCoral rounded-full font-semibold hover:bg-spCoral hover:text-white transition">☕ Coffee (4)</button>
            <button onClick={() => handleReaction(5, 'Priority')} className="px-4 py-2 bg-gradient-to-r from-spViolet to-spCoral text-white rounded-full font-semibold shadow-lg transition">⭐ Priority (5)</button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default EventDashboard;