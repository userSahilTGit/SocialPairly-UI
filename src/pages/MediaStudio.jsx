import React, { useState } from 'react';
import api from '../api/axios';
import GlassCard from '../components/GlassCard';
import { getMediaUrl } from '../utils/mediaUrl';

const MediaStudio = () => {
  const [media, setMedia] = useState([]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File exceeds 5MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Calls existing Spring Boot UserMediaService endpoint
      const response = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMedia([...media, response.data]);
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold text-spIndigo mb-6">Build Your Profile</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {media.map((item, index) => (
          <div key={index} className="relative w-full h-48 rounded-xl overflow-hidden shadow-md">
             <img src={getMediaUrl(item)} alt="Profile Media" className="w-full h-full object-cover" />
          </div>
        ))}
        {media.length < 6 && (
          <label className="w-full h-48 border-2 border-dashed border-spViolet rounded-xl flex items-center justify-center cursor-pointer hover:bg-spLavender transition">
            <span className="text-spViolet font-semibold">+ Add Media</span>
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
          </label>
        )}
      </div>
    </div>
  );
};

export default MediaStudio;