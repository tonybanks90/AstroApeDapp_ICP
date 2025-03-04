import React, { useState } from "react";
import Button from "./Button";
import Input from "./Input";

const EditProfile = ({ username, setUsername, tags, setTags, profilePic, setProfilePic, onClose }) => {
  const [newUsername, setNewUsername] = useState(username);
  const [newTags, setNewTags] = useState(tags);
  const [newProfilePic, setNewProfilePic] = useState(profilePic);

  const handleSave = () => {
    setUsername(newUsername);
    setTags(newTags);
    setProfilePic(newProfilePic);
    onClose();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewProfilePic(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-n-8 p-6 rounded-lg w-96 border border-n-6">
        <h2 className="text-2xl font-semibold text-n-1 mb-4">Edit Profile</h2>
        
        <div className="mb-4 flex flex-col items-center">
          <div className="relative w-24 h-24">
            <img 
              src={newProfilePic} 
              alt="Profile Pic" 
              className="w-24 h-24 rounded-full object-cover border-2 border-n-6"
            />
            <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-n-8 p-2 rounded-full cursor-pointer border border-n-6">
              📷
            </label>
            <input
              id="profile-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-n-2 block mb-1">Username</label>
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-n-2 block mb-1">Tags</label>
          <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} />
        </div>

        <div className="flex justify-end space-x-4">
          <Button onClick={onClose} className="bg-gray-600">Cancel</Button>
          <Button onClick={handleSave} className="bg-green-500">Save</Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
