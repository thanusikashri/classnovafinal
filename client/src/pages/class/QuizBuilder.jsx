import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';

const QuizBuilder = () => {
  const { id: classId, quizId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  const [loading, setLoading] = useState(!!quizId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/quizzes/${quizId}`);
      const q = res.data.data;
      setTitle(q.title);
      setDescription(q.description || '');
      setDurationMinutes(q.durationMinutes);
      setStartTime(q.startTime ? new Date(q.startTime).toISOString().slice(0,16) : '');
      setEndTime(q.endTime ? new Date(q.endTime).toISOString().slice(0,16) : '');
      setIsPublished(q.isPublished);
      setQuestions(q.questions || []);
    } catch (err) {
      console.error(err);
      alert('Error fetching quiz');
      navigate(`/classes/${classId}`);
    } finally {
      setLoading(false);
    }
  }, [classId, quizId, navigate]);

  useEffect(() => {
    if (quizId) fetchQuiz();
  }, [quizId, fetchQuiz]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', options: ['', ''], correctOptionIndex: 0, marks: 1 }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options.splice(oIndex, 1);
    if (updated[qIndex].correctOptionIndex >= updated[qIndex].options.length) {
      updated[qIndex].correctOptionIndex = 0;
    }
    setQuestions(updated);
  };

  const removeQuestion = (qIndex) => {
    const updated = [...questions];
    updated.splice(qIndex, 1);
    setQuestions(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    
    // Validation
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) return alert(`Question ${i+1} needs text`);
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) return alert(`Option ${j+1} in Question ${i+1} is empty`);
      }
    }

    setIsSubmitting(true);
    const payload = {
      title,
      description,
      durationMinutes: Number(durationMinutes),
      isPublished,
      questions
    };
    if (startTime) payload.startTime = new Date(startTime).toISOString();
    if (endTime) payload.endTime = new Date(endTime).toISOString();

    try {
      if (quizId) {
        await api.put(`/classes/${classId}/quizzes/${quizId}`, payload);
      } else {
        await api.post(`/classes/${classId}/quizzes`, payload);
      }
      navigate(`/classes/${classId}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans pt-4">
      <button 
        onClick={() => navigate(`/classes/${classId}`)}
        className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Class</span>
      </button>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
          <h2 className="text-2xl font-medium text-gray-800 mb-6">{quizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input required type="number" min="1" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (optional)</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time (optional)</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="publish" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
              <label htmlFor="publish" className="text-sm text-gray-700 font-medium">Publish immediately</label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-lg shadow-sm border border-gray-300 relative">
              <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
              
              <div className="mb-4 pr-8">
                <label className="block text-sm font-medium text-gray-700 mb-1">Question {qIndex + 1}</label>
                <input required type="text" value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} placeholder="Type question here..." className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 font-medium" />
              </div>

              <div className="space-y-3 mb-4">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <input type="radio" name={`correct-${qIndex}`} checked={q.correctOptionIndex === oIndex} onChange={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                    <input required type="text" value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-gray-400 hover:text-red-500 p-1">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => addOption(qIndex)} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  + Add option
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Points:</label>
                  <input type="number" min="1" required value={q.marks} onChange={e => updateQuestion(qIndex, 'marks', Number(e.target.value))} className="w-20 px-3 py-1 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button type="button" onClick={addQuestion} className="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors shadow-sm focus:outline-none">
            <Plus size={20} />
            <span>Add Question</span>
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 flex justify-end gap-4 z-10">
          <button type="button" onClick={() => navigate(`/classes/${classId}`)} className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm">
            {isSubmitting ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizBuilder;
