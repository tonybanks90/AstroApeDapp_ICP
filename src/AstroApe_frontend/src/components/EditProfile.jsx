// EditProfile.jsx (Updated for Profile.mo and useSiweIdentity)
import React, { useState, useEffect } from "react";
import Button from "./Button";
import Input from "./Input";
import { useSiweIdentity } from "ic-use-siwe-identity";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/Profile";

const EditProfile = ({ username, bio, profilePic, onClose }) => {
  const { identity } = useSiweIdentity();
  const [newUsername, setNewUsername] = useState(username);
  const [newBio, setNewBio] = useState(bio);
  const [newProfilePic, setNewProfilePic] = useState(profilePic);
  const [backend, setBackend] = useState(null);

  useEffect(() => {
    const initializeActor = async () => {
      if (identity) {
        const agent = new HttpAgent({
          host:
            process.env.DFX_NETWORK === "local"
              ? "http://127.0.0.1:4943"
              : "https://ic0.app",
        });

        if (process.env.DFX_NETWORK === "local") {
          await agent.fetchRootKey();
        }

        const backendActor = Actor.createActor(idlFactory, {
          agent,
          canisterId,
        });
        setBackend(backendActor);
      }
    };

    initializeActor();
  }, [identity]);

  const handleSave = async () => {
    if (identity && backend) {
      try {
        await backend.createUserProfile(
          identity.getPrincipal(),
          newUsername,
          newProfilePic,
          newBio
        );
        console.log("Profile updated successfully.");
        onClose(); // Close the modal after saving
      } catch (error) {
        console.error("Error updating profile:", error);
      }
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-n-7 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-n-1">Edit Profile</h2>

        <div className="mb-4 flex flex-col items-center">
          <div className="relative w-24 h-24">
            <img
              src={newProfilePic}
              alt="Profile Pic"
              className="w-24 h-24 rounded-full object-cover border-2 border-n-6"
            />
            <label
              htmlFor="profile-upload"
              className="absolute bottom-0 right-0 bg-n-8 p-2 rounded-full cursor-pointer border border-n-6"
            >
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
          <label className="text-n-2 block mb-1">Bio</label>
          <Input value={newBio} onChange={(e) => setNewBio(e.target.value)} />
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