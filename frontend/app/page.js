'use client';

import { useState, useEffect } from 'react';
import JobCard from './components/JobCard';
import FilterBar from './components/FilterBar';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [filters, setFilters] = useState({ ats: '', minScore: '', applied: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalJobs: 0 });
  const [applyStatus, setApplyStatus] = useState({ total: 0, applied: 0, failed: 0, pending: 0 });

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ ...filters, page, limit: 100 });
      const res = await fetch(`http://localhost:5001/api/jobs?${queryParams.toString()}`);
      const text = await res.text();
      let data = { jobs: [], currentPage: 1, totalPages: 1, totalJobs: 0 };
      if (text) {
        try { 
          const parsed = JSON.parse(text);
          if (parsed && parsed.jobs) {
            data = parsed;
          }
        } catch (e) { 
          console.error('Failed to parse jobs:', text); 
        }
      }
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        totalJobs: data.totalJobs || 0
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplyStatus = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/apply/status');
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          setApplyStatus(data);
        } catch (e) { console.error('Failed to parse apply status:', text); }
      }
    } catch (error) {
      console.error('Error fetching apply status:', error);
    }
  };

  useEffect(() => {
    fetchJobs(1);
    fetchApplyStatus();
    const interval = setInterval(fetchApplyStatus, 10000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleManualFetch = async () => {
    setFetchingJobs(true);
    try {
      const res = await fetch('http://localhost:5001/api/jobs/fetch', { method: 'POST' });
      const data = await res.json();
      alert(`Fetch complete. Added ${data.newJobsAdded} new jobs.`);
      fetchJobs();
    } catch (error) {
      console.error('Fetch failed:', error);
      alert('Fetch failed. Check console.');
    } finally {
      setFetchingJobs(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      const res = await fetch(`http://localhost:5001/api/apply/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'applied') {
        alert('Application successful!');
        fetchApplyStatus();
      } else if (data.status === 'failed' || data.status === 'review') {
        alert(`${data.reason || 'Application failed'}`);
        fetchApplyStatus();
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Apply failed:', error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const res = await fetch(`http://localhost:5001/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j._id !== jobId));
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete job failed:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL jobs from the database? This cannot be undone.')) return;
    try {
      const res = await fetch('http://localhost:5001/api/jobs/all', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchJobs();
        fetchApplyStatus();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBulkApply = async () => {
    if (!confirm('Are you sure you want to bulk apply to all eligible jobs?')) return;
    try {
      const res = await fetch('http://localhost:5001/api/apply/bulk', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchApplyStatus();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Bulk apply failed:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Matches</h1>
          <p className="text-gray-500 mt-1">Discover and auto-apply to the best roles.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteAll}
            className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition shadow-sm"
          >
            Delete All Jobs
          </button>
          <button
            onClick={handleManualFetch}
            disabled={fetchingJobs}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
          >
            {fetchingJobs ? 'Fetching APIs...' : 'Fetch New Jobs'}
          </button>
        </div>
      </div>

      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        onBulkApply={handleBulkApply} 
        applyStatus={applyStatus}
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or fetch new jobs.</p>
          <button onClick={handleManualFetch} className="text-indigo-600 font-medium hover:underline">Fetch from APIs</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {jobs.map(job => (
              <JobCard key={job._id} job={job} onApply={handleApply} onDelete={handleDeleteJob} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8 border-t border-gray-200">
              <button
                disabled={pagination.currentPage === 1 || loading}
                onClick={() => fetchJobs(pagination.currentPage - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                Previous
              </button>
              
              <div className="text-sm font-medium text-gray-600">
                Page <span className="text-indigo-600 font-bold">{pagination.currentPage}</span> of {pagination.totalPages}
                <span className="ml-2 text-gray-400 font-normal">({pagination.totalJobs} total jobs)</span>
              </div>

              <button
                disabled={pagination.currentPage === pagination.totalPages || loading}
                onClick={() => fetchJobs(pagination.currentPage + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
