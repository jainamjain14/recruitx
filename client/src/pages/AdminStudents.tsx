import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Loader2,
  X,
  Users,
  Trash2,
} from 'lucide-react';

interface ParsedStudent {
  name: string;
  email: string;
  department?: string;
  cgpa?: number;
  backlogs?: number;
  batchYear?: number;
  phone?: string;
}

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudent[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/users?role=student');
      if (res.data?.data?.users) setStudents(res.data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle-status`);
      const updatedUser = res.data.data.user;
      setStudents(students.map((s) => (s._id === id ? { ...s, isSuspended: updatedUser.isSuspended } : s)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteStudent = async (s: any) => {
    const confirmed = window.confirm(
      `Permanently delete student "${s.name}" (${s.email})?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(s._id);
    try {
      await api.delete(`/admin/users/${s._id}`);
      setStudents((prev) => prev.filter((x) => x._id !== s._id));
    } catch (err: any) {
      console.error('Delete student request failed:', err);
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message || err?.message;
      alert(`Delete failed (${status || 'Network Error'}): ${backendMsg || 'Server is restarting or route unavailable. Please wait 30 seconds.'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const downloadSampleCsv = () => {
    const headers = 'Name,Email,Department,CGPA,Backlogs,BatchYear,Phone';
    const sampleRows = [
      'Aarav Sharma,aarav.sharma@campus.edu,Computer Science,8.65,0,2026,9876543210',
      'Priya Nair,priya.nair@campus.edu,Cinematography,8.20,0,2026,9876543211',
      'Rohan Kulkarni,rohan.k@campus.edu,Product Design,7.85,1,2026,9876543212',
      'Ananya Verma,ananya.v@campus.edu,Marketing,8.90,0,2026,9876543213',
    ];
    const csvContent = [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'RecruitX_Student_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setParseError('The uploaded CSV file is empty or does not contain header and data rows.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const emailIdx = headers.findIndex((h) => h.includes('email'));
        const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department') || h.includes('branch'));
        const cgpaIdx = headers.findIndex((h) => h.includes('cgpa') || h.includes('gpa') || h.includes('grade'));
        const backlogIdx = headers.findIndex((h) => h.includes('backlog'));
        const batchIdx = headers.findIndex((h) => h.includes('batch') || h.includes('year'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));

        if (emailIdx === -1) {
          setParseError('CSV must include an "Email" column header.');
          return;
        }

        const rows: ParsedStudent[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          const email = parts[emailIdx];
          if (!email || !email.includes('@')) continue;

          rows.push({
            name: nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : 'Student Candidate',
            email,
            department: deptIdx !== -1 ? parts[deptIdx] : 'Engineering',
            cgpa: cgpaIdx !== -1 ? parseFloat(parts[cgpaIdx]) || 8.0 : 8.0,
            backlogs: backlogIdx !== -1 ? parseInt(parts[backlogIdx], 10) || 0 : 0,
            batchYear: batchIdx !== -1 ? parseInt(parts[batchIdx], 10) || 2026 : 2026,
            phone: phoneIdx !== -1 ? parts[phoneIdx] : '',
          });
        }

        if (rows.length === 0) {
          setParseError('No valid student rows found with valid email addresses.');
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setParseError(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setParseError(null);

    try {
      const res = await api.post('/admin/students/import', { students: parsedRows });
      setImportResult(res.data?.data);
      fetchStudents();
    } catch (err: any) {
      setParseError(err.response?.data?.message || err.message || 'Failed to import students');
    } finally {
      setImporting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const activeCount = students.filter((s) => s.emailVerified).length;
  const suspendedCount = students.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Student Directory & Onboarding</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage student access permissions and provision batch cohorts via CSV upload.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setShowImportModal(true);
              setParsedRows([]);
              setCsvFile(null);
              setImportResult(null);
              setParseError(null);
            }}
            className="flex items-center gap-1.5 bg-neutral-900 text-white"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import Students (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Total Enrolled</span>
          <p className="text-xl font-bold text-neutral-900">{students.length}</p>
        </Card>
        <Card className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Active Access</span>
          <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
        </Card>
        <Card className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-red-500">Suspended</span>
          <p className="text-xl font-bold text-red-600">{suspendedCount}</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter students by name or university email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs pl-9 pr-4 py-2.5 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
        />
      </div>

      {/* Student List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-neutral-400">Loading student directory...</div>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-xs text-neutral-500">No students matched your search criteria.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredStudents.map((s) => (
            <Card key={s._id} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-neutral-100 border border-neutral-200">
                  <GraduationCap className="w-4 h-4 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">{s.name}</h3>
                  <p className="text-xs text-neutral-500">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    s.isSuspended
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {s.isSuspended ? 'Suspended' : 'Active'}
                </span>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(s._id)}>
                  {s.isSuspended ? 'Activate' : 'Suspend'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => deleteStudent(s)}
                  disabled={deletingId === s._id}
                  className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {deletingId === s._id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-neutral-900" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Bulk Student Onboarding via CSV</h3>
                  <p className="text-[11px] text-neutral-500">Provision hundreds of student accounts simultaneously</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Sample Template Download */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">Need the standard CSV format?</h4>
                  <p className="text-[11px] text-neutral-500">Columns: Name, Email, Department, CGPA, Backlogs, BatchYear, Phone</p>
                </div>
                <Button size="sm" variant="secondary" onClick={downloadSampleCsv} className="shrink-0 flex items-center gap-1 text-xs">
                  <Download className="w-3.5 h-3.5" /> Template
                </Button>
              </div>

              {/* Upload Drop Area */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Select CSV File:</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-neutral-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer border border-neutral-200 rounded-md p-1.5"
                />
              </div>

              {/* Error Banner */}
              {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Success Result */}
              {importResult && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Import Completed Successfully!</span>
                  </div>
                  <p className="text-emerald-700 text-[11px]">
                    Created: <strong>{importResult.importedCount}</strong> student accounts • Skipped duplicates:{' '}
                    <strong>{importResult.skippedCount}</strong>.
                  </p>
                </div>
              )}

              {/* Preview Parsed Rows */}
              {parsedRows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                    <span>Parsed Candidate Preview ({parsedRows.length} ready):</span>
                  </div>
                  <div className="border border-neutral-200 rounded-md max-h-48 overflow-y-auto divide-y divide-neutral-100 text-[11px]">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-neutral-900">{row.name}</span>
                          <span className="text-neutral-500 ml-2">({row.email})</span>
                        </div>
                        <span className="text-neutral-500 font-mono text-[10px]">
                          {row.department} • CGPA: {row.cgpa}
                        </span>
                      </div>
                    ))}
                    {parsedRows.length > 10 && (
                      <div className="p-2 text-center text-neutral-400 italic text-[10px]">
                        + {parsedRows.length - 10} more candidate rows...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-50/50">
              <Button variant="secondary" size="sm" onClick={() => setShowImportModal(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={importing || parsedRows.length === 0 || !!importResult}
                className="flex items-center gap-1.5 bg-neutral-900 text-white"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Provisioning Accounts...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Import {parsedRows.length > 0 ? `${parsedRows.length} Students` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

