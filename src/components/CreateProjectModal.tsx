import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { FileText, ScanLine, Upload, X } from 'lucide-react'
import type { Kind, Project } from '../types'
import { NODE_COLORS } from '../types'
import { scanDocument } from '../lib/scan'

type CreateProjectModalProps = {
  onClose: () => void
  onCreate: (project: Project) => void
}

type FormState = {
  kind: Kind
  name: string
  company: string
  niche: string
  value: string
  contactName: string
  email: string
  phone: string
  ideas: string
  summary: string
  delivery: string
}

const EMPTY_FORM: FormState = {
  kind: 'empresarial',
  name: '',
  company: '',
  niche: '',
  value: '',
  contactName: '',
  email: '',
  phone: '',
  ideas: '',
  summary: '',
  delivery: '',
}

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error'

const SCAN_STEPS = ['Leyendo archivo…', 'Extrayendo texto…', 'Analizando entidades…', 'Generando ficha…']

export function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [scanMessage, setScanMessage] = useState('')
  const [docPhaseName, setDocPhaseName] = useState<string | undefined>(undefined)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const runScanSteps = () => {
    setScanStep(0)
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index < SCAN_STEPS.length) setScanStep(index)
      else window.clearInterval(timer)
    }, 380)
    return timer
  }

  const handleFile = async (file: File) => {
    if (scanStatus === 'scanning') return
    setScanStatus('scanning')
    setScanMessage(file.name)
    const stepTimer = runScanSteps()
    const startedAt = performance.now()

    try {
      const draft = await scanDocument(file)
      const elapsed = performance.now() - startedAt
      if (elapsed < 1400) await new Promise((resolve) => window.setTimeout(resolve, 1400 - elapsed))
      window.clearInterval(stepTimer)
      setForm((prev) => ({
        ...prev,
        name: prev.name || draft.name || prev.name,
        company: draft.company ?? prev.company,
        niche: draft.niche ?? prev.niche,
        value: draft.value ?? prev.value,
        contactName: draft.contactName ?? prev.contactName,
        email: draft.email ?? prev.email,
        phone: draft.phone ?? prev.phone,
        summary: draft.summary ?? prev.summary,
        delivery: draft.delivery ?? prev.delivery,
      }))
      setScanStatus('done')
      setScanMessage(`Escaneo completo · ${draft.pages ? `${draft.pages} páginas` : 'documento procesado'}`)
      setDocPhaseName('Revisión de documento escaneado')
    } catch {
      window.clearInterval(stepTimer)
      setScanStatus('error')
      setScanMessage('No se pudo procesar el documento. Completa los campos manualmente.')
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    event.target.value = ''
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    const nowCode = String(Date.now()).slice(-4)
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 1.6

    const project: Project = {
      id: `node-${Date.now()}`,
      kind: form.kind,
      name: form.name.trim(),
      code: form.kind === 'empresarial' ? `NEW-${nowCode}` : `PS-${nowCode}`,
      status: 'Planificacion',
      progress: 0,
      delivery: form.delivery.trim() || 'POR DEFINIR',
      position: [Math.cos(angle) * radius, (Math.random() - 0.4) * 2, (Math.random() - 0.5) * 1.2],
      color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
      summary: form.summary.trim() || 'Ficha recién creada. Agrega contexto para activar el análisis completo.',
      company: form.kind === 'empresarial' ? form.company.trim() || undefined : undefined,
      niche: form.kind === 'empresarial' ? form.niche.trim() || undefined : undefined,
      value: form.kind === 'empresarial' ? form.value.trim() || undefined : undefined,
      contact:
        form.kind === 'empresarial'
          ? { name: form.contactName.trim() || undefined, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined }
          : undefined,
      ideas:
        form.kind === 'personal' && form.ideas.trim()
          ? form.ideas.split(',').map((idea) => idea.trim()).filter(Boolean)
          : undefined,
      phases: [
        { id: `ph-${Date.now()}`, name: docPhaseName ?? 'Lectura documental', owner: 'JARVIS', progress: 5, status: 'Activo', date: 'AHORA' },
      ],
      followUps: [],
    }
    onCreate(project)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-head">
          <div>
            <span className="eyebrow">SPATIAL COMMAND</span>
            <h2>Nuevo nodo de proyecto</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </header>

        <div className="kind-switch" role="tablist">
          <button type="button" className={form.kind === 'empresarial' ? 'active' : ''} onClick={() => set('kind', 'empresarial')}>Empresarial</button>
          <button type="button" className={form.kind === 'personal' ? 'active' : ''} onClick={() => set('kind', 'personal')}>Personal / Estudio</button>
        </div>

        <div
          className={`dropzone ${scanStatus}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
        >
          {scanStatus === 'scanning' ? (
            <div className="scan-live">
              <ScanLine size={22} />
              <strong>{SCAN_STEPS[scanStep]}</strong>
              <small>{scanMessage}</small>
              <div className="scan-bar"><i /></div>
            </div>
          ) : (
            <>
              <Upload size={22} />
              <strong>Arrastra un documento o haz clic</strong>
              <small>Contratos · Proyectos · PDF · Imágenes — se escanea y se crea la bola con su ficha</small>
              {scanStatus === 'done' && <em className="scan-ok">{scanMessage}</em>}
              {scanStatus === 'error' && <em className="scan-err">{scanMessage}</em>}
            </>
          )}
          <input ref={fileInput} type="file" accept=".pdf,.txt,.md,image/*,.doc,.docx" hidden onChange={onPick} />
        </div>

        <div className="form-grid">
          <label className="span-2">
            <span>NOMBRE *</span>
            <input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Ej. Atlas Platform o Mi tesis" required />
          </label>

          {form.kind === 'empresarial' ? (
            <>
              <label><span>EMPRESA</span><input value={form.company} onChange={(event) => set('company', event.target.value)} placeholder="Atlas Labs" /></label>
              <label><span>NICHO</span><input value={form.niche} onChange={(event) => set('niche', event.target.value)} placeholder="SaaS / Comercio…" /></label>
              <label><span>VALOR</span><input value={form.value} onChange={(event) => set('value', event.target.value)} placeholder="$12.500.000" /></label>
              <label><span>FECHA ENTREGA</span><input value={form.delivery} onChange={(event) => set('delivery', event.target.value)} placeholder="18 OCT 2026" /></label>
              <label><span>CONTACTO</span><input value={form.contactName} onChange={(event) => set('contactName', event.target.value)} placeholder="Nombre del contacto" /></label>
              <label><span>CORREO</span><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="contacto@empresa.com" /></label>
              <label className="span-2"><span>TELÉFONO</span><input value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+57 300 000 0000" /></label>
            </>
          ) : (
            <>
              <label><span>FECHA META</span><input value={form.delivery} onChange={(event) => set('delivery', event.target.value)} placeholder="30 NOV 2026" /></label>
              <label className="span-2"><span>IDEAS (separadas por coma)</span><input value={form.ideas} onChange={(event) => set('ideas', event.target.value)} placeholder="Automatizar facturas, Asistente con IA…" /></label>
            </>
          )}

          <label className="span-2">
            <span>RESUMEN</span>
            <textarea rows={3} value={form.summary} onChange={(event) => set('summary', event.target.value)} placeholder="Contexto del proyecto, alcance, acuerdos clave…" />
          </label>
        </div>

        <footer className="modal-foot">
          <span className="doc-hint"><FileText size={13} /> El escaneo autocompleta la ficha cuando detecta datos.</span>
          <div>
            <button type="button" className="control-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="control-button primary" disabled={!form.name.trim()}>Crear nodo</button>
          </div>
        </footer>
      </form>
    </div>
  )
}
