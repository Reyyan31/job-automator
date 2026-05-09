'use client';

import { useState, useEffect } from 'react';

export default function Profile() {
  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '', location: '',
    workAuthorization: 'Yes', requiresSponsorship: 'No', preferredSalary: '', availableFrom: ''
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const defaultProfile = {
    fullName: '', email: '', phone: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '', location: '',
    workAuthorization: 'Yes', requiresSponsorship: 'No', preferredSalary: '', availableFrom: ''
  };

  const mergeProfile = (data) => {
    const merged = { ...defaultProfile };
    for (const key of Object.keys(defaultProfile)) {
      if (data[key] !== undefined && data[key] !== null) {
        merged[key] = data[key];
      }
    }
    if (data.cvText) merged.cvText = data.cvText;
    return merged;
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/profile');
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            if (data && Object.keys(data).length > 0) {
              setProfile(mergeProfile(data));
            }
          } catch(e) {}
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:5001/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMessage('Profile saved successfully!');
      } else {
        setMessage('Failed to save profile.');
      }
    } catch (error) {
      setMessage('Error saving profile.');
    }
    setLoading(false);
  };

  const handleCvUpload = async (e) => {
    e.preventDefault();
    if (!cvFile) return;
    
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('cv', cvFile);

    try {
      const res = await fetch('http://localhost:5001/api/profile/upload-cv', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(mergeProfile(data.profile));
        }
        setMessage('CV uploaded and profile auto-filled!');
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Failed to upload CV.');
      }
    } catch (error) {
      setMessage('Error uploading CV.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-500 mt-1">Configure your personal details for auto-applying.</p>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-blue-50 text-blue-800 font-medium">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">CV Upload</h2>
        <form onSubmit={handleCvUpload} className="flex gap-4 items-center">
          <input 
            type="file" 
            accept=".pdf,.doc,.docx" 
            onChange={(e) => setCvFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button 
            type="submit"
            disabled={!cvFile || loading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Uploading...' : 'Upload CV'}
          </button>
        </form>
        {profile.cvText && (
          <p className="mt-3 text-sm text-green-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            CV is uploaded and parsed ({profile.cvText.length} characters)
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information & Preferences</h2>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={profile.fullName} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" name="phone" value={profile.phone} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" name="location" value={profile.location} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={profile.linkedinUrl} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
              <input type="url" name="githubUrl" value={profile.githubUrl} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
              <input type="url" name="portfolioUrl" value={profile.portfolioUrl} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
          </div>

          <hr className="border-gray-200" />

          <h3 className="text-lg font-bold text-gray-900">Application Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Authorized to work in US?</label>
              <select name="workAuthorization" value={profile.workAuthorization} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Require visa sponsorship?</label>
              <select name="requiresSponsorship" value={profile.requiresSponsorship} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Salary</label>
              <input type="text" name="preferredSalary" placeholder="e.g. $100k - $120k" value={profile.preferredSalary} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
              <input type="text" name="availableFrom" placeholder="e.g. 2 weeks notice" value={profile.availableFrom} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
