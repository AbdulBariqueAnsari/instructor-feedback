import React, {useState} from 'react';
import {Check, Plus, Trash2} from 'lucide-react';
import type {PaperInfo, QuestionItem, Teacher} from '../shared/types';
import {apiFetch} from '../utils/api';

interface AdminSettingsPanelProps {
  teachers: Teacher[];
  questions: QuestionItem[];
  papers: PaperInfo[];
  onUpdated: (message: string) => Promise<void>;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({
  teachers,
  questions,
  papers,
  onUpdated,
}) => {
  const [subTab, setSubTab] = useState<'instructors' | 'questions'>('instructors');
  const [paperFilter, setPaperFilter] = useState<number | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Add instructor state
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
  const [newInstPhone, setNewInstPhone] = useState('');
  const [newInstPaper, setNewInstPaper] = useState(1);
  const [newInstDesignation, setNewInstDesignation] = useState('SI(UB)');
  const [newInstTopic, setNewInstTopic] = useState('');
  const [newInstFeatures, setNewInstFeatures] = useState('');
  const [addingInst, setAddingInst] = useState(false);

  // Edit instructor inline state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState<Partial<Teacher>>({});

  // Add question state
  const [newQLabel, setNewQLabel] = useState('');
  const [newQLabelBn, setNewQLabelBn] = useState('');
  const [newQLabelHi, setNewQLabelHi] = useState('');
  const [newQShort, setNewQShort] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  const [newQDescBn, setNewQDescBn] = useState('');
  const [newQDescHi, setNewQDescHi] = useState('');
  const [addingQ, setAddingQ] = useState(false);

  // Edit question inline state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<Partial<QuestionItem>>({});

  const filteredTeachers = teachers
    .filter((t) => (paperFilter === 'all' ? true : t.paperNumber === paperFilter))
    .filter((t) => {
      const q = searchText.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.subjectTopic.toLowerCase().includes(q) ||
        (t.features ?? '').toLowerCase().includes(q) ||
        (t.phone ?? '').toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q)
      );
    });

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newInstName.trim()) {
      setError('Instructor name is required.');
      return;
    }
    setAddingInst(true);
    try {
      await apiFetch('/api/admin/teachers', {
        method: 'POST',
        body: JSON.stringify({
          name: newInstName.trim(),
          code: newInstCode.trim(),
          phone: newInstPhone.trim(),
          paperNumber: newInstPaper,
          designation: newInstDesignation.trim(),
          subjectTopic: newInstTopic.trim(),
          features: newInstFeatures.trim(),
          active: true,
        }),
      });
      setNewInstName('');
      setNewInstCode('');
      setNewInstPhone('');
      setNewInstTopic('');
      setNewInstFeatures('');
      await onUpdated(`Added instructor "${newInstName.trim()}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add instructor.');
    } finally {
      setAddingInst(false);
    }
  };

  const handleSaveTeacher = async (teacherId: string) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/teachers/${teacherId}`, {
        method: 'POST',
        body: JSON.stringify(editTeacherForm),
      });
      setEditingTeacherId(null);
      await onUpdated('Instructor and feature details updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update instructor.');
    }
  };

  const handleToggleTeacherActive = async (teacher: Teacher) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'POST',
        body: JSON.stringify({active: teacher.active === false}),
      });
      await onUpdated(
        `${teacher.name} marked ${teacher.active === false ? 'Active' : 'Inactive'}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status.');
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/teachers/${teacher.id}`, {method: 'DELETE'});
      await onUpdated(`Removed instructor "${teacher.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete instructor.');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newQLabel.trim()) {
      setError('Question title/label is required.');
      return;
    }
    setAddingQ(true);
    try {
      await apiFetch('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify({
          label: newQLabel.trim(),
          labelBn: newQLabelBn.trim(),
          labelHi: newQLabelHi.trim(),
          shortLabel: newQShort.trim(),
          description: newQDesc.trim(),
          descriptionBn: newQDescBn.trim(),
          descriptionHi: newQDescHi.trim(),
          active: true,
        }),
      });
      setNewQLabel('');
      setNewQLabelBn('');
      setNewQLabelHi('');
      setNewQShort('');
      setNewQDesc('');
      setNewQDescBn('');
      setNewQDescHi('');
      await onUpdated(`Added evaluation question "${newQLabel.trim()}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add question.');
    } finally {
      setAddingQ(false);
    }
  };

  const handleSaveQuestion = async (questionId: string) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/questions/${questionId}`, {
        method: 'POST',
        body: JSON.stringify(editQuestionForm),
      });
      setEditingQuestionId(null);
      await onUpdated('Evaluation question updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question.');
    }
  };

  const handleToggleQuestionActive = async (q: QuestionItem) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/questions/${q.id}`, {
        method: 'POST',
        body: JSON.stringify({active: !q.active}),
      });
      await onUpdated(`Question "${q.shortLabel}" ${!q.active ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question state.');
    }
  };

  const handleDeleteQuestion = async (q: QuestionItem) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/questions/${q.id}`, {method: 'DELETE'});
      await onUpdated(`Removed question "${q.shortLabel}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove question.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Portal Configuration Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure faculty instructors, their feature highlights, and dynamic trainee evaluation questions
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('instructors')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'instructors'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Instructors & Features ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('questions')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'questions'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evaluation Questions ({questions.length})
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {subTab === 'instructors' && (
        <div className="space-y-6">
          {/* Add Instructor Form */}
          <form
            onSubmit={handleCreateInstructor}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="font-display text-sm font-bold text-slate-900">Add New Instructor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label htmlFor="new-inst-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Instructor Name
                </label>
                <input
                  id="new-inst-name"
                  type="text"
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-inst-paper" className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Paper
                </label>
                <select
                  id="new-inst-paper"
                  value={newInstPaper}
                  onChange={(e) => setNewInstPaper(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {papers.map((p) => (
                    <option key={p.paperNumber} value={p.paperNumber}>
                      Paper {p.paperNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-inst-code" className="block text-xs font-medium text-slate-700 mb-1">
                  Teacher Code
                </label>
                <input
                  id="new-inst-code"
                  type="text"
                  value={newInstCode}
                  onChange={(e) => setNewInstCode(e.target.value)}
                  placeholder="Auto (e.g. T28)"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-inst-phone" className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile / Telephone Number
                </label>
                <input
                  id="new-inst-phone"
                  type="text"
                  value={newInstPhone}
                  onChange={(e) => setNewInstPhone(e.target.value)}
                  placeholder="e.g. +91 98000 00000"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-inst-desig" className="block text-xs font-medium text-slate-700 mb-1">
                  Rank / Designation
                </label>
                <input
                  id="new-inst-desig"
                  type="text"
                  value={newInstDesignation}
                  onChange={(e) => setNewInstDesignation(e.target.value)}
                  placeholder="SI(UB)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-inst-topic" className="block text-xs font-medium text-slate-700 mb-1">
                  Subject Title
                </label>
                <input
                  id="new-inst-topic"
                  type="text"
                  value={newInstTopic}
                  onChange={(e) => setNewInstTopic(e.target.value)}
                  placeholder="e.g. Bharatiya Nyaya Sanhita 2023 (BNS)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label htmlFor="new-inst-features" className="block text-xs font-medium text-slate-700 mb-1">
                  Instructor Features / Specialization
                </label>
                <input
                  id="new-inst-features"
                  type="text"
                  value={newInstFeatures}
                  onChange={(e) => setNewInstFeatures(e.target.value)}
                  placeholder="e.g. Paper-1 · Case Workshops"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={addingInst}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {addingInst ? 'Adding...' : 'Add Instructor'}
              </button>
            </div>
          </form>

          {/* Existing Instructors Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Manage Instructors & Feature Attributes
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Filter name, topic, or feature..."
                  aria-label="Filter instructors in settings"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-56"
                />
                <select
                  value={paperFilter}
                  onChange={(e) =>
                    setPaperFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  aria-label="Filter settings instructors by paper"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Papers</option>
                  {papers.map((p) => (
                    <option key={p.paperNumber} value={p.paperNumber}>
                      Paper {p.paperNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredTeachers.map((teacher) => {
                const isEditing = editingTeacherId === teacher.id;
                return (
                  <div key={teacher.id} className="p-4 space-y-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editTeacherForm.name ?? teacher.name}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, name: e.target.value}))
                          }
                          aria-label="Edit instructor name"
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editTeacherForm.code ?? teacher.code}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, code: e.target.value}))
                          }
                          aria-label="Edit instructor code"
                          className="px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                        <select
                          value={editTeacherForm.paperNumber ?? teacher.paperNumber}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({
                              ...prev,
                              paperNumber: Number(e.target.value),
                            }))
                          }
                          aria-label="Edit instructor paper"
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          {papers.map((p) => (
                            <option key={p.paperNumber} value={p.paperNumber}>
                              Paper {p.paperNumber}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editTeacherForm.phone ?? teacher.phone ?? ''}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, phone: e.target.value}))
                          }
                          placeholder="Mobile / Telephone Number"
                          aria-label="Edit instructor mobile number"
                          className="px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editTeacherForm.designation ?? teacher.designation}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, designation: e.target.value}))
                          }
                          aria-label="Edit instructor designation"
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editTeacherForm.subjectTopic ?? teacher.subjectTopic}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, subjectTopic: e.target.value}))
                          }
                          aria-label="Edit instructor subject topic"
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editTeacherForm.features ?? teacher.features ?? ''}
                          onChange={(e) =>
                            setEditTeacherForm((prev) => ({...prev, features: e.target.value}))
                          }
                          placeholder="Features / specialization"
                          aria-label="Edit instructor features"
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg sm:col-span-2 lg:col-span-3"
                        />
                        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveTeacher(teacher.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            Save Instructor
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTeacherId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                            <span className="font-semibold text-slate-700">{teacher.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>Paper-{teacher.paperNumber}</span>
                            {teacher.phone && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{teacher.phone}</span>
                              </>
                            )}
                          </div>
                          <div className="font-semibold text-sm text-slate-900">{teacher.name}</div>
                          <div className="text-xs text-slate-600">
                            Subject: {teacher.subjectTopic}
                            {teacher.features && teacher.features !== `Paper-${teacher.paperNumber}`
                              ? ` · Feature: ${teacher.features}`
                              : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTeacherActive(teacher)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                              teacher.active !== false
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {teacher.active !== false ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherId(teacher.id);
                              setEditTeacherForm(teacher);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            aria-label={`Remove ${teacher.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-700 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'questions' && (
        <div className="space-y-6">
          {/* Add New Question Form */}
          <form
            onSubmit={handleCreateQuestion}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="font-display text-sm font-bold text-slate-900">
              Add New Trainee Evaluation Question (1–5 Scale)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="new-q-label" className="block text-xs font-medium text-slate-700 mb-1">
                  Question Title (English)
                </label>
                <input
                  id="new-q-label"
                  type="text"
                  value={newQLabel}
                  onChange={(e) => setNewQLabel(e.target.value)}
                  placeholder="e.g. Practical Field Relevance"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-q-label-bn" className="block text-xs font-medium text-slate-700 mb-1">
                  Question Title (বাংলা / Bengali)
                </label>
                <input
                  id="new-q-label-bn"
                  type="text"
                  value={newQLabelBn}
                  onChange={(e) => setNewQLabelBn(e.target.value)}
                  placeholder="যেমন: বাস্তব ক্ষেত্রের প্রাসঙ্গিকতা"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-q-label-hi" className="block text-xs font-medium text-slate-700 mb-1">
                  Question Title (हिन्दी / Hindi)
                </label>
                <input
                  id="new-q-label-hi"
                  type="text"
                  value={newQLabelHi}
                  onChange={(e) => setNewQLabelHi(e.target.value)}
                  placeholder="जैसे: व्यावहारिक क्षेत्र की प्रासंगिकता"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-q-short" className="block text-xs font-medium text-slate-700 mb-1">
                  Short Column Label
                </label>
                <input
                  id="new-q-short"
                  type="text"
                  value={newQShort}
                  onChange={(e) => setNewQShort(e.target.value)}
                  placeholder="e.g. Relevance"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-q-desc" className="block text-xs font-medium text-slate-700 mb-1">
                  Description (English)
                </label>
                <input
                  id="new-q-desc"
                  type="text"
                  value={newQDesc}
                  onChange={(e) => setNewQDesc(e.target.value)}
                  placeholder="How well lessons apply to real field duty"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="new-q-desc-bn" className="block text-xs font-medium text-slate-700 mb-1">
                  Description (বাংলা)
                </label>
                <input
                  id="new-q-desc-bn"
                  type="text"
                  value={newQDescBn}
                  onChange={(e) => setNewQDescBn(e.target.value)}
                  placeholder="ঐচ্ছিক বাংলা বিবরণ"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="new-q-desc-hi" className="block text-xs font-medium text-slate-700 mb-1">
                  Description (हिन्दी)
                </label>
                <input
                  id="new-q-desc-hi"
                  type="text"
                  value={newQDescHi}
                  onChange={(e) => setNewQDescHi(e.target.value)}
                  placeholder="वैकल्पिक हिन्दी विवरण"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addingQ}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {addingQ ? 'Adding...' : 'Add Question'}
            </button>
          </form>

          {/* Existing Questions List */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {questions.map((q, idx) => {
              const isEditing = editingQuestionId === q.id;
              return (
                <div key={q.id} className="p-4">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={editQuestionForm.label ?? q.label}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, label: e.target.value}))
                        }
                        placeholder="Title (English)"
                        aria-label="Edit question title"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.labelBn ?? q.labelBn ?? ''}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, labelBn: e.target.value}))
                        }
                        placeholder="Title (বাংলা)"
                        aria-label="Edit question title in Bengali"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.labelHi ?? q.labelHi ?? ''}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, labelHi: e.target.value}))
                        }
                        placeholder="Title (हिन्दी)"
                        aria-label="Edit question title in Hindi"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.shortLabel ?? q.shortLabel}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, shortLabel: e.target.value}))
                        }
                        placeholder="Short Column Label"
                        aria-label="Edit question short label"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.description ?? q.description}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, description: e.target.value}))
                        }
                        placeholder="Description (English)"
                        aria-label="Edit question description"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.descriptionBn ?? q.descriptionBn ?? ''}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, descriptionBn: e.target.value}))
                        }
                        placeholder="Description (বাংলা)"
                        aria-label="Edit question description in Bengali"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editQuestionForm.descriptionHi ?? q.descriptionHi ?? ''}
                        onChange={(e) =>
                          setEditQuestionForm((prev) => ({...prev, descriptionHi: e.target.value}))
                        }
                        placeholder="Description (हिन्दी)"
                        aria-label="Edit question description in Hindi"
                        className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg sm:col-span-3"
                      />
                      <div className="sm:col-span-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveQuestion(q.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Save Question
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQuestionId(null)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">
                          Q{idx + 1} · Column: {q.shortLabel}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">{q.label}</div>
                        <div className="text-xs text-slate-600">{q.description}</div>
                        {(q.labelBn || q.labelHi) && (
                          <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                            {q.labelBn && (
                              <div>
                                <span className="font-semibold text-slate-500">বাংলা: </span>
                                {q.labelBn}
                              </div>
                            )}
                            {q.labelHi && (
                              <div>
                                <span className="font-semibold text-slate-500">हिन्दी: </span>
                                {q.labelHi}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionActive(q)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                            q.active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {q.active ? 'Active' : 'Hidden'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestionId(q.id);
                            setEditQuestionForm(q);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          aria-label={`Delete question ${q.label}`}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
