import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  BookOpen, Upload, Link2, FileText, Plus, Trash2, RefreshCw,
  CheckCircle2, Clock, AlertCircle, Loader2, X, HelpCircle, Pencil, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

const statusIcon = {
  processed: <CheckCircle2 size={14} className="text-green-400" />,
  processing: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  pending: <Clock size={14} className="text-yellow-400" />,
  failed: <AlertCircle size={14} className="text-red-400" />
};

const typeColors = {
  pdf: 'bg-red-500/20 text-red-400',
  text: 'bg-blue-500/20 text-blue-400',
  url: 'bg-purple-500/20 text-purple-400',
  faq: 'bg-green-500/20 text-green-400',
  docx: 'bg-orange-500/20 text-orange-400'
};

// Edit Modal
function EditModal({ doc, onClose }) {
  const [title, setTitle] = useState(doc.title || '');
  const [description, setDescription] = useState(doc.description || '');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.put(`/knowledge-base/${doc._id}`, { title, description });
      toast.success('Document updated successfully');
      queryClient.invalidateQueries(['knowledge-base']);
      onClose();
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Edit Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`badge ${typeColors[doc.type] || 'bg-slate-700 text-slate-400'}`}>
              {doc.type.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">
              {doc.chunksCount > 0 ? `${doc.chunksCount} chunks processed` : 'Not yet processed'}
            </span>
          </div>

          <div>
            <label className="label">Title</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description..."
            />
          </div>

          {doc.sourceUrl && (
            <div>
              <label className="label">Source URL</label>
              <p className="text-sm text-slate-400 bg-slate-800 rounded-lg px-3 py-2 truncate">{doc.sourceUrl}</p>
              <p className="text-xs text-slate-500 mt-1">To change the URL, delete this and add a new one</p>
            </div>
          )}

          {doc.fileName && (
            <div>
              <label className="label">File Name</label>
              <p className="text-sm text-slate-400 bg-slate-800 rounded-lg px-3 py-2">{doc.fileName}</p>
              <p className="text-xs text-slate-500 mt-1">To change the file, delete this and upload a new one</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload / Add Content Modal
function UploadModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('file');
  const [urlForm, setUrlForm] = useState({ url: '', title: '' });
  const [textForm, setTextForm] = useState({ title: '', content: '' });
  const [faqForm, setFaqForm] = useState({ title: '', faqs: [{ question: '', answer: '' }] });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024
  });

  const handleFileUpload = async () => {
    if (!acceptedFiles.length) return toast.error('Select a file first');
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', file.name);
        await api.post('/knowledge-base/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success(`${acceptedFiles.length} file(s) uploaded`);
      queryClient.invalidateQueries(['knowledge-base']);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = async () => {
    if (!urlForm.url) return toast.error('URL is required');
    setUploading(true);
    try {
      await api.post('/knowledge-base/url', urlForm);
      toast.success('URL added successfully');
      queryClient.invalidateQueries(['knowledge-base']);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add URL');
    } finally {
      setUploading(false);
    }
  };

  const handleTextAdd = async () => {
    if (!textForm.title || !textForm.content) return toast.error('Title and content required');
    setUploading(true);
    try {
      await api.post('/knowledge-base/text', textForm);
      toast.success('Text content added');
      queryClient.invalidateQueries(['knowledge-base']);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add text');
    } finally {
      setUploading(false);
    }
  };

  const handleFaqAdd = async () => {
    const validFaqs = faqForm.faqs.filter(f => f.question && f.answer);
    if (!faqForm.title || validFaqs.length === 0) return toast.error('Title and at least one FAQ required');
    setUploading(true);
    try {
      await api.post('/knowledge-base/faq', { ...faqForm, faqs: validFaqs });
      toast.success('FAQs added successfully');
      queryClient.invalidateQueries(['knowledge-base']);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add FAQs');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'file', label: 'Upload File', icon: Upload },
    { id: 'url', label: 'Scrape URL', icon: Link2 },
    { id: 'text', label: 'Paste Text', icon: FileText },
    { id: 'faq', label: 'Add FAQs', icon: HelpCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Add to Knowledge Base</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-800 px-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-slate-700 hover:border-primary-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <input {...getInputProps()} />
                <Upload size={32} className="mx-auto mb-3 text-slate-500" />
                <p className="text-slate-300 font-medium">Drop files here or click to browse</p>
                <p className="text-slate-500 text-sm mt-1">PDF, TXT, DOC, DOCX — Max 10MB each</p>
              </div>
              {acceptedFiles.length > 0 && (
                <div className="space-y-2">
                  {acceptedFiles.map(f => (
                    <div key={f.name} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800 rounded-lg px-3 py-2">
                      <FileText size={14} className="text-primary-400" />
                      {f.name}
                      <span className="text-slate-500 ml-auto">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleFileUpload} disabled={uploading || !acceptedFiles.length} className="btn-primary w-full flex items-center justify-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="label">URL to scrape</label>
                <input type="url" className="input" placeholder="https://docs.yoursite.com/faq" value={urlForm.url} onChange={e => setUrlForm(p => ({ ...p, url: e.target.value }))} />
              </div>
              <div>
                <label className="label">Title (optional)</label>
                <input type="text" className="input" placeholder="Auto-detected from page" value={urlForm.title} onChange={e => setUrlForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <button onClick={handleUrlAdd} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {uploading ? 'Scraping...' : 'Scrape & Add URL'}
              </button>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input type="text" className="input" placeholder="e.g., Product Documentation" value={textForm.title} onChange={e => setTextForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input min-h-[200px] resize-y" placeholder="Paste your content here..." value={textForm.content} onChange={e => setTextForm(p => ({ ...p, content: e.target.value }))} />
              </div>
              <button onClick={handleTextAdd} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {uploading ? 'Adding...' : 'Add Text Content'}
              </button>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div>
                <label className="label">FAQ Set Title</label>
                <input type="text" className="input" placeholder="e.g., Product FAQs" value={faqForm.title} onChange={e => setFaqForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-3">
                {faqForm.faqs.map((faq, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">FAQ #{idx + 1}</span>
                      {faqForm.faqs.length > 1 && (
                        <button onClick={() => setFaqForm(p => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }))} className="text-slate-500 hover:text-red-400">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <input type="text" className="input text-sm" placeholder="Question" value={faq.question} onChange={e => setFaqForm(p => ({ ...p, faqs: p.faqs.map((f, i) => i === idx ? { ...f, question: e.target.value } : f) }))} />
                    <textarea className="input text-sm min-h-[80px] resize-none" placeholder="Answer" value={faq.answer} onChange={e => setFaqForm(p => ({ ...p, faqs: p.faqs.map((f, i) => i === idx ? { ...f, answer: e.target.value } : f) }))} />
                  </div>
                ))}
              </div>
              <button onClick={() => setFaqForm(p => ({ ...p, faqs: [...p.faqs, { question: '', answer: '' }] }))} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Plus size={14} /> Add Another FAQ
              </button>
              <button onClick={handleFaqAdd} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <HelpCircle size={16} />}
                {uploading ? 'Adding...' : 'Add FAQs'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: () => api.get('/knowledge-base').then(r => r.data),
    refetchInterval: 5000
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/knowledge-base/${id}`),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries(['knowledge-base']);
    },
    onError: () => toast.error('Delete failed')
  });

  const reprocessMutation = useMutation({
    mutationFn: (id) => api.post(`/knowledge-base/${id}/reprocess`),
    onSuccess: () => {
      toast.success('Reprocessing started');
      queryClient.invalidateQueries(['knowledge-base']);
    }
  });

  const docs = data?.documents || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-400 mt-1">Manage the content that powers your AI chatbot</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Content
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: docs.length },
          { label: 'Processed', value: docs.filter(d => d.status === 'processed').length },
          { label: 'Processing', value: docs.filter(d => d.status === 'processing' || d.status === 'pending').length },
          { label: 'Failed', value: docs.filter(d => d.status === 'failed').length }
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Documents List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="mx-auto mb-3 text-slate-600" />
            <h3 className="font-medium text-slate-300 mb-1">No documents yet</h3>
            <p className="text-slate-500 text-sm mb-4">Add PDFs, URLs, or text to power your chatbot</p>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              Add Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {docs.map(doc => (
              <div key={doc._id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${typeColors[doc.type] || 'bg-slate-700 text-slate-400'}`}>
                      {doc.type.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      {statusIcon[doc.status]}
                      <span className="capitalize">{doc.status}</span>
                    </div>
                  </div>
                  <p className="font-medium text-slate-200 truncate">{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.description}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.chunksCount > 0 && `${doc.chunksCount} chunks · `}
                    Added {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </p>
                  {doc.processingError && (
                    <p className="text-xs text-red-400 mt-1 truncate">{doc.processingError}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Edit button */}
                  <button
                    onClick={() => setEditDoc(doc)}
                    className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  {doc.status === 'failed' && (
                    <button
                      onClick={() => reprocessMutation.mutate(doc._id)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Reprocess"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this document?')) deleteMutation.mutate(doc._id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <UploadModal onClose={() => setShowModal(false)} />}
      {editDoc && <EditModal doc={editDoc} onClose={() => setEditDoc(null)} />}
    </div>
  );
}
