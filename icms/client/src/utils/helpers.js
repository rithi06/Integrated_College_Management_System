// Grade from marks (out of 100)
export function getGrade(marks) {
  if (marks === null || marks === undefined) return '–';
  if (marks >= 90) return 'O';
  if (marks >= 80) return 'A+';
  if (marks >= 70) return 'A';
  if (marks >= 60) return 'B+';
  if (marks >= 50) return 'B';
  if (marks >= 40) return 'C';
  return 'F';
}

export function getGradeBadge(marks) {
  const g = getGrade(marks);
  if (['O', 'A+', 'A'].includes(g)) return 'badge-success';
  if (['B+', 'B'].includes(g))       return 'badge-info';
  if (g === 'C')                     return 'badge-warning';
  if (g === 'F')                     return 'badge-danger';
  return 'badge-gray';
}

// Attendance status badge
export function attBadge(pct) {
  const p = parseFloat(pct);
  if (p >= 75) return 'badge-success';
  if (p >= 60) return 'badge-warning';
  return 'badge-danger';
}

export function attLabel(pct) {
  const p = parseFloat(pct);
  if (p >= 75) return 'Good';
  if (p >= 60) return 'Caution';
  return 'Low';
}

// CGPA colour
export function cgpaColor(cgpa) {
  const c = parseFloat(cgpa);
  if (c >= 8.5) return { bg: 'var(--success-lt)', color: '#065f46' };
  if (c >= 7.0) return { bg: 'var(--info-lt)',    color: '#1e40af' };
  if (c >= 5.5) return { bg: 'var(--warning-lt)', color: '#92400e' };
  return             { bg: 'var(--danger-lt)',   color: '#991b1b'  };
}

// Format date YYYY-MM-DD → dd MMM YYYY
export function fmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// Today as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split('T')[0];
}

// Initials from full name
export function initials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
