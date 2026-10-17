/**
 * Resolves a candidate's resume link into a full, cross-origin safe URL.
 * Automatically targets the resilient backend file streaming endpoint so that
 * Vercel 404 errors and ephemeral disk file losses are completely avoided.
 */
export const getResumeFileUrl = (candidateOrApp: any): string => {
  if (!candidateOrApp) return '#';

  const envApiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'https://recruitx-api-7cn6.onrender.com/api';
  const backendRoot = envApiBase.replace(/\/api\/?$/, '');

  // 1. First prioritize dedicated streaming route by Student ID
  const studentId =
    candidateOrApp.student?._id ||
    (typeof candidateOrApp.student === 'string' ? candidateOrApp.student : null) ||
    candidateOrApp.candidateProfile?.student?._id ||
    (typeof candidateOrApp.candidateProfile?.student === 'string' ? candidateOrApp.candidateProfile.student : null) ||
    candidateOrApp.studentId ||
    (candidateOrApp.role === 'student' ? candidateOrApp._id : null);

  if (studentId) {
    return `${backendRoot}/api/resume/file/${studentId}`;
  }

  // 2. If already a full http/https link
  const rawUrl = candidateOrApp.candidateProfile?.resumeUrl || candidateOrApp.resumeUrl;
  if (typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    return rawUrl;
  }

  // 3. If relative /uploads path, prefix with backend domain
  if (typeof rawUrl === 'string' && rawUrl.startsWith('/uploads')) {
    return `${backendRoot}${rawUrl}`;
  }

  // 4. Default fallback to app or candidate ID
  if (candidateOrApp._id) {
    return `${backendRoot}/api/resume/file/${candidateOrApp._id}`;
  }

  return '#';
};
