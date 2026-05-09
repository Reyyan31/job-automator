export default function StatusBadge({ status }) {
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  let label = status;

  if (!status) return null;

  switch (status.toLowerCase()) {
    case 'applied':
      colorClass = 'bg-green-100 text-green-800 border-green-200';
      break;
    case 'failed':
      colorClass = 'bg-red-100 text-red-800 border-red-200';
      break;
    case 'review':
      colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      break;
    case 'skipped':
    case 'unknown':
      colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
      break;
    case 'greenhouse':
      colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      break;
    case 'lever':
      colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    default:
      break;
  }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${colorClass} capitalize`}>
      {label}
    </span>
  );
}
