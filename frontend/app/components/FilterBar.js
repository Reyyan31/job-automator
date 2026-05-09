export default function FilterBar({ filters, setFilters, onBulkApply, applyStatus }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ATS Type</label>
          <select 
            name="ats" 
            value={filters.ats} 
            onChange={handleChange}
            className="text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border outline-none"
          >
            <option value="">All</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="unknown">Unknown (Skip)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Match Score</label>
          <select 
            name="minScore" 
            value={filters.minScore} 
            onChange={handleChange}
            className="text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border outline-none"
          >
            <option value="">Any</option>
            <option value="5">5+</option>
            <option value="7">7+</option>
            <option value="9">9+</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select 
            name="applied" 
            value={filters.applied} 
            onChange={handleChange}
            className="text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border outline-none"
          >
            <option value="">All</option>
            <option value="false">Unapplied</option>
            <option value="true">Applied</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
        <div className="text-sm text-gray-600 hidden md:block">
           <span className="font-semibold text-gray-900">Status:</span> {applyStatus.applied} applied, {applyStatus.pending} pending, {applyStatus.failed} failed
        </div>
        <button
          onClick={onBulkApply}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition flex items-center gap-2 hover:opacity-90"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Bulk Apply Eligible
        </button>
      </div>
    </div>
  );
}
