import StatusBadge from './StatusBadge';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

export default function JobCard({ job, onApply, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition flex flex-col h-full overflow-hidden min-w-0">
      <div className="flex justify-between items-start gap-2 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-gray-900 truncate" title={job.title}>
            {job.title}
          </h3>
          <p className="text-sm text-gray-600 truncate">{job.company}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {job.matchScore !== null && job.matchScore !== undefined && (
             <span className={`px-2 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                job.matchScore >= 8 ? 'bg-green-500 text-white' : 
                job.matchScore >= 5 ? 'bg-yellow-400 text-white' : 
                'bg-red-400 text-white'
             }`}>
               {job.matchScore}/10
             </span>
          )}
          <StatusBadge status={job.ats} />
        </div>
      </div>
      
      <div className="text-sm text-gray-500 mb-4 flex-grow space-y-1 min-w-0 overflow-hidden">
        <p className="truncate">📍 {job.location || 'Remote'}</p>
        {job.salary && <p className="truncate">💰 {job.salary}</p>}
        <p className="text-xs text-gray-400 mt-2 line-clamp-3 break-words">
          {stripHtml(job.description) || 'No description available...'}
        </p>
      </div>

      <div className="mt-auto border-t pt-4">
        <div className="flex justify-between items-center mt-2">
          <a 
            href={job.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
          >
            View Listing
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-0L10 14"></path></svg>
          </a>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onDelete(job._id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Delete job"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>

            <button 
              onClick={() => onApply(job._id)}
              disabled={job.applied}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2 ${
                job.applied 
                  ? 'bg-green-100 text-green-700 cursor-default' 
                  : job.ats !== 'unknown'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
              }`}
            >
              {job.applied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  Applied
                </>
              ) : job.ats !== 'unknown' ? (
                <>Auto Apply</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM16.464 16.464a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707z"></path></svg>
                  Auto Detect
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
