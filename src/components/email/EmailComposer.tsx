'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Paperclip, 
  Image, 
  Calendar, 
  X, 
  Plus,
  Save,
  FileText as Template,
  User,
  Clock,
  AlertCircle,
  FileText,
  Link
} from 'lucide-react'
import { 
  type EmailCompositionData, 
  type EmailAccount,
  type EmailTemplate,
  type Task,
  type Document
} from '../../types'

interface EmailComposerProps {
  accountId?: string
  replyTo?: any // Email being replied to
  replyAll?: boolean
  forward?: any // Email being forwarded
  templateId?: string
  onSend: (emailData: EmailCompositionData) => Promise<void>
  onSaveDraft?: (emailData: EmailCompositionData) => Promise<void>
  onCancel: () => void
  className?: string
}

interface Attachment {
  id: string
  file?: File
  taskId?: string
  documentId?: string
  name: string
  size: number
  type: string
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  accountId,
  replyTo,
  replyAll = false,
  forward,
  templateId,
  onSend,
  onSaveDraft,
  onCancel,
  className = ''
}) => {
  const [emailData, setEmailData] = useState<EmailCompositionData>({
    accountId: accountId || '',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    bodyHtml: '',
    bodyText: '',
    attachments: [],
    taskAttachments: [],
    documentAttachments: [],
    importance: 'normal',
    priority: 'normal'
  })

  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTaskAttachments, setShowTaskAttachments] = useState(false)
  const [showDocumentAttachments, setShowDocumentAttachments] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAccounts()
    loadTemplates()
    initializeEmailData()
  }, [replyTo, forward, templateId])

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/emails/accounts')
      if (response.ok) {
        const accountsData = await response.json()
        setAccounts(accountsData)
        
        // Set default account if not specified
        if (!emailData.accountId && accountsData.length > 0) {
          const defaultAccount = accountsData.find((acc: EmailAccount) => acc.isDefault) || accountsData[0]
          setEmailData(prev => ({ ...prev, accountId: defaultAccount.id }))
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/emails/templates')
      if (response.ok) {
        const templatesData = await response.json()
        setTemplates(templatesData)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const initializeEmailData = () => {
    if (replyTo) {
      // Initialize reply
      const subject = replyTo.subject?.startsWith('Re:') 
        ? replyTo.subject 
        : `Re: ${replyTo.subject || '(No subject)'}`
      
      const to = [replyTo.fromAddress]
      const cc = replyAll ? [...replyTo.ccAddresses, ...replyTo.toAddresses].filter(addr => addr !== replyTo.fromAddress) : []
      
      setEmailData(prev => ({
        ...prev,
        to,
        cc,
        subject,
        bodyHtml: generateReplyBody(replyTo)
      }))
      
      setShowCc(cc.length > 0)
    } else if (forward) {
      // Initialize forward
      const subject = forward.subject?.startsWith('Fwd:') 
        ? forward.subject 
        : `Fwd: ${forward.subject || '(No subject)'}`
      
      setEmailData(prev => ({
        ...prev,
        subject,
        bodyHtml: generateForwardBody(forward)
      }))
    } else if (templateId) {
      // Load template
      loadTemplate(templateId)
    }
  }

  const loadTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/emails/templates/${id}`)
      if (response.ok) {
        const template = await response.json()
        setEmailData(prev => ({
          ...prev,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText
        }))
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    }
  }

  const generateReplyBody = (originalEmail: any): string => {
    const date = new Date(originalEmail.receivedAt).toLocaleString()
    const from = originalEmail.fromName || originalEmail.fromAddress
    
    return `<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
      <p><strong>On ${date}, ${from} wrote:</strong></p>
      ${originalEmail.bodyHtml || `<pre>${originalEmail.bodyText || ''}</pre>`}
    </div>`
  }

  const generateForwardBody = (originalEmail: any): string => {
    const date = new Date(originalEmail.receivedAt).toLocaleString()
    const from = originalEmail.fromName || originalEmail.fromAddress
    
    return `<br><br><div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
      <p><strong>---------- Forwarded message ----------</strong></p>
      <p><strong>From:</strong> ${from}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Subject:</strong> ${originalEmail.subject || '(No subject)'}</p>
      <p><strong>To:</strong> ${originalEmail.toAddresses.join(', ')}</p>
      <br>
      ${originalEmail.bodyHtml || `<pre>${originalEmail.bodyText || ''}</pre>`}
    </div>`
  }

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type
      }
      setAttachments(prev => [...prev, attachment])
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }

  const handleSend = async () => {
    if (!emailData.to.length) {
      alert('Please add at least one recipient')
      return
    }

    if (!emailData.subject.trim()) {
      if (!confirm('Send email without subject?')) {
        return
      }
    }

    try {
      setSending(true)
      
      // Prepare email data with attachments
      const finalEmailData: EmailCompositionData = {
        ...emailData,
        attachments: attachments.filter(att => att.file).map(att => att.file!),
        taskAttachments: attachments.filter(att => att.taskId).map(att => att.taskId!),
        documentAttachments: attachments.filter(att => att.documentId).map(att => att.documentId!),
        scheduledAt
      }

      await onSend(finalEmailData)
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return

    try {
      setSavingDraft(true)
      
      const draftData: EmailCompositionData = {
        ...emailData,
        attachments: attachments.filter(att => att.file).map(att => att.file!),
        taskAttachments: attachments.filter(att => att.taskId).map(att => att.taskId!),
        documentAttachments: attachments.filter(att => att.documentId).map(att => att.documentId!)
      }

      await onSaveDraft(draftData)
    } catch (error) {
      console.error('Failed to save draft:', error)
      alert('Failed to save draft. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  const addRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    if (email.trim() && !emailData[field].includes(email.trim())) {
      setEmailData(prev => ({
        ...prev,
        [field]: [...prev[field], email.trim()]
      }))
    }
  }

  const removeRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    setEmailData(prev => ({
      ...prev,
      [field]: prev[field].filter(addr => addr !== email)
    }))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">
          {replyTo ? 'Reply' : forward ? 'Forward' : 'Compose Email'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {/* Account selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <select
            value={emailData.accountId}
            onChange={(e) => setEmailData(prev => ({ ...prev, accountId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.displayName || account.email} ({account.email})
              </option>
            ))}
          </select>
        </div>

        {/* Recipients */}
        <div className="space-y-3 mb-4">
          {/* To field */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <label className="text-sm font-medium text-gray-700">To</label>
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Bcc
              </button>
            </div>
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px]">
              {emailData.to.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded"
                >
                  {email}
                  <button
                    onClick={() => removeRecipient('to', email)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                placeholder="Add recipients..."
                className="flex-1 min-w-[200px] outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addRecipient('to', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    addRecipient('to', e.target.value)
                    e.target.value = ''
                  }
                }}
              />
            </div>
          </div>

          {/* Cc field */}
          {showCc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cc</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px]">
                {emailData.cc.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded"
                  >
                    {email}
                    <button
                      onClick={() => removeRecipient('cc', email)}
                      className="ml-1 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="Add Cc recipients..."
                  className="flex-1 min-w-[200px] outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addRecipient('cc', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      addRecipient('cc', e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bcc</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px]">
                {emailData.bcc.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded"
                  >
                    {email}
                    <button
                      onClick={() => removeRecipient('bcc', email)}
                      className="ml-1 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="Add Bcc recipients..."
                  className="flex-1 min-w-[200px] outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addRecipient('bcc', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      addRecipient('bcc', e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Subject"
            value={emailData.subject}
            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-50 rounded-md">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-200 rounded"
            title="Attach files"
          >
            <Paperclip size={16} />
          </button>
          
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-2 hover:bg-gray-200 rounded"
            title="Use template"
          >
            <Template size={16} />
          </button>
          
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="p-2 hover:bg-gray-200 rounded"
            title="Schedule send"
          >
            <Clock size={16} />
          </button>

          <div className="border-l border-gray-300 h-6 mx-2"></div>

          <select
            value={emailData.importance}
            onChange={(e) => setEmailData(prev => ({ ...prev, importance: e.target.value }))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="low">Low importance</option>
            <option value="normal">Normal</option>
            <option value="high">High importance</option>
          </select>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium mb-2">Email Templates</h4>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    loadTemplate(template.id)
                    setShowTemplates(false)
                  }}
                  className="p-2 text-left text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-xs text-gray-500 truncate">{template.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule send */}
        {showSchedule && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium mb-2">Schedule Send</h4>
            <input
              type="datetime-local"
              value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        {/* Email body */}
        <div className="mb-4">
          <div
            ref={editorRef}
            contentEditable
            className="w-full min-h-[300px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ outline: 'none' }}
            dangerouslySetInnerHTML={{ __html: emailData.bodyHtml }}
            onInput={(e) => {
              setEmailData(prev => ({
                ...prev,
                bodyHtml: e.currentTarget.innerHTML,
                bodyText: e.currentTarget.textContent || ''
              }))
            }}
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Attachments</h4>
            <div className="space-y-2">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-500" />
                    <span className="text-sm">{attachment.name}</span>
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(attachment.size)})
                    </span>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {onSaveDraft && (
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {savingDraft && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>}
                <Save size={16} />
                <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !emailData.to.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Send size={16} />
              <span>
                {sending ? 'Sending...' : scheduledAt ? 'Schedule' : 'Send'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileAttachment}
      />
    </div>
  )
}