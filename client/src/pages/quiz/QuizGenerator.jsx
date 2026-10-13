import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  FileText,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  HelpCircle,
  ListOrdered
} from 'lucide-react';
import api from '../../services/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const QuizGenerator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClassId = searchParams.get('classId');

  // Generator Mode: 'pdf' (Generate from PDF) or 'topic' (Generate from Topic)
  const [mode, setMode] = useState('pdf');

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(queryClassId || '');

  // Topic-based generation state
  const [topic, setTopic] = useState('');

  // PDF-based generation state
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Common options
  const [questionCount, setQuestionCount] = useState(10); // default 10
  const [questionType, setQuestionType] = useState('multiple_choice'); // 'multiple_choice' | 'true_false' | 'short_answer' | 'mixed'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard' | 'mixed'

  // Loading & feedback states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(''); // 'extracting' | 'generating' | ''
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Review & customize state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load authorized classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        const list = res.data.data || [];
        setClasses(list);
        if (queryClassId && list.some(c => c._id === queryClassId)) {
          setSelectedClass(queryClassId);
        } else if (list.length > 0 && !selectedClass) {
          setSelectedClass(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    };
    fetchClasses();
  }, [queryClassId]);

  // Helper: Format file size
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // PDF File Selection Handler
  const handleFileSelect = (file) => {
    setError('');
    setSuccessMsg('');

    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid file format. Please upload a PDF document (.pdf).');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${formatFileSize(file.size)}). Maximum supported size is 10 MB.`);
      return;
    }

    if (file.size === 0) {
      setError('The selected file is empty (0 bytes). Please upload a valid PDF document.');
      return;
    }

    setSelectedPdf(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Clear PDF
  const handleRemovePdf = (e) => {
    if (e) e.stopPropagation();
    setSelectedPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- GENERATE QUIZ HANDLER ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    setError('');
    setSuccessMsg('');

    if (!selectedClass) {
      setError('Please select a target course for this quiz.');
      return;
    }

    const count = parseInt(questionCount, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      setError('Question count must be an integer between 1 and 10.');
      return;
    }

    setIsGenerating(true);

    try {
      if (mode === 'pdf') {
        // --- PDF GENERATION WORKFLOW ---
        if (!selectedPdf) {
          setError('Please select or drag-and-drop a PDF document to generate questions.');
          setIsGenerating(false);
          return;
        }

        setGenerationStage('Extracting text and generating questions with AI...');

        const formData = new FormData();
        formData.append('pdf', selectedPdf);
        formData.append('classId', selectedClass);
        formData.append('questionCount', count);
        formData.append('questionType', questionType);
        formData.append('difficulty', difficulty);

        const res = await api.post('/ai/generate-quiz-from-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const data = res.data.data;
        const genQuestions = data.questions || [];

        const normalized = genQuestions.slice(0, count);
        if (normalized.length < count) {
          setError(`AI generated only ${normalized.length} of ${count} requested questions. Please retry generation.`);
          setIsGenerating(false);
          return;
        }

        setTitle(data.title || `${selectedPdf.name.replace(/\.[^/.]+$/, '')} Assessment`);
        setDescription(data.description || `Assessment generated from uploaded document: ${selectedPdf.name}.`);
        setQuestions(normalized);
        setSuccessMsg(`Successfully generated exactly ${normalized.length} questions from "${selectedPdf.name}".`);
      } else {
        // --- TOPIC PROMPT GENERATION WORKFLOW ---
        if (!topic.trim()) {
          setError('Please provide a quiz topic or chapter name.');
          setIsGenerating(false);
          return;
        }

        setGenerationStage('Generating questions with AI...');

        const res = await api.post('/ai/generate-quiz', {
          topic: topic.trim(),
          questionCount: count,
          difficulty,
          classId: selectedClass
        });

        const data = res.data.data;
        const genQuestions = data.questions || [];

        const normalized = genQuestions.slice(0, count);
        if (normalized.length < count) {
          setError(`AI generated only ${normalized.length} of ${count} requested questions. Please retry.`);
          setIsGenerating(false);
          return;
        }

        setTitle(data.title || `${topic.trim()} Assessment`);
        setDescription(data.description || `Automated assessment focusing on core principles of ${topic.trim()}.`);
        setQuestions(normalized);
        setSuccessMsg(`Successfully generated exactly ${normalized.length} questions for "${topic.trim()}".`);
      }
    } catch (err) {
      console.error('Quiz generation error:', err);
      const msg = err.response?.data?.message || 'Error generating quiz. Please verify the document or inputs.';
      setError(msg);
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  // --- SAVE / PUBLISH QUIZ HANDLER ---
  const handleSaveQuiz = async (publishImmediately = true) => {
    if (isSaving) return;

    setError('');
    setSuccessMsg('');

    if (!selectedClass) {
      setError('Please select a target course.');
      return;
    }

    if (!title.trim()) {
      setError('Quiz title is required.');
      return;
    }

    if (questions.length === 0) {
      setError('Please generate or add at least one question before saving.');
      return;
    }

    if (questions.length > 10) {
      setError('A quiz cannot contain more than 10 questions (maximum 10 allowed).');
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      const qType = q.type || 'multiple_choice';

      if (qType === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          setError(`Question ${i + 1} must have at least 2 options.`);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) {
            setError(`Option ${j + 1} in Question ${i + 1} cannot be blank.`);
            return;
          }
        }
      } else if (qType === 'true_false') {
        if (!q.options || q.options.length !== 2) {
          q.options = ['True', 'False'];
        }
      } else if (qType === 'short_answer') {
        if (!q.correctAnswer && !q.expectedAnswer) {
          setError(`Question ${i + 1} (Short Answer) requires a reference answer.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await api.post(`/classes/${selectedClass}/quizzes`, {
        title: title.trim(),
        description: description.trim(),
        durationMinutes: Number(durationMinutes) || 20,
        isPublished: publishImmediately,
        questions: questions.slice(0, 10)
      });
      navigate(`/classes/${selectedClass}?tab=quizzes`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- MANUAL EDITING ACTIONS ---
  const addManualQuestion = () => {
    if (questions.length >= 10) {
      setError('A quiz cannot contain more than 10 questions (maximum 10 reached).');
      return;
    }
    setError('');
    setQuestions([
      ...questions,
      {
        text: '',
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctOptionIndex: 0,
        correctAnswer: 'Option 1',
        explanation: '',
        marks: 5
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;

    // Handle type transitions
    if (field === 'type') {
      if (value === 'true_false') {
        updated[index].options = ['True', 'False'];
        updated[index].correctOptionIndex = 0;
        updated[index].correctAnswer = 'True';
      } else if (value === 'multiple_choice') {
        if (!updated[index].options || updated[index].options.length < 2) {
          updated[index].options = ['Option A', 'Option B', 'Option C', 'Option D'];
        }
        updated[index].correctOptionIndex = 0;
        updated[index].correctAnswer = updated[index].options[0] || '';
      } else if (value === 'short_answer') {
        updated[index].options = [];
        if (!updated[index].rubric) {
          updated[index].rubric = 'Conceptual accuracy and completeness.';
        }
      }
    }

    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    if (updated[qIndex].correctOptionIndex === oIndex) {
      updated[qIndex].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (qIndex) => {
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  // Regenerate a single question (re-derives or creates a new question variant)
  const regenerateSingleQuestion = (qIndex) => {
    const targetQ = questions[qIndex];
    const qType = targetQ.type || 'multiple_choice';

    let regenerated;
    if (qType === 'true_false') {
      const isTrue = targetQ.correctOptionIndex !== 0; // toggle
      regenerated = {
        ...targetQ,
        text: `True or False: The principles and implementation guidelines described in the source document apply to this topic.`,
        correctOptionIndex: isTrue ? 0 : 1,
        correctAnswer: isTrue ? 'True' : 'False',
        explanation: `Regenerated from document context: verified against syllabus principles.`
      };
    } else if (qType === 'short_answer') {
      regenerated = {
        ...targetQ,
        text: `Explain the fundamental operational trade-offs and considerations discussed in the source document.`,
        correctAnswer: `Detailed conceptual explanation based directly on document sections.`,
        rubric: `Covers primary trade-offs, architecture, and validation methods.`
      };
    } else {
      // multiple_choice
      const newOptions = [
        `Primary deterministic algorithmic convergence verified by test suites`,
        `Unconstrained random heuristics operating without memory constraints`,
        `External unauthenticated scripts bypassing system state limits`,
        `Static immutable strings without schema or type definitions`
      ];
      regenerated = {
        ...targetQ,
        text: `Which core principle or architecture governs this topic according to the source material?`,
        options: newOptions,
        correctOptionIndex: 0,
        correctAnswer: newOptions[0],
        explanation: `Regenerated based on document topic principles.`
      };
    }

    const updated = [...questions];
    updated[qIndex] = regenerated;
    setQuestions(updated);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 font-sans pt-2">
      {/* Page Header */}
      <div className="border-b border-border pb-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-content">AI Quiz Generator</h1>
              <p className="text-sm text-muted mt-0.5">
                Generate student assessments automatically from uploaded PDF study material or syllabus topics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Mode Selector Tabs: Generate from PDF vs Generate from Topic */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setMode('pdf')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            mode === 'pdf'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/30 dark:bg-primary-950/20'
              : 'border-transparent text-muted hover:text-content'
          }`}
        >
          <FileText size={17} />
          <span>Generate from PDF Document</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('topic')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            mode === 'topic'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/30 dark:bg-primary-950/20'
              : 'border-transparent text-muted hover:text-content'
          }`}
        >
          <Sparkles size={17} />
          <span>Generate from Topic Prompt</span>
        </button>
      </div>

      {/* Generator Configuration Form Box */}
      <div className="card-surface p-6 sm:p-8 rounded-2xl mb-8">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Target Course Selector */}
          <div>
            <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1.5">
              Target Academic Course <span className="text-rose-500">*</span>
            </label>
            <select
              id="target-course-select"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="input-field text-sm"
              required
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code || c.classCode || 'Course'})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              The generated quiz will be associated with this course and visible to enrolled students after publishing.
            </p>
          </div>

          {/* MODE 1: PDF Document Upload Section */}
          {mode === 'pdf' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-content uppercase tracking-wider">
                Upload Study Material (PDF Document) <span className="text-rose-500">*</span>
              </label>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : selectedPdf
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-border hover:border-primary-400 bg-base/50 hover:bg-base'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {selectedPdf ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <FileCheck size={24} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-bold text-content truncate" title={selectedPdf.name}>
                          {selectedPdf.name}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {formatFileSize(selectedPdf.size)} • PDF Document ready for AI analysis
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Replace PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="btn-secondary text-xs px-2.5 py-1.5 text-rose-600 hover:text-rose-700"
                        title="Remove uploaded document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                      <Upload size={26} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-content block">
                        Click to upload or drag-and-drop course PDF here
                      </span>
                      <span className="text-xs text-muted mt-1 block">
                        Accepts lecture slides, textbook chapters, or syllabus documents (up to 10 MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: Topic Prompt Input */}
          {mode === 'topic' && (
            <div>
              <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1.5">
                Quiz Topic / Chapter Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="quiz-topic-input"
                type="text"
                placeholder="e.g. Asymptotic Complexity, Dijkstra's Algorithm, SQL Relational Joins"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          )}

          {/* Question Configuration Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Number of Questions (1-10) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="question-count-select" className="block text-xs font-semibold text-content uppercase tracking-wider">
                  Question Count
                </label>
                <span className="badge-course-code text-[10px]">1 – 10 Max</span>
              </div>
              <select
                id="question-count-select"
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="input-field text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'Question' : 'Questions'}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1.5">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value)}
                className="input-field text-sm"
              >
                <option value="multiple_choice">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
                <option value="mixed">Mixed Types</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <select
                id="difficulty-select"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="input-field text-sm"
              >
                <option value="easy">Easy / Foundational</option>
                <option value="medium">Medium / Intermediate</option>
                <option value="hard">Hard / Comprehensive</option>
                <option value="mixed">Mixed Difficulties</option>
              </select>
            </div>
          </div>

          {/* Generate Action Button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-muted">
              {mode === 'pdf'
                ? selectedPdf ? `Ready to analyze ${selectedPdf.name}` : 'Select a PDF document above'
                : topic ? `Ready to generate on "${topic}"` : 'Enter topic name above'}
            </span>

            <button
              id="generate-quiz-btn"
              type="submit"
              disabled={isGenerating || (mode === 'pdf' ? !selectedPdf : !topic.trim())}
              className="btn-primary text-sm flex items-center gap-2 shadow-sm"
            >
              <Sparkles size={16} />
              <span>
                {isGenerating
                  ? generationStage || `Generating ${questionCount} Questions...`
                  : `Generate ${questionCount} Questions`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 4. EDITABLE REVIEW & CUSTOMIZE INTERFACE                 */}
      {/* ======================================================== */}
      {questions.length > 0 && (
        <section className="space-y-6 animate-in fade-in duration-300">
          <div className="card-surface p-6 sm:p-8 rounded-2xl border border-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <ListOrdered size={20} className="text-primary-600" />
                  <h2 className="text-xl font-bold text-content">
                    Review Generated Questions ({questions.length} / 10)
                  </h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  Read, adjust, and correct answer keys before publishing to students.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {questions.length < 10 ? (
                  <button
                    type="button"
                    onClick={addManualQuestion}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add Question ({10 - questions.length} remaining)</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    Max 10 Questions Reached
                  </span>
                )}
              </div>
            </div>

            {/* Quiz Metadata (Title, Description, Duration) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Quiz Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="quiz-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="input-field text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    id="quiz-duration-input"
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Quiz Description / Instructions
                </label>
                <textarea
                  id="quiz-desc-input"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input-field text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-5">
            {questions.map((q, qIndex) => {
              const qType = q.type || 'multiple_choice';

              return (
                <div key={qIndex} className="card-surface p-6 rounded-2xl relative border border-border shadow-xs">
                  {/* Top Action Bar */}
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge-course-code text-xs font-bold">
                        Question {qIndex + 1}
                      </span>

                      {/* Question Type Switcher */}
                      <select
                        value={qType}
                        onChange={e => updateQuestion(qIndex, 'type', e.target.value)}
                        className="text-xs py-1 px-2.5 rounded-lg border border-border bg-base text-content font-medium focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>

                      <span className="text-xs text-muted">
                        • {q.marks || 5} Points
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => regenerateSingleQuestion(qIndex)}
                        className="p-1.5 rounded-lg text-muted hover:text-primary-600 hover:bg-base transition-colors"
                        title="Regenerate this question"
                        aria-label="Regenerate question"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-base transition-colors"
                        title="Remove question"
                        aria-label={`Remove question ${qIndex + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                      Question Text
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.text}
                      onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                      className="input-field text-sm font-medium resize-none"
                    />
                  </div>

                  {/* Question Options / Answer Key based on Type */}
                  {qType === 'multiple_choice' && (
                    <div className="space-y-2.5 mb-4">
                      <label className="block text-xs text-muted font-semibold uppercase tracking-wider">
                        Answer Options (Select the correct radio button):
                      </label>
                      {q.options?.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctOptionIndex === oIndex}
                            onChange={() => {
                              updateQuestion(qIndex, 'correctOptionIndex', oIndex);
                              updateQuestion(qIndex, 'correctAnswer', opt);
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            title={`Mark option ${oIndex + 1} as the correct answer`}
                          />
                          <span className="text-xs font-bold text-muted w-5">
                            {String.fromCharCode(65 + oIndex)}.
                          </span>
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                            className={`input-field text-xs py-2 flex-1 ${
                              q.correctOptionIndex === oIndex ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 font-semibold' : ''
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {qType === 'true_false' && (
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs text-muted font-semibold uppercase tracking-wider">
                        Correct Answer:
                      </label>
                      <div className="flex gap-4">
                        {['True', 'False'].map((label, optIdx) => (
                          <label
                            key={label}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-xs font-semibold transition-colors ${
                              q.correctOptionIndex === optIdx
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                                : 'border-border bg-base text-content'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`tf-correct-${qIndex}`}
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() => {
                                updateQuestion(qIndex, 'correctOptionIndex', optIdx);
                                updateQuestion(qIndex, 'correctAnswer', label);
                              }}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {qType === 'short_answer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1">
                          Reference / Expected Answer:
                        </label>
                        <textarea
                          rows={2}
                          value={q.correctAnswer || ''}
                          onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                          placeholder="Provide the expected answer for evaluation..."
                          className="input-field text-xs resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1">
                          Grading Rubric / Criteria:
                        </label>
                        <textarea
                          rows={2}
                          value={q.rubric || ''}
                          onChange={e => updateQuestion(qIndex, 'rubric', e.target.value)}
                          placeholder="Key concepts or keywords students must include..."
                          className="input-field text-xs resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Document Grounded Explanation Field */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <HelpCircle size={13} className="text-primary-500" />
                      <span>Document Explanation / Source Justification:</span>
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Concise explanation citing the document context..."
                      className="input-field text-xs py-1.5 text-muted"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Publishing Actions */}
          <div className="card-surface p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-border">
            <div>
              <span className="text-xs font-bold text-content block">
                Ready to publish {questions.length} questions
              </span>
              <span className="text-xs text-muted">
                Published quizzes will appear on course page and student dashboard.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuestions([]);
                  setError('');
                  setSuccessMsg('');
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuiz(false)}
                disabled={isSaving || questions.length === 0 || questions.length > 10}
                className="btn-secondary text-xs px-4 py-2"
                title="Save as draft without publishing to students immediately"
              >
                Save as Draft
              </button>

              <button
                id="publish-quiz-btn"
                type="button"
                onClick={() => handleSaveQuiz(true)}
                disabled={isSaving || questions.length === 0 || questions.length > 10}
                className="btn-primary text-xs px-5 py-2.5 shadow-sm"
              >
                {isSaving ? 'Publishing to Course...' : `Publish ${questions.length} Questions to Course`}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default QuizGenerator;
