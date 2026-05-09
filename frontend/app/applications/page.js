'use client';

import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ applied: 0, failed: 0, skipped: 0, review: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/applications');
      const text = await res.text();
      let data = [];
      if (text) {
        try { data = JSON.parse(text); } catch (e) { console.error('Parse err:', text); }
      }
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/applications/stats');
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          setStats(data);
        } catch (e) { console.error('Parse err:', text); }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getAnswersEntries = (geminiAnswers) => {
    if (!geminiAnswers) return [];
    if (geminiAnswers instanceof Map) return Array.from(geminiAnswers.entries());
    if (typeof geminiAnswers === 'object') return Object.entries(geminiAnswers);
    return [];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Application Tracking</h1>
        <p className="text-gray-500 mt-1">Monitor the status of all your automated job submissions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-medium">Successfully Applied</span>
          <span className="text-3xl font-bold text-green-600 mt-1">{stats.applied}</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-medium">Requires Review</span>
          <span className="text-3xl font-bold text-yellow-500 mt-1">{stats.review}</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-medium">Failed Submissions</span>
          <span className="text-3xl font-bold text-red-500 mt-1">{stats.failed}</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-medium">Skipped Jobs</span>
          <span className="text-3xl font-bold text-gray-500 mt-1">{stats.skipped}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-semibold">Company</th>
                <th className="p-4 font-semibold">Job Title</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No applications tracked yet.</td>
                </tr>
              ) : (
                applications.map((app) => {
                  const answers = getAnswersEntries(app.geminiAnswers);
                  const hasAnswers = answers.length > 0;
                  const isExpanded = expandedId === app._id;

                  return (
                    <React.Fragment key={app._id}>
                      <tr className="hover:bg-gray-50 transition">
                        <td className="p-4 font-medium text-gray-900">
                          {app.job?.company || 'Unknown'}
                        </td>
                        <td className="p-4 text-gray-700">
                          {app.job?.title || 'Unknown'}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(app.appliedAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          <div className="flex items-center gap-3">
                            {app.status === 'failed' && (
                              <span className="text-red-600 truncate max-w-[200px]" title={app.errorMessage}>{app.errorMessage}</span>
                            )}
                            {app.status === 'review' && (
                              <span className="text-yellow-600">
                                Missing {app.missingFields?.length || 0} fields
                              </span>
                            )}
                            {app.job?.url && (
                              <a href={app.job.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline whitespace-nowrap">
                                View Job
                              </a>
                            )}
                            {hasAnswers && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : app._id)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap flex items-center gap-1"
                              >
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                                {isExpanded ? 'Hide Answers' : 'View Answers'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasAnswers && (
                        <tr>
                          <td colSpan="5" className="bg-gray-50 px-6 py-4">
                            <div className="max-w-3xl">
                              <h4 className="text-sm font-bold text-gray-700 mb-3">Gemini-Filled Questionnaire</h4>
                              <div className="space-y-3">
                                {answers.map(([field, value], idx) => (
                                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{field}</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
